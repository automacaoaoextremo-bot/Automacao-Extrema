import nodemailer from "nodemailer";
import { buildFollowupMessage, FOLLOWUP_LABELS, FollowupKind } from "@/lib/followups";

export type LeadEmailInput = {
  leadName: string | null;
  leadEmail: string | null;
  leadWhatsapp: string | null;
  solutionName: string | null;
  diagnosticScore: number;
  mainArea: string | null;
  mainPain: string | null;
  urgency: string | null;
  ideaDescription: string | null;
};

export type InternalFollowupInfo = {
  id?: string;
  kind: FollowupKind;
  channel: string;
  status?: string;
  scheduled_at: string;
  lead_id?: string;
};

export type InternalDiagnosticEmailInput = LeadEmailInput & {
  leadId: string;
  followups: InternalFollowupInfo[];
};

export type FollowupAlertEmailInput = {
  leadId: string;
  leadName: string | null;
  leadEmail: string | null;
  leadWhatsapp: string | null;
  solutionName: string | null;
  diagnosticScore: number;
  followupId: string;
  followupKind: FollowupKind;
  scheduledAt: string;
};

function isEnabled() {
  return process.env.EMAIL_NOTIFICATIONS_ENABLED !== "false";
}

function firstName(name: string | null) {
  const cleanName = name?.trim();
  if (!cleanName) return "Olá";
  return cleanName.split(/\s+/)[0];
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;
  const copyTo = process.env.EMAIL_COPY_TO || "automacao.ao.extremo@gmail.com";

  if (!host || !user || !pass || !from) {
    return { ok: false as const, reason: "SMTP não configurado.", copyTo };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  return {
    ok: true as const,
    transporter,
    from: `${process.env.EMAIL_FROM_NAME ?? "Automação Extrema"} <${from}>`,
    copyTo,
  };
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://automacao-extrema.vercel.app").replace(/\/$/, "");
}

function normalizeWhatsapp(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function whatsappUrl(whatsapp: string | null, message: string) {
  const phone = normalizeWhatsapp(whatsapp);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export async function sendDiagnosticEmail(input: LeadEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    return { sent: false, reason: config.reason };
  }

  if (!input.leadEmail) {
    return { sent: false, reason: "Lead sem e-mail informado." };
  }

  const solution = input.solutionName ?? "uma solução da Automação Extrema";
  const leadGreeting = firstName(input.leadName);
  const leadLine = leadGreeting === "Olá" ? "Olá," : `${leadGreeting},`;

  await config.transporter.sendMail({
    from: config.from,
    to: input.leadEmail,
    subject: `Diagnóstico AE recebido — solução sugerida: ${solution}`,
    text: `${leadLine}\n\nObrigado por responder o Diagnóstico AE.\n\nPelas suas respostas, a solução da Automação Extrema que mais parece fazer sentido para o seu caso é: ${solution}.\n\nResumo:\n- Área principal: ${input.mainArea ?? "não informado"}\n- Dor principal: ${input.mainPain ?? "não informado"}\n- Urgência: ${input.urgency ?? "não informado"}\n- Score interno do diagnóstico: ${input.diagnosticScore}\n\nDescrição enviada:\n${input.ideaDescription ?? "não informada"}\n\nA Automação Extrema poderá analisar suas respostas e devolver uma sugestão prática de melhoria, automação ou próximo passo.\n\nEste diagnóstico não solicita senha, cartão, dados bancários, pagamento, instalação ou download. O objetivo é ouvir suas dificuldades e sugerir caminhos de melhoria.\n\nAutomação Extrema`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#00334E">
        <h2>Diagnóstico AE recebido</h2>
        <p>${escapeHtml(leadLine)} obrigado por responder o diagnóstico.</p>
        <p>Pelas suas respostas, a solução da Automação Extrema que mais parece fazer sentido para o seu caso é:</p>
        <p style="font-size:20px;font-weight:bold;color:#00334E">${escapeHtml(solution)}</p>
        <h3>Resumo</h3>
        <ul>
          <li><strong>Área principal:</strong> ${escapeHtml(input.mainArea ?? "não informado")}</li>
          <li><strong>Dor principal:</strong> ${escapeHtml(input.mainPain ?? "não informado")}</li>
          <li><strong>Urgência:</strong> ${escapeHtml(input.urgency ?? "não informado")}</li>
          <li><strong>Score interno do diagnóstico:</strong> ${escapeHtml(input.diagnosticScore)}</li>
          <li><strong>WhatsApp:</strong> ${escapeHtml(input.leadWhatsapp ?? "não informado")}</li>
        </ul>
        <p><strong>Descrição enviada:</strong><br/>${escapeHtml(input.ideaDescription ?? "não informada")}</p>
        <p>
          A Automação Extrema poderá analisar suas respostas e devolver uma sugestão prática de melhoria,
          automação ou próximo passo.
        </p>
        <hr/>
        <p style="font-size:13px;color:#335">
          Este diagnóstico não solicita senha, cartão, dados bancários, pagamento, instalação ou download.
          O objetivo é ouvir dificuldades e sugerir caminhos de melhoria.
        </p>
      </div>
    `,
  });

  return { sent: true, reason: "E-mail enviado ao lead." };
}

export async function sendInternalDiagnosticEmail(input: InternalDiagnosticEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    return { sent: false, reason: config.reason };
  }

  const solution = input.solutionName ?? "Solução não definida";
  const baseUrl = siteUrl();
  const leadUrl = `${baseUrl}/admin/ae/leads/${input.leadId}`;
  const funnelUrl = `${baseUrl}/admin/ae/funil`;
  const whatsappFollowups = input.followups.filter((item) => item.channel === "whatsapp");

  const lines = whatsappFollowups.map((item) => {
    const message = buildFollowupMessage(item.kind, input.leadName, solution);
    const link = whatsappUrl(input.leadWhatsapp, message);
    return `- ${FOLLOWUP_LABELS[item.kind] ?? item.kind}: ${formatDate(item.scheduled_at)}${link ? `\n  WhatsApp: ${link}` : ""}`;
  });

  const htmlRows = whatsappFollowups
    .map((item) => {
      const message = buildFollowupMessage(item.kind, input.leadName, solution);
      const link = whatsappUrl(input.leadWhatsapp, message);
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>${escapeHtml(FOLLOWUP_LABELS[item.kind] ?? item.kind)}</strong></td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${escapeHtml(formatDate(item.scheduled_at))}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${link ? `<a href="${escapeHtml(link)}">Abrir WhatsApp</a>` : "WhatsApp não informado"}</td>
        </tr>`;
    })
    .join("");

  await config.transporter.sendMail({
    from: config.from,
    to: config.copyTo,
    subject: `Novo diagnóstico AE — ${input.leadName || "Lead sem nome"} — ${solution}`,
    text: `Novo diagnóstico recebido.\n\nLead: ${input.leadName ?? "Sem nome"}\nE-mail: ${input.leadEmail ?? "não informado"}\nWhatsApp: ${input.leadWhatsapp ?? "não informado"}\nSolução sugerida: ${solution}\nScore: ${input.diagnosticScore}\nÁrea: ${input.mainArea ?? "não informado"}\nDor: ${input.mainPain ?? "não informado"}\nUrgência: ${input.urgency ?? "não informado"}\n\nDescrição:\n${input.ideaDescription ?? "não informada"}\n\nLead na gestão: ${leadUrl}\nFunil: ${funnelUrl}\n\nPrazos das próximas mensagens:\n${lines.join("\n") || "Sem follow-ups de WhatsApp cadastrados."}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#00334E">
        <h2>Novo diagnóstico AE recebido</h2>
        <p><strong>Lead:</strong> ${escapeHtml(input.leadName ?? "Sem nome")}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(input.leadEmail ?? "não informado")}<br/>
        <strong>WhatsApp:</strong> ${escapeHtml(input.leadWhatsapp ?? "não informado")}</p>
        <p><strong>Solução sugerida:</strong> ${escapeHtml(solution)}<br/>
        <strong>Score:</strong> ${escapeHtml(input.diagnosticScore)}</p>
        <p><strong>Área:</strong> ${escapeHtml(input.mainArea ?? "não informado")}<br/>
        <strong>Dor:</strong> ${escapeHtml(input.mainPain ?? "não informado")}<br/>
        <strong>Urgência:</strong> ${escapeHtml(input.urgency ?? "não informado")}</p>
        <p><strong>Descrição:</strong><br/>${escapeHtml(input.ideaDescription ?? "não informada")}</p>
        <p>
          <a href="${escapeHtml(leadUrl)}">Abrir lead na gestão</a> ·
          <a href="${escapeHtml(funnelUrl)}">Abrir funil</a>
        </p>
        <h3>Prazos das próximas mensagens</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <thead>
            <tr>
              <th align="left" style="padding:8px;border-bottom:2px solid #00334E">Etapa</th>
              <th align="left" style="padding:8px;border-bottom:2px solid #00334E">Prazo</th>
              <th align="left" style="padding:8px;border-bottom:2px solid #00334E">Ação</th>
            </tr>
          </thead>
          <tbody>${htmlRows || `<tr><td colspan="3" style="padding:8px">Sem follow-ups de WhatsApp cadastrados.</td></tr>`}</tbody>
        </table>
      </div>
    `,
  });

  return { sent: true, reason: "E-mail interno enviado para AE." };
}

export async function sendFollowupAlertEmail(input: FollowupAlertEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    return { sent: false, reason: config.reason };
  }

  const solution = input.solutionName ?? "Solução não definida";
  const baseUrl = siteUrl();
  const message = buildFollowupMessage(input.followupKind, input.leadName, solution);
  const leadUrl = `${baseUrl}/admin/ae/leads/${input.leadId}`;
  const funnelUrl = `${baseUrl}/admin/ae/funil`;
  const waUrl = whatsappUrl(input.leadWhatsapp, message);

  await config.transporter.sendMail({
    from: config.from,
    to: config.copyTo,
    subject: `Alerta AE: ${FOLLOWUP_LABELS[input.followupKind]} em 15 minutos`,
    text: `Alerta de follow-up AE.\n\nLead: ${input.leadName ?? "Sem nome"}\nE-mail: ${input.leadEmail ?? "não informado"}\nWhatsApp: ${input.leadWhatsapp ?? "não informado"}\nSolução sugerida: ${solution}\nScore: ${input.diagnosticScore}\nPrazo: ${formatDate(input.scheduledAt)}\n\nMensagem pronta:\n${message}\n\nAbrir lead: ${leadUrl}\nAbrir funil: ${funnelUrl}\n${waUrl ? `Abrir WhatsApp: ${waUrl}` : ""}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#00334E">
        <h2>Alerta de follow-up AE</h2>
        <p><strong>${escapeHtml(FOLLOWUP_LABELS[input.followupKind])}</strong> vence em aproximadamente 15 minutos.</p>
        <p><strong>Lead:</strong> ${escapeHtml(input.leadName ?? "Sem nome")}<br/>
        <strong>E-mail:</strong> ${escapeHtml(input.leadEmail ?? "não informado")}<br/>
        <strong>WhatsApp:</strong> ${escapeHtml(input.leadWhatsapp ?? "não informado")}<br/>
        <strong>Solução sugerida:</strong> ${escapeHtml(solution)}<br/>
        <strong>Score:</strong> ${escapeHtml(input.diagnosticScore)}<br/>
        <strong>Prazo:</strong> ${escapeHtml(formatDate(input.scheduledAt))}</p>
        <p><strong>Mensagem pronta:</strong></p>
        <div style="white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px">${escapeHtml(message)}</div>
        <p>
          ${waUrl ? `<a href="${escapeHtml(waUrl)}">Abrir WhatsApp</a> · ` : ""}
          <a href="${escapeHtml(leadUrl)}">Abrir lead</a> ·
          <a href="${escapeHtml(funnelUrl)}">Abrir funil</a>
        </p>
      </div>
    `,
  });

  return { sent: true, reason: "Alerta interno enviado." };
}

export type CorrenteLeadAccessEmailInput = {
  responsibleName: string;
  email: string;
  organizationName: string;
  organizationType: string;
  city: string | null;
  state: string | null;
  loginUrl: string;
  temporaryPassword: string | null;
  trialDays: number;
  isMinimalLead?: boolean;
};

export type CorrenteLeadInternalEmailInput = CorrenteLeadAccessEmailInput & {
  leadId: string;
  whatsapp: string | null;
  contributorsEstimate: number | null;
  observations: string | null;
  accessDueAt: string;
  funilUrl: string;
  source: string;
};

export type CorrenteLeadPendingAlertEmailInput = {
  leadId: string;
  responsibleName: string;
  organizationName: string;
  email: string | null;
  whatsapp: string | null;
  status: string;
  accessDueAt: string | null;
  funilUrl: string;
};

export async function sendCorrenteLeadAccessEmail(input: CorrenteLeadAccessEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    return { sent: false, reason: config.reason };
  }

  const baseUrl = siteUrl();
  const logoUrl = `${baseUrl}/corrente-em-dia-logo.svg`;
  const greeting = firstName(input.responsibleName);
  const location = [input.city, input.state].filter(Boolean).join("/");
  const organizationLine = input.isMinimalLead
    ? "Os dados completos da organização serão confirmados no primeiro acesso."
    : `Organização: ${input.organizationName}\nTipo: ${input.organizationType}${location ? `\nCidade/UF: ${location}` : ""}`;
  const passwordBlock = input.temporaryPassword
    ? `\nE-mail: ${input.email}\nSenha temporária: ${input.temporaryPassword}\n\nPor segurança, recomendamos trocar a senha no primeiro acesso.`
    : `\nE-mail: ${input.email}\n\nCaso você já tenha senha, use sua senha atual. Se não lembrar, clique em "Esqueci minha senha" na tela de login.`;

  await config.transporter.sendMail({
    from: config.from,
    to: input.email,
    subject: `Acesso liberado — Corrente em Dia Cliente Fundador`,
    text: `${greeting},\n\nRecebemos seu interesse no Corrente em Dia como Cliente Fundador.\n\nA partir de agora, você já pode acessar o painel inicial para começar a configuração da organização e avaliar a solução por ${input.trialDays} dias.\n\nO Corrente em Dia foi criado para ajudar a tirar contribuições, comprovantes e pendências da memória, do grupo de WhatsApp e dos controles soltos, trazendo mais clareza, previsibilidade e tranquilidade para quem cuida da casa.\n\n${organizationLine}\nAcesso: ${input.loginUrl}${passwordBlock}\n\nComo Cliente Fundador, sua organização participa da fase inicial com condições especiais, acompanhamento mais próximo e prioridade nas melhorias que realmente fazem diferença para a rotina da casa.\n\nAutomação Extrema\nCorrente em Dia`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#00334E;max-width:720px;margin:0 auto">
        <div style="padding:18px 0;text-align:left">
          <img src="${escapeHtml(logoUrl)}" alt="Corrente em Dia" width="84" height="84" style="border-radius:22px;display:block;margin-bottom:12px" />
          <h2 style="margin:0;color:#00334E;font-size:24px">Acesso liberado ao Corrente em Dia</h2>
        </div>
        <p>${escapeHtml(greeting)}, recebemos seu interesse no <strong>Corrente em Dia</strong> como Cliente Fundador.</p>
        <p>A partir de agora, você já pode acessar o painel inicial para começar a configuração da organização e avaliar a solução por <strong>${escapeHtml(input.trialDays)} dias</strong>.</p>
        <p>O Corrente em Dia foi criado para ajudar a tirar contribuições, comprovantes e pendências da memória, do grupo de WhatsApp e dos controles soltos, trazendo mais clareza, previsibilidade e tranquilidade para quem cuida da casa.</p>
        <div style="background:#ecfdf5;border-radius:16px;padding:16px;margin:16px 0">
          ${input.isMinimalLead ? `<p><strong>Primeiro passo:</strong> os dados completos da organização serão confirmados no primeiro acesso.</p>` : `<p><strong>Organização:</strong> ${escapeHtml(input.organizationName)}<br/><strong>Tipo:</strong> ${escapeHtml(input.organizationType)}${location ? `<br/><strong>Cidade/UF:</strong> ${escapeHtml(location)}` : ""}</p>`}
          <p><strong>Acesso:</strong> <a href="${escapeHtml(input.loginUrl)}">${escapeHtml(input.loginUrl)}</a></p>
          <p><strong>E-mail:</strong> ${escapeHtml(input.email)}${input.temporaryPassword ? `<br/><strong>Senha temporária:</strong> ${escapeHtml(input.temporaryPassword)}` : ""}</p>
          <p style="font-size:13px;color:#335">${input.temporaryPassword ? "Por segurança, recomendamos trocar a senha no primeiro acesso." : "Caso você já tenha senha, use sua senha atual. Se não lembrar, clique em Esqueci minha senha na tela de login."}</p>
        </div>
        <p><strong>Cliente Fundador:</strong> sua organização participa da fase inicial com condições especiais, acompanhamento mais próximo e prioridade nas melhorias que realmente fazem diferença para a rotina da casa.</p>
        <p style="font-size:13px;color:#475569">Ao acessar o painel, confirme os dados da organização, as autorizações de LGPD e a condição de Cliente Fundador para iniciar a avaliação de 30 dias.</p>
        <p>Automação Extrema<br/>Corrente em Dia</p>
      </div>
    `,
  });

  return { sent: true, reason: "E-mail de acesso enviado." };
}

export async function sendCorrenteLeadInternalEmail(input: CorrenteLeadInternalEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    return { sent: false, reason: config.reason };
  }

  const internalMessage = `Novo lead Corrente em Dia - Cliente Fundador\n\nTipo: ${input.organizationType}\nOrganização: ${input.organizationName}\nResponsável: ${input.responsibleName}\nCidade/UF: ${[input.city, input.state].filter(Boolean).join("/") || "não informado"}\nWhatsApp: ${input.whatsapp ?? "não informado"}\nE-mail: ${input.email}\nContribuintes estimados: ${input.contributorsEstimate ?? "não informado"}\n\nObservações:\n${input.observations ?? "não informado"}\n\nAcesso: ${input.loginUrl}\nPrazo de acompanhamento: confirmar primeiro acesso e configuração inicial.\nFunil: ${input.funilUrl}`;
  const waUrl = whatsappUrl(process.env.AE_INTERNAL_WHATSAPP || "19992360856", internalMessage);

  await config.transporter.sendMail({
    from: config.from,
    to: config.copyTo,
    subject: `Novo lead Corrente em Dia — ${input.organizationName}`,
    text: `${internalMessage}\n\nWhatsApp interno: ${waUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#00334E">
        <h2>Novo lead Corrente em Dia</h2>
        <p><strong>Tipo:</strong> ${escapeHtml(input.organizationType)}<br/>
        <strong>Organização:</strong> ${escapeHtml(input.organizationName)}<br/>
        <strong>Responsável:</strong> ${escapeHtml(input.responsibleName)}<br/>
        <strong>Cidade/UF:</strong> ${escapeHtml([input.city, input.state].filter(Boolean).join("/") || "não informado")}<br/>
        <strong>WhatsApp:</strong> ${escapeHtml(input.whatsapp ?? "não informado")}<br/>
        <strong>E-mail:</strong> ${escapeHtml(input.email)}<br/>
        <strong>Contribuintes estimados:</strong> ${escapeHtml(input.contributorsEstimate ?? "não informado")}</p>
        <p><strong>Observações:</strong><br/>${escapeHtml(input.observations ?? "não informado")}</p>
        <p><strong>Status:</strong> acesso inicial preparado e e-mail de acesso tentado automaticamente.</p>
        <p><a href="${escapeHtml(input.funilUrl)}">Abrir funil Corrente em Dia</a>${waUrl ? ` · <a href="${escapeHtml(waUrl)}">Avisar no WhatsApp do Márcio</a>` : ""}</p>
      </div>
    `,
  });

  return { sent: true, reason: "E-mail interno enviado." };
}

export async function sendCorrenteLeadPendingAlertEmail(input: CorrenteLeadPendingAlertEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    return { sent: false, reason: config.reason };
  }

  await config.transporter.sendMail({
    from: config.from,
    to: config.copyTo,
    subject: `Alerta Corrente em Dia — verificar acesso de ${input.organizationName}`,
    text: `Verificar lead Corrente em Dia.\n\nOrganização: ${input.organizationName}\nResponsável: ${input.responsibleName}\nE-mail: ${input.email ?? "não informado"}\nWhatsApp: ${input.whatsapp ?? "não informado"}\nStatus: ${input.status}\nPrazo de acesso: ${input.accessDueAt ? formatDate(input.accessDueAt) : "não informado"}\nFunil: ${input.funilUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#00334E">
        <h2>Alerta Corrente em Dia</h2>
        <p>Verifique se o acesso e o primeiro contato foram concluídos.</p>
        <p><strong>Organização:</strong> ${escapeHtml(input.organizationName)}<br/>
        <strong>Responsável:</strong> ${escapeHtml(input.responsibleName)}<br/>
        <strong>E-mail:</strong> ${escapeHtml(input.email ?? "não informado")}<br/>
        <strong>WhatsApp:</strong> ${escapeHtml(input.whatsapp ?? "não informado")}<br/>
        <strong>Status:</strong> ${escapeHtml(input.status)}<br/>
        <strong>Prazo de acesso:</strong> ${escapeHtml(input.accessDueAt ? formatDate(input.accessDueAt) : "não informado")}</p>
        <p><a href="${escapeHtml(input.funilUrl)}">Abrir funil Corrente em Dia</a></p>
      </div>
    `,
  });

  return { sent: true, reason: "Alerta interno enviado." };
}

export type PresencaLeadAccessEmailInput = {
  responsibleName: string;
  email: string;
  eventName: string;
  eventType: string;
  city: string;
  state: string;
  loginUrl: string;
  temporaryPassword: string | null;
  trialDays: number;
  isMinimalLead: boolean;
};

export type PresencaLeadInternalEmailInput = {
  leadId: string;
  responsibleName: string;
  email: string;
  whatsapp: string;
  eventName: string;
  eventType: string;
  city: string;
  state: string;
  guestsEstimate: number | null;
  eventDate: string | null;
  eventContext: string;
  observations: string;
  loginUrl: string;
  temporaryPassword: string | null;
  trialDays: number;
  accessDueAt: string;
  funilUrl: string;
  source: string;
};

export type PresencaLeadPendingAlertEmailInput = {
  leadId: string;
  responsibleName: string;
  eventName: string;
  email: string | null;
  whatsapp: string | null;
  status: string;
  accessDueAt: string | null;
  funilUrl: string;
};

export async function sendPresencaLeadAccessEmail(input: PresencaLeadAccessEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    return { sent: false, reason: config.reason };
  }

  const baseUrl = siteUrl();
  const logoUrl = `${baseUrl}/presenca-querida-logo.svg`;
  const greeting = firstName(input.responsibleName);
  const location = [input.city, input.state].filter(Boolean).join("/");
  const eventLine = input.isMinimalLead
    ? "Os dados completos do evento serão confirmados no primeiro acesso."
    : `Evento: ${input.eventName}\nTipo: ${input.eventType}${location ? `\nCidade/UF: ${location}` : ""}`;
  const passwordBlock = input.temporaryPassword
    ? `\nE-mail: ${input.email}\nSenha temporária: ${input.temporaryPassword}\n\nPor segurança, recomendamos trocar a senha no primeiro acesso.`
    : `\nE-mail: ${input.email}\n\nCaso você já tenha senha, use sua senha atual. Se não lembrar, clique em "Esqueci minha senha" na tela de login.`;

  await config.transporter.sendMail({
    from: config.from,
    to: input.email,
    subject: "Acesso liberado — Presença Querida Cliente Fundador",
    text: `${greeting},\n\nRecebemos seu interesse no Presença Querida como Cliente Fundador.\n\nA partir de agora, você já pode acessar o painel inicial para começar a configuração do evento e avaliar a solução por ${input.trialDays} dias.\n\nO Presença Querida foi criado para ajudar famílias e pequenos organizadores a convidar, lembrar e confirmar presenças importantes sem transformar o WhatsApp em bagunça ou a confirmação em cobrança constrangedora.\n\n${eventLine}\nAcesso: ${input.loginUrl}${passwordBlock}\n\nComo Cliente Fundador, seu evento participa da fase inicial com condições especiais, acompanhamento mais próximo e prioridade nas melhorias que realmente fazem diferença na organização dos convidados.\n\nAutomação Extrema\nPresença Querida`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#00334E;max-width:720px;margin:0 auto">
        <div style="padding:18px 0;text-align:left">
          <img src="${escapeHtml(logoUrl)}" alt="Presença Querida" width="84" height="84" style="border-radius:22px;display:block;margin-bottom:12px" />
          <h2 style="margin:0;color:#00334E;font-size:24px">Acesso liberado ao Presença Querida</h2>
        </div>
        <p>${escapeHtml(greeting)}, recebemos seu interesse no <strong>Presença Querida</strong> como Cliente Fundador.</p>
        <p>A partir de agora, você já pode acessar o painel inicial para começar a configuração do evento e avaliar a solução por <strong>${escapeHtml(input.trialDays)} dias</strong>.</p>
        <p>O Presença Querida foi criado para ajudar famílias e pequenos organizadores a convidar, lembrar e confirmar presenças importantes sem transformar o WhatsApp em bagunça ou a confirmação em cobrança constrangedora.</p>
        <div style="background:#fff1f2;border-radius:16px;padding:16px;margin:16px 0">
          ${input.isMinimalLead ? `<p><strong>Primeiro passo:</strong> os dados completos do evento serão confirmados no primeiro acesso.</p>` : `<p><strong>Evento:</strong> ${escapeHtml(input.eventName)}<br/><strong>Tipo:</strong> ${escapeHtml(input.eventType)}${location ? `<br/><strong>Cidade/UF:</strong> ${escapeHtml(location)}` : ""}</p>`}
          <p><strong>Acesso:</strong> <a href="${escapeHtml(input.loginUrl)}">${escapeHtml(input.loginUrl)}</a></p>
          <p><strong>E-mail:</strong> ${escapeHtml(input.email)}${input.temporaryPassword ? `<br/><strong>Senha temporária:</strong> ${escapeHtml(input.temporaryPassword)}` : ""}</p>
          <p style="font-size:13px;color:#335">${input.temporaryPassword ? "Por segurança, recomendamos trocar a senha no primeiro acesso." : "Caso você já tenha senha, use sua senha atual. Se não lembrar, clique em Esqueci minha senha na tela de login."}</p>
        </div>
        <p><strong>Cliente Fundador:</strong> seu evento participa da fase inicial com condições especiais, acompanhamento mais próximo e prioridade nas melhorias que realmente fazem diferença na organização dos convidados.</p>
        <p style="font-size:13px;color:#475569">Ao acessar o painel, confirme os dados do evento, as autorizações de LGPD e a condição de Cliente Fundador para iniciar a avaliação.</p>
        <p>Automação Extrema<br/>Presença Querida</p>
      </div>
    `,
  });

  return { sent: true, reason: "E-mail de acesso enviado." };
}

export async function sendPresencaLeadInternalEmail(input: PresencaLeadInternalEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    return { sent: false, reason: config.reason };
  }

  const internalMessage = `Novo lead Presença Querida - Cliente Fundador\n\nTipo: ${input.eventType}\nEvento: ${input.eventName}\nResponsável: ${input.responsibleName}\nCidade/UF: ${[input.city, input.state].filter(Boolean).join("/") || "não informado"}\nWhatsApp: ${input.whatsapp ?? "não informado"}\nE-mail: ${input.email}\nConvidados estimados: ${input.guestsEstimate ?? "não informado"}\nData do evento: ${input.eventDate ?? "não informada"}\n\nContexto:\n${input.eventContext || "não informado"}\n\nObservações:\n${input.observations || "não informado"}\n\nAcesso: ${input.loginUrl}\nPrazo de acompanhamento: confirmar primeiro acesso e configuração inicial.\nFunil: ${input.funilUrl}`;
  const waUrl = whatsappUrl(process.env.AE_INTERNAL_WHATSAPP || "19992360856", internalMessage);

  await config.transporter.sendMail({
    from: config.from,
    to: config.copyTo,
    subject: `Novo lead Presença Querida — ${input.eventName}`,
    text: `${internalMessage}\n\nWhatsApp interno: ${waUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#00334E">
        <h2>Novo lead Presença Querida</h2>
        <p><strong>Tipo:</strong> ${escapeHtml(input.eventType)}<br/>
        <strong>Evento:</strong> ${escapeHtml(input.eventName)}<br/>
        <strong>Responsável:</strong> ${escapeHtml(input.responsibleName)}<br/>
        <strong>Cidade/UF:</strong> ${escapeHtml([input.city, input.state].filter(Boolean).join("/") || "não informado")}<br/>
        <strong>WhatsApp:</strong> ${escapeHtml(input.whatsapp ?? "não informado")}<br/>
        <strong>E-mail:</strong> ${escapeHtml(input.email)}<br/>
        <strong>Convidados estimados:</strong> ${escapeHtml(input.guestsEstimate ?? "não informado")}<br/>
        <strong>Data do evento:</strong> ${escapeHtml(input.eventDate ?? "não informada")}</p>
        <p><strong>Contexto:</strong><br/>${escapeHtml(input.eventContext || "não informado")}</p>
        <p><strong>Observações:</strong><br/>${escapeHtml(input.observations || "não informado")}</p>
        <p><strong>Status:</strong> acesso inicial preparado e e-mail de acesso tentado automaticamente.</p>
        <p><a href="${escapeHtml(input.funilUrl)}">Abrir funil Presença Querida</a>${waUrl ? ` · <a href="${escapeHtml(waUrl)}">Avisar no WhatsApp interno</a>` : ""}</p>
      </div>
    `,
  });

  return { sent: true, reason: "E-mail interno enviado." };
}

export async function sendPresencaLeadPendingAlertEmail(input: PresencaLeadPendingAlertEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const config = getMailConfig();
  if (!config.ok) {
    return { sent: false, reason: config.reason };
  }

  await config.transporter.sendMail({
    from: config.from,
    to: config.copyTo,
    subject: `Alerta Presença Querida — verificar acesso de ${input.eventName}`,
    text: `Verificar lead Presença Querida.\n\nEvento: ${input.eventName}\nResponsável: ${input.responsibleName}\nE-mail: ${input.email ?? "não informado"}\nWhatsApp: ${input.whatsapp ?? "não informado"}\nStatus: ${input.status}\nPrazo de acesso: ${input.accessDueAt ? formatDate(input.accessDueAt) : "não informado"}\nFunil: ${input.funilUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#00334E">
        <h2>Alerta Presença Querida</h2>
        <p>Verifique se o acesso e o primeiro contato foram concluídos.</p>
        <p><strong>Evento:</strong> ${escapeHtml(input.eventName)}<br/>
        <strong>Responsável:</strong> ${escapeHtml(input.responsibleName)}<br/>
        <strong>E-mail:</strong> ${escapeHtml(input.email ?? "não informado")}<br/>
        <strong>WhatsApp:</strong> ${escapeHtml(input.whatsapp ?? "não informado")}<br/>
        <strong>Status:</strong> ${escapeHtml(input.status)}<br/>
        <strong>Prazo de acesso:</strong> ${escapeHtml(input.accessDueAt ? formatDate(input.accessDueAt) : "não informado")}</p>
        <p><a href="${escapeHtml(input.funilUrl)}">Abrir funil Presença Querida</a></p>
      </div>
    `,
  });

  return { sent: true, reason: "Alerta interno enviado." };
}

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

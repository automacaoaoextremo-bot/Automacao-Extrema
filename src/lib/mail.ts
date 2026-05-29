import nodemailer from "nodemailer";

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

export async function sendDiagnosticEmail(input: LeadEmailInput) {
  if (!isEnabled()) {
    return { sent: false, reason: "EMAIL_NOTIFICATIONS_ENABLED=false" };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;
  const copyTo = process.env.EMAIL_COPY_TO || "automacao.ao.extremo@gmail.com";

  if (!host || !user || !pass || !from) {
    return { sent: false, reason: "SMTP não configurado." };
  }

  const toList = [input.leadEmail, copyTo].filter(Boolean) as string[];

  if (toList.length === 0) {
    return { sent: false, reason: "Nenhum destinatário informado." };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  const solution = input.solutionName ?? "uma solução da Automação Extrema";
  const leadGreeting = firstName(input.leadName);
  const leadLine = leadGreeting === "Olá" ? "Olá," : `${leadGreeting},`;

  await transporter.sendMail({
    from: `${process.env.EMAIL_FROM_NAME ?? "Automação Extrema"} <${from}>`,
    to: input.leadEmail || copyTo,
    cc: input.leadEmail ? copyTo : undefined,
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

  return { sent: true, reason: "E-mail enviado." };
}

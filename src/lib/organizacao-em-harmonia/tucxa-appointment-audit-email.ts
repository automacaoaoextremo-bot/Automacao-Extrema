import nodemailer from "nodemailer";

const TO = "automacao.ao.extremo@gmail.com";
function smtpConfig(){const host=process.env.SMTP_HOST;const user=process.env.SMTP_USER;const pass=process.env.SMTP_PASS;if(!host||!user||!pass)return null;return {host,port:Number(process.env.SMTP_PORT||587),secure:String(process.env.SMTP_SECURE||"").toLowerCase()==="true",auth:{user,pass},from:process.env.EMAIL_FROM||user};}
export async function sendTucxaAppointmentAuditEmail(input:{event:string;consulenteName?:string;appointmentDate?:string;entityName?:string;details?:string}){
 const cfg=smtpConfig(); if(!cfg){console.warn("[TUCXA auditoria e-mail] SMTP não configurado",input.event);return false;}
 try{const transporter=nodemailer.createTransport({host:cfg.host,port:cfg.port,secure:cfg.secure,auth:cfg.auth});await transporter.sendMail({from:cfg.from,to:TO,subject:`[TUCXA] ${input.event}`,text:[`Evento: ${input.event}`,input.consulenteName?`Consulente: ${input.consulenteName}`:"",input.appointmentDate?`Data: ${input.appointmentDate}`:"",input.entityName?`Entidade: ${input.entityName}`:"",input.details||""].filter(Boolean).join("\n")});return true;}catch(error){console.error("[TUCXA auditoria e-mail]",error);return false;}
}

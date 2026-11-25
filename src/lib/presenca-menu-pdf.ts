import "server-only";
import QRCode from "qrcode";
import type { PresencaMenuSection } from "@/lib/presenca-daniela50";
const W=419.53,H=595.28; // A5 (148 x 210 mm)
const navy="0.00 0.20 0.31",rose="0.60 0.22 0.34",ink="0.23 0.21 0.20";
function hex(s:string){return Array.from(s.normalize("NFC")).map(c=>{const cp=c.codePointAt(0)||63;return (cp<=255?cp:(({ '–':150,'—':151,'•':149,'’':146,'“':147,'”':148 } as Record<string,number>)[c]??63)).toString(16).padStart(2,"0");}).join("");}
function text(s:string,x:number,y:number,size:number,bold=false,color=ink){return `${color} rg BT /${bold?"F2":"F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm <${hex(s)}> Tj ET\n`;}
function wrap(s:string,max:number){const lines:string[]=[];let row="";for(const word of s.split(/\s+/)){if(word.length>max)throw new Error("Texto longo demais para A5.");if(row&&(row+" "+word).length>max){lines.push(row);row=word;}else row+=(row?" ":"")+word;}if(row)lines.push(row);return lines;}
function frame(){return `0.996 0.974 0.949 rg 0 0 ${W} ${H} re f\n0.87 0.74 0.70 RG 0.8 w 16 16 ${W-32} ${H-32} re S\n${rose} RG 1 w 32 493 m ${W-32} 493 l S\n`;}
// PDF vetorial com QR de alto contraste e margem silenciosa de quatro módulos.
export function buildPresencaMenuPdf(input:{name:string;date:string;sections:PresencaMenuSection[];uploadUrl:string;preview?:boolean;demo?:boolean;hostName?:string}):Buffer{
  const {name,date,sections,uploadUrl,preview,demo,hostName}=input;
  if(!sections.length)throw new Error("Cadastre o cardápio antes de gerar o PDF.");
  if(name.length>44)throw new Error("Nome do evento longo demais para este modelo A5.");
  const header=frame()+text(demo?"AMOSTRA — QR DE TESTE SEM ACESSO":preview?"PRÉVIA DE HOMOLOGAÇÃO":"PRESENÇA QUERIDA",32,550,10,true,rose)+text(name,32,520,19,true,navy)+text(date,32,501,10,false,rose);
  let front=header+text("Cardápio",32,467,24,true,navy);let y=442;
  for(const section of sections){for(const line of wrap(section.title,46)){front+=text(line,32,y,12,true,rose);y-=15;}for(const line of wrap(section.items.join("  •  "),54)){front+=text(line,32,y,10.5,false,ink);y-=14;}y-=14;}
  if(y<70)throw new Error("Cardápio excede a área A5. Revise os itens.");
  front+=text("Preparado com carinho para você.",32,52,11,false,rose)+text("Automação Extrema  |  Presença Querida",32,32,8,false,navy);
  let back=header+text("Uma festa. Muitos olhares.",32,462,22,true,navy)+text("Infinitas lembranças.",32,436,22,true,navy);
  back+=text("Hoje quero viver cada abraço, cada sorriso",32,407,12,false)+text("e cada reencontro.",32,391,12,false)+text("Mas sei que não conseguirei registrar todos",32,370,12,false)+text("esses momentos.",32,354,12,false)+text("Que tal me ajudar a guardar essa história",32,331,12,true,rose)+text("através do seu olhar?",32,315,12,true,rose);
  const qr=QRCode.create(uploadUrl,{errorCorrectionLevel:"M"});const n=qr.modules.size;const total=184;const side=total/(n+8);const left=(W-total)/2;const bottom=112;
  back+=`1 1 1 rg ${left} ${bottom} ${total} ${total} re f\n0 0 0 rg\n`;
  for(let row=0;row<n;row++)for(let col=0;col<n;col++)if(qr.modules.get(row,col))back+=`${(left+(col+4)*side).toFixed(5)} ${(bottom+(n-row+3)*side).toFixed(5)} ${side.toFixed(5)} ${side.toFixed(5)} re\n`;
  back+="f\n";back+=text("Aponte a câmera e compartilhe suas fotos!",32,96,12,true,navy)+text("Sem instalar aplicativos. Sem criar conta.",32,78,11,false)+text(`Com carinho, ${hostName?.slice(0,35)||"a organização"}.`,32,52,11,false,rose)+text("Automação Extrema  |  Presença Querida",32,32,8,false,navy);
  const objects:string[]=["", "<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [5 0 R 7 0 R] /Count 2 >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
  for(const content of [front,back]){const ref=objects.length+1;objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${ref} 0 R >>`);objects.push(`<< /Length ${Buffer.byteLength(content,"ascii")} >>\nstream\n${content}endstream`);}
  let doc="%PDF-1.4\n";const offsets=[0];for(let i=1;i<objects.length;i++){offsets.push(Buffer.byteLength(doc,"ascii"));doc+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
  const xref=Buffer.byteLength(doc,"ascii");doc+=`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(o=>`${String(o).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(doc,"ascii");
}

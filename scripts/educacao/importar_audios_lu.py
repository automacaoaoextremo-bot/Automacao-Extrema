# Executar APENAS após confirmação documentada da escola para armazenar vozes infantis na nuvem.
# python scripts/educacao/importar_audios_lu.py --zip "C:\...\Lu(1).zip" --env ".env.local" --autorizacao-confirmada
# Não imprime chaves; não envia arquivos ao GitHub ou Vercel.
import argparse, json, mimetypes, os, sys, unicodedata, urllib.request, urllib.error, uuid, zipfile
from pathlib import Path

def read_env(path):
 result={}
 for line in Path(path).read_text(encoding='utf-8-sig').splitlines():
  line=line.strip()
  if not line or line.startswith('#') or '=' not in line: continue
  k,v=line.split('=',1);result[k.strip()]=v.strip().strip('"').strip("'")
 return result

def http(url,method,headers,payload=None):
 req=urllib.request.Request(url,data=payload,headers=headers,method=method)
 try:
  with urllib.request.urlopen(req,timeout=45) as response:
   raw=response.read(); return json.loads(raw.decode()) if raw else None
 except urllib.error.HTTPError as e:
  detail=e.read().decode('utf-8','replace')[:400]
  raise RuntimeError(f'HTTP {e.code}: {detail}') from None

# Lista revisada pelos nomes recebidos. A Lu deve conferir as equivalências ANTES de importar.
TRACK_NAMES={
 '01':('Borboleta Eufridia','Eufridia'),
 '02':('Borboletinha','Borboletinha'),
 '03':('Casa engracada','Era uma casa'),
 '04':('Cowboy Joao','Joao feijao'),
 '05':('Fifi','Fifi'),
 '06':('O pato e a pata','Pato e a pata'),
 '07':('Olele','Olele'),
 '08':('Para cantar bem','Para cantar bem'),
 '09':('Pato pateta','La vem o Pato'),
 '10':('Peixe vivo','Como pode um peixe viv'),
 '11':('Ratinho e o relogio','Tique tique tita'),
 '12':('Yapo','Iapo'),
}
def norm(x):
 x=unicodedata.normalize('NFKD',x)
 return ''.join(c for c in x if not unicodedata.combining(c)).casefold().strip()

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--zip',required=True);parser.add_argument('--env',default='.env.local')
 parser.add_argument('--autorizacao-confirmada',action='store_true')
 parser.add_argument('--executar',action='store_true',help='Sem esta flag apenas confere os 24 arquivos, sem upload')
 args=parser.parse_args()
 with zipfile.ZipFile(args.zip) as z:
  files=[n for n in z.namelist() if not n.endswith('/')]
  selected=[]
  for track,(a,b) in TRACK_NAMES.items():
   for source,name in [('celular',a),('whatsapp',b)]:
    match=[n for n in files if ('GravadorCelularAudio/' if source=='celular' else 'GravadorCelularWhatsapp/') in n and norm(Path(n).name).startswith(norm(name))]
    if len(match)!=1: raise RuntimeError(f'Mapeamento não único: música {track} / {source}: {match}')
    selected.append((track,source,match[0])); print(f'{track} {source:8} {Path(match[0]).name} ({z.getinfo(match[0]).file_size} bytes)')
  if not args.executar:
   print('\nPré-verificação concluída. Nenhum arquivo foi enviado. Após conferir e receber autorizações, adicione --executar --autorizacao-confirmada.');return
  if not args.autorizacao_confirmada: raise RuntimeError('Bloqueado: forneça --autorizacao-confirmada APÓS autorizações da escola.')
  env=read_env(args.env);url=env.get('NEXT_PUBLIC_SUPABASE_URL','').rstrip('/');key=env.get('SUPABASE_SERVICE_ROLE_KEY','')
  if not url.startswith('https://') or not key: raise RuntimeError('Supabase não configurado no env local.')
  headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'}
  project=http(url+'/rest/v1/ae_education_projects?slug=eq.lu-2026&select=media_authorized','GET',headers)
  if not project or not project[0]['media_authorized']: raise RuntimeError('Projeto sem media_authorized=true no Supabase. Importação bloqueada.')
  old=http(url+'/rest/v1/ae_education_audio_versions?project_slug=eq.lu-2026&select=track_id,source_type,status','GET',headers)
  for track,source,path in selected:
   if any(x['track_id']==track and x['source_type']==source  for x in old):
    print(f'IGNORADO: {track} {source} - já existe');continue
   raw=z.read(path);id=str(uuid.uuid4());ext='ogg' if source=='whatsapp' else 'm4a';content_type='audio/ogg' if ext=='ogg' else 'audio/mp4'
   storage_path=f'projects/lu-2026/songs/{track}/{id}.{ext}'
   storage_headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':content_type,'x-upsert':'false'}
   upload_url=f'{url}/storage/v1/object/education-media-private/{storage_path}'
   http(upload_url,'POST',storage_headers,raw)
   body=json.dumps({'id':id,'project_slug':'lu-2026','track_id':track,'source_type':source,'original_filename':Path(path).name,'storage_path':storage_path,'mime_type':content_type,'file_bytes':len(raw),'status':'available'}).encode()
   http(url+'/rest/v1/ae_education_audio_versions','POST',{**headers,'Prefer':'return=minimal'},body)
   print(f'Enviado: {track} {source}')
 print('Importação concluída. Versões ainda NÃO selecionadas e NÃO liberadas às famílias.')
if __name__=='__main__':main()

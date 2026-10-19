#!/usr/bin/env python3
"""Prepara pacote SQL sem conectar-se ao banco. Execução padrão: auditoria (somente leitura)."""
import argparse, json, re, sys, pathlib, collections, datetime
SOURCE='tzyyrabjqtvjzxossyuk'
REAL={'2bc80233-73f1-4ad4-b789-b9249d472ea4':'sementinha','e7cc5ba7-8500-441f-ab3b-327ec1732e9b':'tucxa'}
TEST='8ab60e8d-57e5-4019-9cd8-52be78a48612'
TABLES={'event_days','rounds','draw_events','round_awards','winner_claims','winners','prizes'}
EXPECTED={'event_days':2,'rounds':26,'draw_events':1046,'round_awards':53,'winner_claims':60,'winners':47}
HEAD=re.compile(r'^COPY "public"\."([^"]+)" \((.+)\) FROM stdin;$')

def deescape(t):
    if t=='\\N':return None
    def sub(m):
        c=m.group(1)
        if c=='t':return '\t'
        if c=='n':return '\n'
        if c=='r':return '\r'
        if c=='b':return '\b'
        if c=='f':return '\f'
        if c=='v':return '\v'
        if c=='\\':return '\\'
        if c.startswith('x'):return chr(int(c[1:],16))
        if c.isdigit():return chr(int(c,8))
        return c
    return re.sub(r'\\(x[0-9a-fA-F]{1,2}|[0-7]{1,3}|.)',sub,t)

def load(path):
    result=collections.defaultdict(list); table=None; columns=[]
    with path.open('r',encoding='utf-8') as f:
      for line in f:
        line=line.rstrip('\r\n')
        if table is None:
          m=HEAD.match(line)
          if m and m.group(1) in TABLES:
            table=m.group(1);columns=re.findall(r'"([^"]+)"',m.group(2))
          continue
        if line=='\\.':table=None;columns=[];continue
        values=line.split('\t')
        if len(values)!=len(columns):raise ValueError(f'{table}: {len(values)} valores != {len(columns)} colunas')
        result[table].append(dict(zip(columns,(deescape(v) for v in values))))
    return result

def select(d):
    events=[x for x in d['event_days'] if x['id'] in REAL]
    if len(events)!=2:raise ValueError('Eventos reais não encontrados exatamente: abortando')
    rounds=[x for x in d['rounds'] if x['event_day_id'] in REAL]
    rids={x['id'] for x in rounds}
    selected={'event_days':events,'rounds':rounds}
    for t in ['draw_events','round_awards','winner_claims','winners']:
      selected[t]=[x for x in d[t] if x['round_id'] in rids]
    pids={x['prize_id'] for x in selected['round_awards']+selected['winners'] if x.get('prize_id')}
    selected['prizes']=[x for x in d['prizes'] if x['id'] in pids]
    for t,expected in EXPECTED.items():
      if len(selected[t])!=expected:raise ValueError(f'CONTAGEM DIVERGENTE {t}: {len(selected[t])} != {expected}. Abortando')
    if any(e['id']==TEST for e in events):raise ValueError('Evento de teste selecionado: abortando')
    return selected

def sql_str(s):return "'"+str(s).replace("'","''")+"'"

def generate(data):
    # Prévias históricas ficam privadas. Não importa autenticações nem autoriza venda.
    lines=["-- GERADO LOCALMENTE: CONTEÚDO SENSÍVEL. NÃO COMMITAR / NÃO COMPARTILHAR.",
           "-- Executar SOMENTE no Supabase de HOMOLOGAÇÃO depois da migration 04.",
           "-- Confirme que o projeto destino é o correto e execute em transação.",
           "BEGIN;", "SET LOCAL statement_timeout = '120s';", "SET LOCAL lock_timeout = '5s';",
           "SELECT pg_advisory_xact_lock(hashtext('bnc_legacy_import_2026_04'));",
           "DO $$ BEGIN IF to_regclass('public.bnc_legacy_raw') IS NULL OR to_regclass('public.bnc_events') IS NULL THEN RAISE EXCEPTION 'Migration do BNC ausente'; END IF; END $$;",
           "INSERT INTO public.bnc_organizations(slug,name) VALUES ('sementinha','Sementinha'),('tucxa','TUCXA') ON CONFLICT(slug) DO NOTHING;"]
    for table in ['event_days','rounds','prizes','round_awards','draw_events','winner_claims','winners']:
      for x in data[table]:
        js=json.dumps(x,ensure_ascii=False,separators=(',',':'))
        lines.append('INSERT INTO public.bnc_legacy_raw(source_project,source_table,source_id,payload) VALUES ('+
                     f'{sql_str(SOURCE)},{sql_str(table)},{sql_str(x["id"])},{sql_str(js)}::jsonb) '
                     'ON CONFLICT(source_project,source_table,source_id) DO UPDATE SET payload=EXCLUDED.payload;')
    lines.append("-- A materialização só é feita após verificar referências e contagens da área privada.")
    lines.append("SELECT public.bnc_materialize_legacy_v04();")
    lines.append("COMMIT;")
    lines.append("SELECT source_table,count(*) AS qtd FROM public.bnc_legacy_raw WHERE source_project="+sql_str(SOURCE)+" GROUP BY 1 ORDER BY 1;")
    return '\n'.join(lines)+'\n'

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--data',required=True,type=pathlib.Path)
 p.add_argument('--saida',type=pathlib.Path)
 p.add_argument('--gerar-sql',action='store_true',help='Gera SQL contendo dados pessoais, para uso somente local')
 a=p.parse_args()
 if not a.data.is_file():p.error(f'Arquivo não encontrado: {a.data}')
 try:d=select(load(a.data))
 except Exception as e:print('ERRO:',e,file=sys.stderr);sys.exit(2)
 print('AUDITORIA DO BACKUP:')
 for table,rows in d.items():print(f'  {table:20s}: {len(rows)}')
 print('Evento de teste excluído. Nenhuma conexão ou escrita remota foi realizada.')
 if a.gerar_sql:
   if not a.saida:p.error('--gerar-sql exige --saida')
   a.saida.parent.mkdir(parents=True,exist_ok=True)
   a.saida.write_text(generate(d),encoding='utf-8')
   print(f'SQL gerado localmente: {a.saida} (CONTEÚDO SENSÍVEL; NÃO ENVIAR AQUI)')
if __name__=='__main__':main()

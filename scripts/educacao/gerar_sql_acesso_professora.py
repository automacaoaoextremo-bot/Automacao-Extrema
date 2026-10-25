#!/usr/bin/env python3
"""Gera SQL seguro de cadastro/redefinicao de acesso; NAO conecta na internet.
A senha digitada nunca e impressa nem incluída no repositório.
Uso: python scripts/educacao/gerar_sql_acesso_professora.py --telefone 199xxxxxxxx --nome Lu --saida C:\\Users\\lacos\\Documents\\scripts\\cadastro_lu.sql
"""
import argparse
import getpass
import hashlib
import os
from pathlib import Path
import re

p=argparse.ArgumentParser()
p.add_argument('--telefone',required=True)
p.add_argument('--nome',required=True)
p.add_argument('--saida',required=True)
a=p.parse_args()
phone=re.sub(r'\D','',a.telefone)
if not re.fullmatch(r'\d{10,13}',phone):raise SystemExit('Telefone deve ter de 10 a 13 digitos.')
password=getpass.getpass('Digite a senha temporaria (nao aparece na tela): ')
if len(password)<8:raise SystemExit('Senha temporaria deve ter ao menos 8 caracteres.')
salt=os.urandom(16)
dk=hashlib.scrypt(password.encode(),salt=salt,n=16384,r=8,p=1,dklen=64)
hash_value=f'scrypt${salt.hex()}${dk.hex()}'
name=a.nome.replace("'","''")
path=Path(a.saida)
path.parent.mkdir(parents=True,exist_ok=True)
sql=f'''-- SQL LOCAL CONFIDENCIAL: executar no Supabase SQL Editor e apagar este arquivo depois.
INSERT INTO public.ae_education_teachers (project_slug,name,phone_digits,password_hash,must_change_password,session_version,active)
VALUES ('lu-2026','{name}','{phone}','{hash_value}',true,1,true)
ON CONFLICT (phone_digits) DO UPDATE SET
 password_hash=EXCLUDED.password_hash,
 must_change_password=true,
 active=true,
 session_version=public.ae_education_teachers.session_version+1,
 failed_attempts=0,
 locked_until=NULL,
 updated_at=now();
'''
path.write_text(sql,encoding='utf-8')
print(f'SQL gerado em: {path} (contém hash da senha e telefone; não subir ao Git).')

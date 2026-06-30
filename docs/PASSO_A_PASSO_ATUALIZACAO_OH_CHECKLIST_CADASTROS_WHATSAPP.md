# Passo a passo — Organização em Harmonia: checklist, Base Única e BotConversa

## 1. O que foi ajustado

Esta atualização inclui:

1. botão **Sair** da área logada redirecionando para `/solucoes/organizacao-em-harmonia/login` após encerrar sessão no Supabase;
2. checklist inicial no painel da Organização em Harmonia, no padrão visual do Presença Querida;
3. tela **Base Única** com cadastro de envolvidos, função, módulos habilitados, status, edição, inativação e exclusão;
4. importação de envolvidos por CSV com modelo para download;
5. APIs autenticadas para Base Única;
6. documentação de palavras-chave sem sobreposição entre fluxos do BotConversa.

## 2. Atualização local

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-oh-checklist-cadastros.zip -Force
```

Extraia o ZIP atualizado por cima da pasta do projeto.

Depois rode:

```powershell
npm run lint
npm run build
npm run dev
```

## 3. Rotas para testar localmente

```txt
http://localhost:3000/solucoes/organizacao-em-harmonia/login
http://localhost:3000/solucoes/organizacao-em-harmonia/cliente
http://localhost:3000/solucoes/organizacao-em-harmonia/cliente/base-unica
```

Na Base Única, teste:

1. incluir um envolvido manualmente;
2. editar o envolvido;
3. inativar/ativar;
4. baixar modelo CSV;
5. importar CSV;
6. excluir um registro de teste.

## 4. Supabase

Rode novamente o SQL principal da Organização em Harmonia:

```txt
supabase/sql/20260628_15_organizacao_em_harmonia_base_unica.sql
```

Valide se existem as tabelas:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('oh_organizations', 'oh_people', 'oh_roles', 'oh_memberships', 'oh_module_settings')
order by table_name;
```

## 5. BotConversa

Fluxos separados não devem repetir palavras-chave genéricas.

### OH - Lead vindo do site

Use palavras-chave específicas:

```txt
Organização em Harmonia
Quero conhecer a Organização em Harmonia
Preenchi o Quero Conhecer da Organização em Harmonia
OH
```

Bloco principal:

```txt
{oh_resp_botconversa}
```

### CED - Lead vindo do site

Use palavras-chave específicas:

```txt
Corrente em Dia
Quero conhecer o Corrente em Dia
Preenchi o Quero Conhecer do Corrente em Dia
CED
```

### Agenda Viva e Atendimento em Harmonia

Quando forem criados, também devem ter palavras-chave exclusivas:

```txt
Agenda Viva
Quero conhecer o Agenda Viva
AGV
```

```txt
Atendimento em Harmonia
Quero conhecer o Atendimento em Harmonia
AEH
```

## 6. GitHub

```powershell
git checkout feature/organizacao-em-harmonia

git status
git add .
git commit -m "Ajusta checklist Base Unica e BotConversa da Organizacao em Harmonia"
git push origin feature/organizacao-em-harmonia
```

## 7. Vercel

Após o push, valide o Preview da branch. Quando estiver pronto para produção:

```powershell
npx vercel --prod
```

## 8. Teste de ponta a ponta

1. Preencha o Quero Conhecer da Organização em Harmonia.
2. Confirme se o e-mail vem com login correto.
3. Clique em Continuar cadastro pelo WhatsApp.
4. Confirme se o BotConversa dispara o fluxo OH, não CED.
5. Faça login.
6. Veja o checklist inicial.
7. Entre em Base Única e cadastre/importa envolvidos.
8. Clique em Sair e confirme se voltou ao login.

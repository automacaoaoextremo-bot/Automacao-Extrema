# Bingo no Controle — Integração 06: separar Preview e Produção

Escopo: consulta administrativa *somente leitura*. Não habilita edição, sorteios, vendas, pagamentos nem importação de histórico.

## Destinos
- Preview/homologação: `zbqcngvohidmwqkfwwvf` — banco de testes.
- Production/Automação Extrema: `ooegejytfldzkjeexggo` — banco **compartilhado** com outras soluções.

A checagem de host feita pelo cliente é uma proteção contra erro operacional, **não substitui RLS**. O servidor de produção só pode receber acesso público após revisão das políticas por organização e testes de usuário sem vínculo.

## Arquivos substituídos/adicionados
- Substituir `src/app/solucoes/bingo-no-controle/cliente/tucxa/admin/page.tsx` (versão integral da Integração 05, somente textos e import do cliente atualizados).
- Adicionar `src/lib/bingo-no-controle/client.ts`.
- Adicionar `supabase/diagnostics/bingo-no-controle-producao-preflight-20261101.sql` (somente leitura).

O arquivo antigo `src/lib/bingo-no-controle/homolog-client.ts` não é mais importado pela página atualizada. Se ainda for usado em outro arquivo, mantenha-o até atualizar esses imports; não o adicione por engano ao commit caso permaneça não rastreado.

## Vercel — configurar ANTES do novo deployment
Configure os nomes abaixo em **Preview** (de preferência limitados à branch `feature/bingo-no-controle-cliente-fundador-tucxa-v1`):

- `NEXT_PUBLIC_BNC_ENV=homolog`
- `NEXT_PUBLIC_BNC_SUPABASE_URL=https://zbqcngvohidmwqkfwwvf.supabase.co`
- `NEXT_PUBLIC_BNC_SUPABASE_ANON_KEY=` chave pública de homologação

Configure os mesmos nomes em **Production**, com os valores:

- `NEXT_PUBLIC_BNC_ENV=production`
- `NEXT_PUBLIC_BNC_SUPABASE_URL=https://ooegejytfldzkjeexggo.supabase.co`
- `NEXT_PUBLIC_BNC_SUPABASE_ANON_KEY=` chave pública do Supabase de produção compartilhado

Nunca utilizar `service_role`, secret keys, senha de PostgreSQL ou token de acesso como valor `NEXT_PUBLIC_*`. Essas variáveis são embutidas no JavaScript público durante o build. Um redeploy é obrigatório quando forem alteradas.

Em desenvolvimento local, coloque os valores **somente de homologação** em `.env.local` e não versionar esse arquivo.

## Produção: antes de importar dados ou aplicar migrations
1. No Dashboard, confirme o Project Ref `ooegejytfldzkjeexggo`.
2. Execute o arquivo `supabase/diagnostics/bingo-no-controle-producao-preflight-20261101.sql`. Envie apenas seu CSV (não exibe dados pessoais).
3. Valide 15 tabelas com RLS, 5 índices da V1, rotina V04 e a contagem de 5 políticas de leitura V05. Se houver diferença, **não execute** novamente migrations anteriores automaticamente.
4. Inspecione as contagens de registros atuais antes de decidir se importar. Se já existirem dados, **não** executar outra importação de imediato.
5. O Supabase Auth é compartilhado com as outras soluções: não recriar contas existentes, apagar sessões, alterar globalmente o Site URL ou sobrescrever configurações de outras aplicações.
6. Confirmar com responsável a autorização de transferir dados históricos Sementinha/TUCXA para produção, considerando dados pessoais e privacidade.

## Git
Use a branch `feature/bingo-no-controle-cliente-fundador-tucxa-v1`. Inclua só os caminhos Bingo listados e revise `git diff --cached`, sem `git add .`. Preserve quaisquer arquivos de trabalho anteriores.

## Validações
`npm run lint`, `npx tsc --noEmit`, `npm run build`. Na Vercel, Preview deve consultar **exclusivamente** a homologação, e Production, apenas após merge aprovado, o Supabase compartilhado. Conferir na aba Network do navegador o host das chamadas (jamais inspecionar/divulgar senhas ou tokens).

## Restrição atual
Esta entrega NÃO executa/aplica migrations V04 ou V05, NÃO importa dados e NÃO autoriza merge na main antes da auditoria de produção, revisão RLS, vínculo de Auth e teste funcional de isolamento.

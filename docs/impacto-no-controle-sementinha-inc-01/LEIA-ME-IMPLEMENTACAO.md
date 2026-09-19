# Automação Extrema — Impacto no Controle — Sementinha — InC-01

Base recebida:

- branch: `feature/impacto-no-controle-sementinha-v1`
- commit: `923380976ad87339aa891efdd5fe4438d8f97d43`
- working tree indicada no pacote: limpa

## Objetivo

Integrar o projeto standalone **Impacto no Controle** ao repositório da Automação Extrema, sob `/solucoes/impacto-no-controle`, sem manter um segundo projeto Next.js nem um segundo banco Supabase.

A primeira implantação desta versão integrada é o **Sementinha**, com uma campanha inicial em formato de rifa de uma **bicicleta seminova**. As 8 fotos fornecidas foram incorporadas aos assets do módulo.

## Rotas integradas

### Públicas

- `/solucoes/impacto-no-controle`
- `/solucoes/impacto-no-controle/acoes/[cliente]`
- `/solucoes/impacto-no-controle/acao/[slug]`
- `/solucoes/impacto-no-controle/reserva/[token]`
- `/solucoes/impacto-no-controle/acompanhar/[token]`
- `/solucoes/impacto-no-controle/obrigado/[token]`

### Acesso e gestão

- `/solucoes/impacto-no-controle/cliente/login`
- `/solucoes/impacto-no-controle/gestao/login`
- `/solucoes/impacto-no-controle/gestao`
- `/solucoes/impacto-no-controle/gestao/campanhas`
- `/solucoes/impacto-no-controle/gestao/campanhas/[id]`
- `/solucoes/impacto-no-controle/gestao/clientes`
- `/solucoes/impacto-no-controle/redefinir-senha`

### APIs

Todas as APIs do standalone foram movidas para o prefixo:

`/api/impacto-no-controle/...`

## Integração com a Automação Extrema

- O card do **Impacto no Controle** na home da Automação Extrema passa a apontar para a nova solução integrada.
- Foi criada a rota `/solucoes`, que redireciona para a seção de soluções da home.
- O módulo reutiliza `@supabase/supabase-js`, `supabaseAdmin`, `supabaseBrowser`, Nodemailer, QRCode e demais dependências que já existem na Automação Extrema.
- Não foi necessário adicionar `lucide-react`, `@supabase/ssr` ou Resend.
- Os ícones necessários foram implementados localmente no módulo.

## Fotos da bicicleta

Foram incluídas em:

`public/impacto-no-controle/sementinha/`

- `bike-01.jpeg`
- `bike-02.jpeg`
- `bike-03.jpeg`
- `bike-04.jpeg`
- `bike-05.jpeg`
- `bike-06.jpeg`
- `bike-07.jpeg`
- `bike-08.jpeg`
- `sementinha-logo.jpg`

## Banco de dados — importante

**NÃO execute** o `supabase/01_schema_seed.sql` do projeto standalone no Supabase compartilhado da Automação Extrema. Aquele arquivo foi preparado para um projeto isolado e contém operações destrutivas sobre tabelas genéricas.

Use somente a migration nova:

`supabase/migrations/20260919170000_impacto_no_controle_sementinha_v1.sql`

Ela é não destrutiva em relação aos demais módulos e usa o namespace lógico `inc_`, incluindo:

- `inc_clients`
- `inc_app_users`
- `inc_campaigns`
- `inc_campaign_numbers`
- `inc_campaign_quotas`
- `inc_participants`
- `inc_contributions`
- `inc_repasse_rules`
- `inc_campaign_updates`
- `inc_campaign_accountability`
- `inc_message_templates`
- `inc_audit_logs`

Também cria as views `inc_*`, RLS, funções auxiliares e o bucket privado:

`impacto-no-controle-proofs`

## Seed do Sementinha

A migration cria/atualiza:

- cliente: `Sementinha`
- slug: `sementinha`
- e-mail responsável: `bazardosementinha@gmail.com`
- campanha: `Rifa da Bicicleta Seminova`
- slug: `rifa-bike-seminova-sementinha`
- status inicial: `draft`
- galeria: as 8 fotos da bicicleta

A campanha fica deliberadamente como **rascunho**. Não foram inventados valores que não estavam nos arquivos fornecidos.

Antes de ativá-la, a equipe deverá preencher/confirmar pelo painel de Gestão:

- quantidade total de números;
- valor de cada número;
- meta financeira, se aplicável;
- data/hora inicial e final;
- descrição final da bicicleta e estado de conservação;
- regulamento completo;
- data, forma e regras do sorteio;
- qualquer informação obrigatória para divulgação da ação.

## Pix

Os valores reais **não foram gravados na migration nem em `.env.example`**.

A aplicação usa os seguintes fallbacks de ambiente quando a campanha/cliente não possuir Pix persistido no banco:

```text
PIX_KEY
PIX_RECEIVER_NAME
PIX_CITY
```

Na máquina local já podem permanecer em `.env.local`. Na Vercel, configure as mesmas variáveis nos ambientes Preview e Production antes de testar o fluxo Pix.

## E-mail

O módulo reutiliza o SMTP já existente na Automação Extrema:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `EMAIL_COPY_TO`

Opcionalmente pode ser definido:

`IMPACTO_ADMIN_EMAIL`

O responsável do cliente (`responsible_email`) é priorizado nos avisos administrativos da campanha; `IMPACTO_ADMIN_EMAIL`/`EMAIL_COPY_TO` permanece como apoio/cópia administrativa.

## Usuários de gestão

A migration tenta vincular automaticamente, **somente se os usuários já existirem no Supabase Authentication**:

- `impactonocontrole@gmail.com` → owner
- `bazardosementinha@gmail.com` → client_admin do Sementinha

Ela não cria senhas nem usuários de Authentication.

Se os usuários forem criados depois da migration, execute o arquivo:

`docs/impacto-no-controle-sementinha-inc-01/VINCULAR-USUARIOS.sql`

## Comportamento da campanha em draft

Enquanto `Rifa da Bicicleta Seminova` estiver com `status = draft`:

- ela aparece na Gestão;
- ela não fica disponível publicamente;
- a rota `/acao/rifa-bike-seminova-sementinha` pode responder como não encontrada para usuário público.

Isso é intencional para impedir divulgação de uma rifa incompleta.

## Validação executada nesta entrega

- 44 arquivos TypeScript/TSX do módulo foram processados pelo parser/transpilador TypeScript 5.8.3: **0 erros de sintaxe**.
- Imports locais `@/...` do módulo foram conferidos: **0 imports internos ausentes**.
- Não permaneceram imports de `lucide-react`, `@supabase/ssr` ou Resend.
- Não permaneceram referências à campanha standalone antiga `sao-francisco-em-racao` / Amigos de Pet.
- `package.json` não precisou ser alterado.

A validação acima não substitui o type-check e o build do repositório completo. No Windows execute obrigatoriamente:

```powershell
npm run lint
npm run build
```

## Homologação mínima antes de ativar a campanha

1. Aplicar a migration segura do módulo.
2. Criar/verificar os usuários de Authentication e seus vínculos.
3. Configurar as variáveis Pix na Vercel Preview.
4. Fazer o deploy da branch de feature.
5. Abrir `/solucoes/impacto-no-controle`.
6. Entrar na Gestão.
7. Abrir a campanha draft do Sementinha.
8. Preencher número de cotas/números, preço, datas e regulamento.
9. Salvar ainda como `draft` e revisar as 8 fotos.
10. Alterar para `active` somente quando todas as regras estiverem definidas.
11. Fazer uma reserva de teste.
12. Conferir QR/Pix copia e cola.
13. Enviar comprovante.
14. Aprovar pela Gestão.
15. Conferir acompanhamento pelo token.
16. Testar expiração de reserva e liberação do número.
17. Testar recuperação de senha da Gestão/Cliente.
18. Somente depois considerar merge para `main`.

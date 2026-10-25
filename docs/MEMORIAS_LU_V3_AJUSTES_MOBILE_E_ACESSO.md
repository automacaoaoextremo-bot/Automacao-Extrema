# Memórias que Encantam – Livro Musical da Lu – Ajustes V3

Branch obrigatória: `feature/memorias-que-encantam-lu-piloto-v1`.
Base recebida: `0a6fdfa`, inventário `memorias-lu-ajustes-01-fontes-20261024-172315.zip`.

## Escopo implementado

1. Página do livro sem código de acesso, com QR Code/deep link `?musica=02`.
2. Cabeçalho em duas linhas, botão **Professor(a)** na primeira e logo AE clicável arredondado na segunda.
3. **Escolha uma música** abre janela paginada (4 músicas por página em 3 páginas). Cada música abre player em janela com controles de áudio e letra provisória.
4. **Professor(a)** exige celular e senha; primeiro acesso obriga confirmação de dados e troca de senha.
5. Curadoria: botão **Definir Vozes**, janela paginada e comparação de gravações, escolha, ocultação/restauração e novo upload.
6. Remoção de banners técnicos visíveis na curadoria. Checagens de segurança permanecem no backend.

## Segurança e privacidade

- As gravações continuam no bucket **privado** `education-media-private`; não colocá-las em `public/`, no Git nem no ZIP.
- O público recebe URLs temporárias **somente** se `media_authorized=true` E `family_released=true`; e, mesmo assim, apenas versões `status=available AND is_selected=true`.
- Sem versões publicadas, a página utiliza os áudios instrumentais demonstrativos V1. Acesso público sem senha significa que qualquer pessoa que receber o link/QR pode abrir. **Confirme por escrito que a aprovação da escola permite disponibilização pública na internet**, incluindo licenças das letras/composições quando aplicável.
- Um código antigo da V2 não concede acesso administrativo na V3. Cada professora recebe login e senha próprios; o cookie é assinado, HttpOnly e tem validade de 12 horas.
- Após 5 erros consecutivos, o login é bloqueado por 15 minutos. A redefinição de senha é administrativa no piloto (sem recuperação automatizada por e-mail/SMS).
- Não gravar senhas/credenciais em chat ou código. A senha temporária precisa ser transmitida por canal privado e trocada no primeiro acesso.
- `noindex` no metadata evita indexação voluntária; **não é mecanismo de privacidade**.

## Sequência recomendada – Supabase ANTES do deploy

1. Verificar o projeto/banco do Supabase e backup.
2. Confirmar aplicação da migração V2 `20261024133000_ae_education_lu_audio_pilot.sql`.
3. Aplicar no SQL Editor a nova migração `supabase/migrations/20261024183000_ae_education_lu_teachers_v3.sql`.
4. Gerar **fora do repositório** o SQL de cadastro da professora, usando o script abaixo:

```powershell
cd "C:\Users\lacos\Documents\Github\automacao-extrema-memorias"
python scripts/educacao/gerar_sql_acesso_professora.py `
  --telefone "199xxxxxxxx" `
  --nome "Lu" `
  --saida "C:\Users\lacos\Documents\scripts\cadastro-professora-lu-local.sql"
```

Digite no terminal a senha temporária definida, por exemplo a solicitada pela professora, **sem colocá-la no código**. A senha terá hash scrypt com salt único. No SQL Editor, cole o arquivo gerado e execute. Depois, **apague o SQL local com dados pessoais e hash**. Não inclua o SQL no Git.

Para cadastrar outra professora, execute o mesmo script com nome e telefone diferentes. Se redefinir a senha de um telefone existente, o comando invalida as sessões antigas, e exige nova troca.

## Testes locais (obrigatórios)

```powershell
cd "C:\Users\lacos\Documents\Github\automacao-extrema-memorias"
git branch --show-current
git status --short
npx tsc --noEmit
npx eslint src/lib/education src/components/education src/app/solucoes/memorias-que-encantam
npm run build
```

Se `tsc` ou build der erro, não realizar commit/merge até corrigir.

## Ambiente Vercel

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` como no projeto existente. A service role é apenas no servidor.
- `MEMORIAS_LU_SESSION_SECRET`: string aleatória com **32 caracteres ou mais** em **Preview e Production**. Mudá-la invalida sessões existentes.
- Variáveis antigas `MEMORIAS_LU_ACCESS_CODE`, `MEMORIAS_LU_PREVIEW_CODE`, `MEMORIAS_LU_ADMIN_CODE` deixam de ser usadas nesta V3; é possível removê-las **depois** da homologação, sem alterar as outras aplicações.
- Faça Redeploy do Preview após modificar variáveis. Não desabilitar globalmente a Vercel Authentication de Previews.

## Testar Preview

1. Acesse `/solucoes/memorias-que-encantam/livro/lu-2026` sem código: deve abrir o livro.
2. Abra **Escolha uma música**; confira 4 por página e 3 páginas; selecione, reproduza e feche.
3. Abra `?musica=02`: deve abrir diretamente Borboletinha em janela.
4. Abra **Professor(a)** e use telefone + senha temporária. Confira redirecionamento para confirmar os dados e trocar senha.
5. Efetue logout; tente login com senha nova e confirme que a antiga foi invalidada.
6. Na curadoria, teste listar, escolher, ocultar/restaurar e upload; confirmar que o público não vê opções não escolhidas.
7. Teste uma janela anônima para garantir que `/admin` e endpoints POST rejeitam pessoas sem autenticação.
8. Teste no Chrome Android e no Safari iOS; formato OGG pode exigir transcodificação para AAC/M4A compatível.

## Publicação em Production

Após Preview aprovado, faça PR da branch da Lu para `main` pelo GitHub, verifique o diff para não incluir alterações de TUCXA/Bingo e faça merge. Confirme o deployment da Vercel em Production. Para liberar gravações reais às famílias, apenas com confirmação formal de autorização **para acesso público**:

```sql
UPDATE public.ae_education_projects
SET family_released = true
WHERE slug = 'lu-2026' AND media_authorized = true;
```

Essa operação deve ser executada **somente após** as professoras escolherem a versão de cada música e a escola aprovar explicitamente a exposição pública. Para suspender a reprodução real imediatamente:

```sql
UPDATE public.ae_education_projects
SET family_released = false
WHERE slug = 'lu-2026';
```

O QR Code de teste da rota principal já poderá abrir sem autenticação do aplicativo depois da publicação. Não imprimir QR definitivo até conferir a URL em Production.

## Rollback

O instalador gera cópias dos arquivos anteriores, em pasta local (fora do repositório) com timestamp. Para reverter uma publicação na Vercel, utilizar o recurso de rollback/deploy anterior e, quando necessário, restaurar os arquivos na branch; não remover a migração do banco sem avaliar dados existentes.

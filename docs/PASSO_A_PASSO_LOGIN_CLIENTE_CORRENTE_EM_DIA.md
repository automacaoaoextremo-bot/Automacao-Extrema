# Corrente em Dia — Login do cliente, área logada e condições comerciais por cliente

## O que foi alterado

1. A página **Quero Conhecer** ficou sem os botões `Quero Conhecer` e `Já sou Cliente` no cabeçalho, porque a pessoa já está no fluxo de cadastro de interesse.
2. O botão **Voltar** foi reposicionado à direita, abaixo do cabeçalho, para não interferir no texto `Corrente em Dia`.
3. O botão **Já sou Cliente** da landing agora aponta para o login específico do Corrente em Dia:

```txt
/solucoes/corrente-em-dia/login
```

4. Foi criada uma área logada do cliente:

```txt
/solucoes/corrente-em-dia/cliente
```

5. Foi criada uma API para carregar o painel do cliente autenticado:

```txt
/api/corrente-em-dia/cliente/dashboard
```

6. Foi criado o SQL de condições comerciais por cliente:

```txt
supabase/sql/20260611_04_condicoes_cliente_fundador_corrente_em_dia.sql
```

7. Todos os valores e taxas podem ser configurados por cliente na tabela:

```txt
ced_client_terms
```

## SQLs a rodar no Supabase

Se os SQLs 01, 02 e 03 já foram executados, rode apenas o 04:

```txt
supabase/sql/20260611_04_condicoes_cliente_fundador_corrente_em_dia.sql
```

Se estiver montando do zero, rode em ordem:

```txt
supabase/sql/20260611_01_cadastro_solucao_corrente_em_dia.sql
supabase/sql/20260611_02_base_corrente_em_dia.sql
supabase/sql/20260611_03_seed_corrente_em_dia_dados_fakes.sql
supabase/sql/20260611_04_condicoes_cliente_fundador_corrente_em_dia.sql
```

## Como criar usuário de teste no Supabase

1. Entre no painel do Supabase.
2. Abra **Authentication > Users**.
3. Clique em **Add user** / **Create new user**.
4. Use um destes e-mails fictícios já existentes na base:

```txt
rita.menezes@exemplo.com
paulo.nogueira@exemplo.com
maria.santos@exemplo.com
joao.almeida@exemplo.com
```

5. Defina uma senha simples para teste, por exemplo:

```txt
Teste@123456
```

6. Marque o e-mail como confirmado, se a tela do Supabase permitir.
7. Salve.

A área do cliente tenta localizar a pessoa pelo `auth_user_id`. Se ainda não estiver vinculado, ela também tenta localizar pelo e-mail do usuário autenticado. Portanto, para teste, basta criar no Supabase Auth um usuário com o mesmo e-mail de uma pessoa fictícia.

## Vincular pelo auth_user_id manualmente, se quiser

Copie o UUID do usuário criado em **Authentication > Users** e rode:

```sql
update public.ced_people
set auth_user_id = 'COLE_AQUI_O_UUID_DO_AUTH_USER'
where email = 'rita.menezes@exemplo.com';
```

## O que aparece para o cliente ao logar

A tela `/solucoes/corrente-em-dia/cliente` exibe:

- organização vinculada ao usuário;
- totais de previsto, aprovado, pendente, em revisão e divergente;
- dados da organização;
- condição comercial como Cliente Fundador;
- implantação, mensalidade, taxa operacional e prazo do piloto;
- contribuições e status;
- comprovantes e pré-validação;
- aviso de privacidade e LGPD.

## Condições comerciais editáveis por cliente

Tabela criada:

```txt
ced_client_terms
```

Campos principais:

```txt
condition_label
contract_status
fee_status
setup_fee
monthly_fee
operational_fee_percentage
federation_percentage
ae_percentage
partner_percentage
unlinked_reserve_percentage
pilot_days
founder_benefits
founder_obligations
allow_testimonial
allow_logo_use
terms_accepted
accepted_at
lgpd_summary
revision_notes
notes
```

Exemplo para alterar um cliente específico:

```sql
update public.ced_client_terms t
set operational_fee_percentage = 2.75,
    fee_status = 'em_revisao',
    monthly_fee = 0,
    setup_fee = 0,
    pilot_days = 60,
    revision_notes = 'Condição especial em revisão para Cliente Fundador.'
from public.ced_organizations o
where t.organization_id = o.id
  and o.slug = 'casa-pai-benedito-das-matas';
```

## Validações locais

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
npm run lint
npm run build
npm run dev
```

Páginas para testar:

```txt
http://localhost:3000/solucoes/corrente-em-dia
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
http://localhost:3000/solucoes/corrente-em-dia/login
http://localhost:3000/solucoes/corrente-em-dia/cliente
http://localhost:3000/c/casa-pai-benedito-das-matas
```

## Atualizar GitHub

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

git status
npm run lint
npm run build

git add .
git commit -m "Adiciona login e area do cliente Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Atualizar Vercel

Se o projeto está conectado ao GitHub, o deploy deve começar automaticamente depois do `git push`.

Validar em produção:

```txt
https://www.automacaoextrema.com/solucoes/corrente-em-dia
https://www.automacaoextrema.com/solucoes/corrente-em-dia/quero-conhecer
https://www.automacaoextrema.com/solucoes/corrente-em-dia/login
https://www.automacaoextrema.com/solucoes/corrente-em-dia/cliente
https://www.automacaoextrema.com/c/casa-pai-benedito-das-matas
```

Se precisar forçar deploy:

```powershell
npx vercel --prod
```

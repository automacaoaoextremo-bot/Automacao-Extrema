# Corrente em Dia — Área logada V1

## Decisão de UX

A melhor estrutura é criar uma tela própria chamada **Configurações**. A linha 3 do cabeçalho logado fica:

```txt
CADASTRO | CONFIGURAÇÕES | CONTRIBUINTES | CONTRIBUIR | APROVAÇÕES
```

Motivo: funções e permissões são regras estruturais do sistema. Se ficarem dentro de Contribuintes, o responsável pode confundir cadastro de pessoas com governança de acesso. Em uma tela própria, fica mais claro para celular, mais seguro e mais fácil de evoluir.

## Rotas criadas/ajustadas

```txt
/solucoes/corrente-em-dia/cliente
/solucoes/corrente-em-dia/cliente/cadastro
/solucoes/corrente-em-dia/cliente/configuracoes
/solucoes/corrente-em-dia/cliente/contribuintes
/solucoes/corrente-em-dia/cliente/contribuir
/solucoes/corrente-em-dia/cliente/contribuir/obrigado
/solucoes/corrente-em-dia/cliente/aprovacoes
```

## SQL novo

Rode no Supabase SQL Editor:

```txt
supabase/sql/20260616_06_area_logada_corrente_em_dia.sql
```

Ele adiciona:

- campos extras em `ced_organizations`;
- tabela `ced_contribution_options`;
- tabela `ced_role_permissions`;
- seed das funções padrão;
- permissões padrão por função.

## Atualização local

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-area-logada-v1-corrente.zip -Force
```

Extraia o ZIP atualizado por cima da pasta atual.

Depois rode:

```powershell
npm run lint
npm run build
npm run dev
```

## Validação local

Acesse:

```txt
http://localhost:3000/solucoes/corrente-em-dia/login
http://localhost:3000/solucoes/corrente-em-dia/cliente
http://localhost:3000/solucoes/corrente-em-dia/cliente/cadastro
http://localhost:3000/solucoes/corrente-em-dia/cliente/configuracoes
http://localhost:3000/solucoes/corrente-em-dia/cliente/contribuintes
http://localhost:3000/solucoes/corrente-em-dia/cliente/contribuir
http://localhost:3000/solucoes/corrente-em-dia/cliente/aprovacoes
```

## GitHub

```powershell
git status
git add .
git commit -m "Adiciona area logada V1 do Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Vercel

Se o projeto estiver conectado ao GitHub, o deploy inicia automaticamente após o push.

Para forçar:

```powershell
npx vercel --prod
```

## Roteiro de testes completo

### 1. Login e cabeçalho

1. Acesse `/solucoes/corrente-em-dia/login`.
2. Faça login com um usuário vinculado em `ced_people`.
3. Confirme que a linha 1 mostra logo + Corrente em Dia + Sair.
4. Confirme que o texto Corrente em Dia não quebra no celular.
5. Clique em Sair e confirme retorno para a página de login.

### 2. Menu logado

1. Confirme a linha 3:
   - Cadastro
   - Configurações
   - Contribuintes
   - Contribuir
   - Aprovações
2. Clique em cada item.
3. Confirme navegação sem rolagem lateral problemática.

### 3. Cadastro

1. Abra Cadastro.
2. Verifique se Nome do contato, e-mail e WhatsApp vieram do Quero Conhecer.
3. Altere organização entre Associação, Federação e Terreiro.
4. Informe nome da organização.
5. Informe responsável pela gestão.
6. Informe chave Pix e recebedor.
7. Informe valor padrão individual.
8. Adicione uma forma adicional de contribuição.
9. Configure dia fixo, até dia e qualquer dia.
10. Ative/desative lembretes.
11. Escolha UF e cidade.
12. Informe CEP e use pesquisar.
13. Informe número/complemento.
14. Salve.
15. Recarregue a página e confira persistência.

### 4. Configurações

1. Abra Configurações.
2. Confira funções padrão.
3. Crie uma nova função, por exemplo Tesoureiro.
4. Marque permissões.
5. Salve.
6. Recarregue e confira permissões.

### 5. Contribuintes

1. Abra Contribuintes.
2. Cadastre um contribuinte.
3. Escolha função.
4. Informe e-mail, WhatsApp, valor e dia.
5. Marque criar login no Supabase.
6. Salve.
7. Confirme exibição na lista.
8. Clique em Enviar acesso por WhatsApp.
9. Baixe o modelo de planilha.
10. Teste filtro por nome/e-mail.

### 6. Contribuir

1. Faça login como contribuinte.
2. Abra Contribuir.
3. Confira valor, Pix e vencimento.
4. Copie Pix copia e cola.
5. Informe valor pago e chave Pix.
6. Anexe um arquivo de teste.
7. Envie comprovante.
8. Confirme página de obrigado.
9. Volte e confira histórico.

### 7. Aprovações

1. Faça login como gestor.
2. Abra Aprovações.
3. Filtre pendentes e em revisão.
4. Aprove comprovante.
5. Reprove comprovante.
6. Peça correção.
7. Gere lembrete WhatsApp.
8. Verifique que o texto não constrange o contribuinte.

### 8. Mobile

1. Teste no celular.
2. Confira cabeçalho fixo.
3. Confira campos sem cortes.
4. Confira botões com tamanho adequado.
5. Confira listas e filtros.

### 9. Produção

1. Rode `npm run lint`.
2. Rode `npm run build`.
3. Faça deploy.
4. Teste as rotas em produção.

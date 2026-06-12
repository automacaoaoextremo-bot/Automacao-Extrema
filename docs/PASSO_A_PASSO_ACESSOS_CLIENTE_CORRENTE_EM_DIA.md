# Corrente em Dia — Ajustes de Acessos do Cliente

## Arquivos atualizados

- `src/app/solucoes/corrente-em-dia/cliente/page.tsx`
- `src/app/solucoes/corrente-em-dia/cliente/acessos/page.tsx`
- `src/app/api/corrente-em-dia/cliente/acessos/import/route.ts`
- `src/app/api/corrente-em-dia/cliente/dashboard/route.ts`
- `public/modelos/modelo-importacao-contribuintes-corrente-em-dia.csv`

## O que mudou

1. O texto do painel do cliente foi ajustado para remover o final “para este cliente”.
2. Foi criada uma terceira linha de navegação na área logada com:
   - Painel
   - Acessos
   - Status
   - Organização
   - Cliente
   - Contribuições
   - Comprovantes
   - Privacidade e LGPD
3. Foi criada a seção `Status` antes dos cards de Previsto, Aprovado, Pendente, Em revisão e Divergente.
4. O card `Tipo de acesso` virou `Acessos`.
5. Foi removido o texto sobre V1/Pix dinâmico/gateway/split automático da área pública do cliente.
6. Foi criada a página `/solucoes/corrente-em-dia/cliente/acessos`.
7. A página de Acessos permite baixar o modelo CSV, enviar planilha, conferir a prévia e importar contribuintes.
8. A importação diferencia gestores/responsáveis e contribuintes.
9. A página exibe mensagens para copiar ou enviar por WhatsApp com o link de acesso do contribuinte.

## Como atualizar localmente

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema

Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-acessos-cliente-corrente.zip -Force
```

Extraia o ZIP atualizado por cima da pasta atual do projeto.

Depois rode:

```powershell
npm run lint
npm run build
npm run dev
```

## Testes locais

Acesse:

```txt
http://localhost:3000/solucoes/corrente-em-dia/login
http://localhost:3000/solucoes/corrente-em-dia/cliente
http://localhost:3000/solucoes/corrente-em-dia/cliente/acessos
```

Usuários fictícios sugeridos no Supabase Authentication:

```txt
rita.menezes@exemplo.com        responsável / tesoureira
paulo.nogueira@exemplo.com      responsável / presidente
maria.santos@exemplo.com        contribuinte individual
joao.almeida@exemplo.com        contribuinte com comprovante
ana.lima@exemplo.com            consulente contribuinte
carlos.oliveira@exemplo.com     família contribuinte
fernanda.oliveira@exemplo.com   família contribuinte
```

Use uma senha de teste, por exemplo:

```txt
Teste@123456
```

## Testar importação de acessos

1. Entre com um usuário gestor/responsável, por exemplo `rita.menezes@exemplo.com`.
2. Acesse `Cliente > Acessos` ou `/solucoes/corrente-em-dia/cliente/acessos`.
3. Baixe o modelo CSV.
4. Suba o próprio modelo ou uma cópia editada.
5. Confira a prévia.
6. Clique em `Importar contribuintes`.
7. Confira o resultado da importação.

Observação: para o envio automático real por e-mail, será necessário configurar provedor de e-mail transacional ou usar o fluxo de convite/redefinição do Supabase. No piloto, a tela já permite copiar a mensagem ou abrir WhatsApp.

## GitHub

```powershell
git status
git add .
git commit -m "Adiciona acessos e importacao de contribuintes Corrente em Dia"
git push origin main
```

Se sua branch principal for `master`:

```powershell
git push origin master
```

## Vercel

Se o Vercel está conectado ao GitHub, o deploy inicia automaticamente após o `git push`.

Validar em produção:

```txt
https://www.automacaoextrema.com/solucoes/corrente-em-dia/cliente
https://www.automacaoextrema.com/solucoes/corrente-em-dia/cliente/acessos
```

Se precisar forçar deploy:

```powershell
npx vercel --prod
```

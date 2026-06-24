# Passo a passo — ajustes de edição, aprovação, confirmação e cardápio do Presença Querida

## Arquivos alterados

Substitua estes arquivos no projeto:

- `src/app/solucoes/presenca-querida/cliente/mensagens/page.tsx`
- `src/app/solucoes/presenca-querida/cliente/convidados/page.tsx`
- `src/app/solucoes/presenca-querida/evento/[slug]/page.tsx`
- `src/components/presenca-public-confirmation.tsx`
- `src/app/api/presenca-querida/confirmar/[token]/route.ts`
- `src/app/api/presenca-querida/cliente/messages/route.ts`
- `src/lib/presenca-daniela50.ts`

Não há SQL obrigatório nesta atualização.

---

## O que foi corrigido

### 1. Mensagens > Convites para aprovação

- O botão **Editar** agora coloca a mensagem no formulário de edição e rola a tela até ele.
- Ao salvar, o vínculo com o convidado é preservado.
- O botão **Aprovar** agora mostra um alerta claro: `Convite aprovado com sucesso.`
- Após clicar em OK no alerta, a lista é recarregada e o botão muda para **Reprovar**.
- Ao reprovar, o convite volta para status de revisão.

### 2. Convidados

- O botão **Editar** agora carrega os dados no formulário e rola a tela até a edição.
- O botão de salvar muda para **Salvar alterações** quando está em modo de edição.
- O botão **Cancelar edição** limpa a edição atual.

### 3. Confirmação pública na landing page

Quando houver convidados vinculados ao mesmo convite, a landing agora mostra um checkbox:

- marcado: confirma por todos do convite;
- desmarcado: confirma somente o convidado principal.

A API `/api/presenca-querida/confirmar/[token]` foi ajustada para respeitar esta escolha.

### 4. Landing page / cardápio

- O card **Seu convite** foi movido para depois da programação e do cardápio.
- **Bolo de abacaxi** e **Docinhos** saíram do card de bebidas e agora ficam em uma seção própria.
- A foto do **Chopp Kremer** aparece dentro do item Chopp Kremer, logo após o texto.
- A informação duplicada sobre bolo/docinhos foi removida do bloco final.

---

## Como aplicar

Na raiz do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Descompacte o ZIP na raiz do projeto, permitindo substituir os arquivos existentes.

Depois rode:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

---

## Testes recomendados

### Área do cliente — Mensagens

Acesse:

```text
/solucoes/presenca-querida/cliente/mensagens
```

Teste:

1. Clique em **Editar** em um convite personalizado.
2. Confirme que a tela rola até o formulário.
3. Altere o texto e clique em **Salvar alterações**.
4. Clique em **Aprovar**.
5. Confirme o alerta.
6. Veja se o botão mudou para **Reprovar**.

### Área do cliente — Convidados

Acesse:

```text
/solucoes/presenca-querida/cliente/convidados
```

Teste:

1. Clique em **Editar** em um convidado.
2. Confirme que a tela rola até o formulário.
3. Altere algum campo.
4. Clique em **Salvar alterações**.
5. Confira se a tabela atualizou corretamente.

### Landing pública com token

Abra uma URL com token real:

```text
/solucoes/presenca-querida/evento/daniela-50-anos?convite=TOKEN#confirmacao
```

Teste com um convite que tenha convidados vinculados:

1. O card de confirmação deve aparecer no final da landing.
2. O checkbox deve permitir escolher entre confirmar por todos ou somente pelo convidado principal.
3. Salve com checkbox marcado e confira se todos vinculados mudam de status.
4. Salve com checkbox desmarcado e confira se somente o convidado principal muda.

### Cardápio

Na landing, confira:

- Bolo de abacaxi e Docinhos em card/seção própria.
- Chopp Kremer com foto dentro do próprio item.
- Sem repetição da frase de bolo/docinhos abaixo do card de chopp.

---

## Deploy

Se tudo passar localmente:

```powershell
git add .
git commit -m "fix: ajusta edição, aprovação e confirmação do Presença Querida"
git push origin main
```

Depois confira o deploy na Vercel.

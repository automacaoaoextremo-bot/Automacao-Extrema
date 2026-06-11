# Corrente em Dia — Ajustes de UI, CTAs, LGPD e Cliente Fundador

## O que foi atualizado

Esta atualização ajusta a experiência pública do Corrente em Dia conforme as validações mais recentes:

1. Cabeçalho da solução no padrão visual do Impacto no Controle:
   - logo próprio do Corrente em Dia;
   - nome da solução na mesma linha;
   - botões contextuais na mesma linha.
2. Subcabeçalho da Automação Extrema no padrão “Desenvolvido por Automação Extrema — Clique no logo e nos conheça”.
3. Landing pública mais direta, sem o texto técnico “V1 focada em...”.
4. CTAs principais:
   - Quero Conhecer;
   - Falar no WhatsApp;
   - Já sou Cliente no cabeçalho.
5. Página de cadastro de interesse em `/solucoes/corrente-em-dia/quero-conhecer`.
6. Texto “Como funciona na V1” alterado para “Como funciona”.
7. Bloco “Minha Contribuição” com reforço de privacidade, consentimento e LGPD.
8. Bloco “Piloto Recomendado” substituído por “Cliente Fundador”, com benefícios persuasivos e alinhados ao Deep Dive.
9. Página pública por organização em `/c/[slug]`, com aviso de privacidade e CTA para login.
10. Link “Corrente em Dia” adicionado ao menu lateral da Gestão AE.

## Arquivos novos

- `public/corrente-em-dia-logo.svg`
- `src/components/ae-solution-header.tsx`
- `src/app/solucoes/corrente-em-dia/quero-conhecer/page.tsx`
- `src/app/c/[slug]/page.tsx`
- `docs/PASSO_A_PASSO_AJUSTES_UI_CORRENTE_EM_DIA.md`

## Arquivos atualizados

- `src/app/solucoes/corrente-em-dia/page.tsx`
- `src/components/admin-page-shell.tsx`

## Como aplicar

1. Faça backup do projeto atual.
2. Extraia o ZIP desta atualização por cima da pasta local do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

3. Rode as validações:

```powershell
npm run lint
npm run build
npm run dev
```

4. Acesse no navegador:

```txt
http://localhost:3000/solucoes/corrente-em-dia
http://localhost:3000/solucoes/corrente-em-dia/quero-conhecer
http://localhost:3000/c/casa-pai-benedito-das-matas
http://localhost:3000/admin/ae/corrente-em-dia
```

## Testes recomendados

### Landing

- Confirmar se o cabeçalho aparece com logo, nome “Corrente em Dia” e botões “Quero Conhecer” e “Já sou Cliente”.
- Confirmar se o subcabeçalho aparece no padrão Automação Extrema.
- Confirmar se não aparece mais o texto “V1 focada em arrecadações, Pix, comprovantes e relatórios simples”.
- Confirmar se os botões “Quero Conhecer” e “Falar no WhatsApp” aparecem logo após o texto inicial.
- Confirmar se o título da seção é “Como funciona”.
- Confirmar se o bloco “Cliente Fundador” substituiu “Piloto Recomendado”.

### Página Quero Conhecer

- Preencher como Federação, Associação e Terreiro.
- Testar envio sem campos obrigatórios.
- Marcar o consentimento LGPD.
- Clicar em “Enviar interesse pelo WhatsApp” e conferir se a mensagem gerada está correta.

### Página pública da organização

- Acessar `/c/casa-pai-benedito-das-matas` após rodar o seed fictício.
- Confirmar se a página não mostra contribuição de outra pessoa.
- Confirmar se existe aviso de privacidade e LGPD.
- Confirmar se “Acessar minha contribuição” direciona para `/login`.

### Mobile

- Validar no celular ou DevTools:
  - cabeçalho sem rolagem horizontal;
  - botões legíveis;
  - subcabeçalho da AE sem quebrar de forma ruim;
  - cards empilhados corretamente;
  - formulário fácil de preencher.

## Observação

Não foi criado SQL novo nesta atualização, pois os ajustes são de interface, navegação e copy. O cadastro real do interesse ainda está operando como primeiro contato via WhatsApp. Se a decisão for gravar esses leads no Supabase, criar uma próxima etapa com tabela e API específica para interessados no Corrente em Dia.

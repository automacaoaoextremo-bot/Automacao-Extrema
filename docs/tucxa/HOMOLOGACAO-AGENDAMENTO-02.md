# Homologação — Tucxa Agendamento 02

## 1. Página pública
Acesse `/solucoes/organizacao-em-harmonia/agendamento` no Preview do Vercel.

No celular, valide sem rolar a tela inicial:
- terceira linha do cabeçalho com **Início / Como funciona / Agendamento / Voltar / Ajuda**;
- identificação **AGENDAMENTO**;
- botão **Agendamento**;
- botão **Ver horários**;
- botão **POR QUE USAR**;
- indicação **CLIQUE PARA ABRIR** nos botões.

Abra **Ver horários** e confirme os três quadros: Chegada, Início dos trabalhos e Atendimentos. O popup deve caber na tela mobile sem rolagem.

Abra **POR QUE USAR** (ou **Como funciona** no cabeçalho) e confirme o quadro “A informação certa precisa chegar à pessoa certa” e os benefícios para Consulente, Recepção e Filhos da Corrente. O popup deve caber na tela mobile sem rolagem.

Confirme que o quadro **Já faz parte desse fluxo?** não aparece mais.

## 2. Rollout Recepção
Após aplicar a migration `20260924170000_oh_tucxa_agendamento_piloto_ajustes_02.sql`:

- uma pessoa com perfil **Recepção** deve conseguir entrar no login único;
- um Consulente deve receber mensagem informando que, nesta etapa, o agendamento é realizado pela Recepção;
- um Cavalinho/Cambono/Coordenador sem Recepção deve receber mensagem de que o acesso ainda não foi liberado nesta etapa.

Antes do piloto, confirme na Base Única/Funções os seis perfis definidos no documento: Mayara, Fatima, Sheila, Leandro, Mariana e Renata. Esses nomes/telefones não são versionados na migration.

## 3. Primeiro acesso
Use um login de Recepção com `must_change_password=true` ou `pilotFirstAccessRequired=true`.

Após informar WhatsApp/e-mail e senha temporária:
- deve abrir popup de primeiro acesso;
- confirmar nome;
- confirmar telefone;
- e-mail é opcional;
- marcar ciência LGPD;
- informar nova senha e confirmação;
- continuar para o painel da Recepção.

A senha temporária não deve ser comparada no frontend nem estar versionada no Git. O popup deve caber no mobile sem exigir rolagem da página.

## 4. Recepção agenda / Consulente confirma
Na Recepção:
- faça um agendamento;
- confirme que o Consulente recebe/tem disponível o link de confirmação;
- abra o link público de confirmação e valide presença.

No autoatendimento do Consulente, tente chamar a ação de reserva: a API deve recusar enquanto `pilotSelfServiceEnabled=false`.

## 5. Validações e acessos de teste
Acesse `/solucoes/organizacao-em-harmonia/cliente/validacoes`.

Valide:
- todos os Filhos da Corrente cadastrados aparecem, mesmo sem pedido de validação pendente;
- cada pessoa mostra **Login criado** ou **Sem login**;
- continuam disponíveis Simular acesso e as ações de aprovação/exclusão de pedido quando houver solicitação pendente;
- quem possui login recebe a ação **Excluir acesso**.

Ao usar **Excluir acesso**:
- confirme a caixa de diálogo;
- o login deve desaparecer;
- o cadastro da pessoa deve permanecer;
- funções e vínculos devem permanecer.

A mesma operação pode ser conferida também pela tela dedicada:
`/solucoes/organizacao-em-harmonia/cliente/atendimento-em-harmonia/acessos-piloto`

Depois execute novamente o provisionamento do piloto para criar um novo login e confirme que o primeiro acesso volta a ser obrigatório.

## 6. Regressão
Antes do push:
```powershell
npm run lint
npm run build
git diff --check
```

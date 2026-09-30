# Homologação — Tucxa Agendamento 03

## 1. Página pública

Acesse `/solucoes/organizacao-em-harmonia/agendamento` no Preview do Vercel.

No mobile, valide que a terceira linha do cabeçalho contém somente:

- Por que usar
- Horários
- Agendamento
- Ajuda

Os quatro itens devem usar o mesmo padrão tipográfico.

Confirme também que:

- o texto abaixo de “Menos dúvida no caminho. Mais clareza para acolher.” está visível;
- os botões aparecem na ordem: **Por que usar → Ver horários → Agendamento**;
- não existe mais o quadro fixo “Segunda e terça: chegada...” na tela principal;
- “Por que usar” abre o respectivo popup;
- “Horários” no cabeçalho e “Ver horários” no quadro abrem o popup de horários;
- “Agendamento” abre o login único;
- “Ajuda” abre o WhatsApp de suporte.

## 2. Validações / Filhos da Corrente

Acesse `/solucoes/organizacao-em-harmonia/cliente/validacoes`.

A lista deve mostrar todos os Filhos da Corrente cadastrados na Base Única e também os acessos já provisionados pelo piloto que ainda estejam com um papel funcional legado.

Verifique especificamente os usuários da Recepção previstos para o piloto. Caso algum ainda não exista na Base Única, execute novamente o provisionamento local com o arquivo `*.local.json`; a interface não cria pessoas a partir de nomes fixos.

Para um usuário com login:

1. clique em **Excluir acesso**;
2. confirme a exclusão;
3. confira que a pessoa continua na lista com **Sem login**;
4. confira na Base Única que cadastro, função e vínculos continuam preservados;
5. execute novamente o provisionamento e confirme que um novo login pode ser criado.

## 3. Migration 03

Aplique `20260925110000_oh_tucxa_agendamento_piloto_ajustes_03.sql` no Supabase.

Ela normaliza acessos já provisionados pelo piloto para o papel-base `Filho da Corrente`, preservando as funções operacionais no perfil.

## 4. Provisionamento

O script `scripts/tucxa-provisionar-agendamento-piloto-01.mjs` agora:

- atualiza o nome pelo arquivo local de provisionamento;
- garante `role_id = Filho da Corrente`;
- preserva as funções operacionais no `agenda_viva_profile`;
- mantém logins existentes sem alterar suas senhas.

Nunca versione o arquivo `*.local.json` nem a senha temporária.

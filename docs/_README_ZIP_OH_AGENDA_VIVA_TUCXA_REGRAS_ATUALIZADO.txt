ZIP atualizado para Organização em Harmonia + Agenda Viva + regras do Tucxa.

Principais entregas:
1. Checklist: "Completar dados da organização" agora aponta para /solucoes/organizacao-em-harmonia/cliente/cadastro.
2. Nova tela Cadastro da Organização.
3. Nova API autenticada para cadastro da organização.
4. Base Única ampliada com vínculos operacionais para Agenda Viva e Atendimento:
   - cavalinho
   - entidades que recebe
   - linhas de trabalho
   - cambono
   - entidades que costuma cambonar
   - cambono volante/reserva
   - apoio na recepção
   - apoio na organização
   - disponibilidade segunda/terça/quarta/quinta
   - grupo 1, grupo 2 ou ambos
   - permissões de aprovar eventos, alterar calendário e ver relatórios
5. Importação CSV ampliada e modelo CSV atualizado.
6. Agenda Viva com visão mobile-first:
   - próximos dias
   - regras operacionais Tucxa
   - vínculos operacionais
   - visão anual compacta inspirada no calendário do Tucxa
   - tipos de atividades iniciais
7. SQL atualizado com agenda_viva_profile em oh_memberships e seeds iniciais para Agenda Viva.
8. Novo passo a passo: docs/PASSO_A_PASSO_ATUALIZACAO_OH_AGENDA_VIVA_TUCXA_REGRAS.md

Validação realizada no sandbox:
- npm run build passou com variáveis dummy de Supabase.
- npm run lint não foi executado no sandbox porque o ZIP não contém eslint.config.*, mas deve ser rodado localmente no projeto completo.

# TUCXA — Agendamentos / Ajustes 02 / V2

## Base e escopo

- Documento: **OeH - Agendamentos-02.docx** (triagem tablet/notebook).
- Branch obrigatória: `fix/tucxa-agendamentos-20261025-v1`.
- Fonte analisada: `tucxa-agendamentos-ajustes-02-fontes-20261025-224409.zip`.
- Commit informado no STATUS-GIT do ZIP: `6c020e7f45e88002b6d3fe1a74327175c65c1998`.
- Arquivo de código modificado: `src/app/solucoes/organizacao-em-harmonia/tucxa/filho-da-corrente/painel/atendimento/agendamento-piloto/page.tsx`.
- **Não** há migração SQL, novas rotas, novas dependências ou variáveis de ambiente nesta atualização.

## Alterações

1. Na Triagem em Caderno ampliada, retirar as três guias Entidade/Consulente/Caderno e os indicadores adicionais de resumo marcados na imagem, conservando o seletor de data, TOTAL NA DATA, ações e campos de busca.
2. **FECHAR** da Triagem ampliada retorna ao **Caderno Compacto**, sem sair do modal Triagem; a data permanece selecionada. O FECHAR seguinte mantém o comportamento anterior do Caderno Compacto.
3. Filtro **Entidades: Todos / A-Z**, com somente as letras iniciais presentes nas entidades com agendamentos ativos na data selecionada. Busca por entidade e busca por consulente continuam independentes. O filtro de letras de Consulentes é preservado nas demais visualizações.
4. Inserir **Ordem de chegada + Salvar** em cada linha do Caderno ampliado, reaproveitando `saveCadernoArrival` e a ação `set-caderno-arrival` da API. Respeita cancelamento, prioridade e triagem finalizada. Ao clicar Salvar sem editar, preserva a ordem atual já cadastrada.

## Instalação

1. Salvar o ZIP do pacote em `C:\Users\lacos\Documents\zips\ae-tucxa-agendamentos-ajustes-02-v2-arquivos-completos.zip`.
2. Salvar `instalar_tucxa_agendamentos_ajustes_02_v2.ps1` em `C:\Users\lacos\Documents\scripts`.
3. Confirmar branch e `git status` limpo no worktree `C:\Users\lacos\Documents\GitHub\automacao-extrema-integracao-tucxa`.
4. Executar o instalador. Ele confere branch, SHA-256 da versão-base, manifesto, integridade dos novos arquivos e cria um backup antes da cópia.
5. Executar `npx eslint` no arquivo alterado, `npx tsc --noEmit` e `npm run build` com Node 24.
6. Fazer commit/push **somente dos dois arquivos**, validar o Preview e então abrir PR para `main`.

## Homologação funcional

- A Triagem compacta continua acessível no celular e exibe ações já homologadas.
- Notebook/tablet: botão *Abrir Triagem em Caderno* mostra painel amplo e sem os controles duplicados.
- Botão FECHAR na visão ampla volta ao Caderno Compacto sem perder a data; o FECHAR do compacta volta ao fluxo anterior.
- Letras disponibilizadas correspondem apenas às iniciais das Entidades que possuem agendamentos ativos naquela data; Todos retira o filtro.
- Entidade acentuada, como **Águas**, aparece na letra A.
- Busca por Consulente e por Entidade funcionam com o filtro alfabético; mudança de data limpa o filtro anterior.
- Ordem + Salvar recuperam o mesmo dado da tela compacta após recarregar; valor vazio e prioridades seguem regras da API existente.
- Não é possível editar Ordem de agendamento cancelado, prioritário ou triagem finalizada.
- As demais ações Chegou, Não Chegou, Trocar Entidade, Reagendar, Cancelar e Definir Prioridade permanecem operacionais.

**ATENÇÃO: O Vercel Preview pode usar o Supabase de produção. Testar alterações de ordem e outras ações com dados de homologação, não com registros reais. Não há implantação automática em Production antes do merge em `main`.**

# TUCXA — Acervo Vivo — Ajustes 03

Branch de trabalho obrigatória:

`feature/tucxa-acervo-vivo-ajustes-01`

Base recebida no ZIP de fontes:

`e9571b6 feat(tucxa): evolui apoio e homologacao do Acervo Vivo`

## Escopo implementado

1. Tela inicial do Acervo Vivo novamente compacta no mobile.
2. Botão **COMO EMPRESTAR UM LIVRO — ABRIR** destacado no primeiro quadro.
3. **Apoio Humano — Fale com a Mariana — ABRIR** permanece compacto e abre popup.
4. Novo quadro compacto **NÃO SABE POR ONDE COMEÇAR? / CONHEÇA AS TRILHAS / ABRIR**.
5. O quadro das Trilhas abre um popup explicativo antes de abrir a lista de Trilhas.
6. Os acessos Descobrir, Trilhas, Meus livros, Clube do Livro e Grupo de Estudos continuam logo abaixo, priorizando visualização sem rolagem desnecessária no celular.
7. Gestor Biblioteca ganhou configuração **Oferecer teste de uso após o empréstimo**.
8. Quando essa opção está habilitada, após um empréstimo concluído a pessoa pode responder, opcionalmente, às mesmas questões estruturadas da homologação.
9. A resposta do participante é vinculada ao empréstimo e contabilizada nos mesmos Resultados da Homologação.
10. Apenas uma resposta pós-empréstimo é permitida por empréstimo.

## Arquivos alterados

- `src/lib/organizacao-em-harmonia/acervo-vivo.ts`
- `src/app/api/organizacao-em-harmonia/cliente/acervo-vivo/route.ts`
- `src/app/api/organizacao-em-harmonia/site-tucxa/acervo-vivo/route.ts`
- `src/app/solucoes/organizacao-em-harmonia/cliente/acervo-vivo/page.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-public-reader.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-homologacao-manager.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-reader.tsx`

## Arquivos novos

- `src/components/organizacao-em-harmonia/acervo-vivo-homologacao-self-form.tsx`
- `supabase/migrations/20260916223000_oh_tucxa_acervo_vivo_homologacao_pos_emprestimo.sql`

## Banco de dados

A migration nova adiciona `loan_id` em `oh_acervo_homologations` e cria um índice único para impedir duas homologações pós-empréstimo para o mesmo empréstimo.

Ela pressupõe que a migration dos Ajustes 02 já esteja aplicada:

`20260916073000_oh_tucxa_acervo_vivo_homologacao.sql`

A nova configuração de habilitar/desabilitar a homologação após o empréstimo é armazenada no `metadata` de `oh_acervo_settings`; portanto não foi criada uma coluna extra apenas para essa preferência.

## Segurança do fluxo

- A opção pós-empréstimo fica **desabilitada por padrão**.
- Somente o Gestor Acervo Vivo - Biblioteca consegue alterar essa configuração na área de gestão.
- O participante só consegue registrar uma homologação vinculada a um empréstimo pertencente ao próprio cadastro autenticado.
- O sistema impede duplicidade pelo `loan_id` tanto na API quanto no índice único do banco.
- Respostas enviadas pelo participante ficam marcadas em `ai_metadata` como `submitted_by_participant=true`.

## Variáveis de ambiente

Nenhuma variável nova foi criada.

A funcionalidade pós-empréstimo não depende de IA, `OPENAI_API_KEY`, OCR ou transcrição.

## Vercel

- Nenhuma alteração em `vercel.json`.
- Nenhum cron novo.
- Nenhuma variável nova de ambiente.
- Depois do push da branch, aguarde o Preview Deployment ficar `Ready` e faça a homologação pelo celular.

## Validação já realizada neste pacote

Os arquivos TypeScript/TSX alterados e novos foram submetidos ao parser/transpilador do TypeScript 5.8.3 sem erros de sintaxe.

Ainda é obrigatório executar no repositório completo antes do commit:

```powershell
npm run lint
npm run build
```

## Checklist funcional sugerido

### Tela pública/mobile

1. Abrir o Acervo Vivo.
2. Fechar o tutorial automático.
3. Conferir o primeiro quadro compacto.
4. Tocar em `COMO EMPRESTAR UM LIVRO — ABRIR`.
5. Fechar o passo a passo.
6. Tocar em `Apoio Humano — ABRIR` e validar popup da Mariana.
7. Tocar em `CONHEÇA AS TRILHAS — ABRIR`.
8. No popup, tocar em `Abrir as Trilhas`.
9. Confirmar que Descobrir, Trilhas, Meus livros, Clube do Livro e Grupo de Estudos permanecem visíveis logo abaixo.

### Gestão

1. Entrar como `Gestor Acervo Vivo - Biblioteca`.
2. Abrir `Visão > Fluxo self-service`.
3. Confirmar a nova opção `Oferecer teste de uso após o empréstimo`.
4. Salvar com a opção desabilitada e confirmar que o leitor não recebe convite após empréstimo.
5. Habilitar e salvar.

### Pós-empréstimo

1. Entrar com um Filho da Corrente ou Consulente.
2. Concluir um empréstimo.
3. Na tela `Obrigado!`, confirmar o botão `Participar do teste de uso (opcional)`.
4. Preencher todas as etapas e perguntas finais.
5. Enviar.
6. Confirmar a mensagem de agradecimento.
7. Como Gestor, abrir `Homologação > Resultados` e conferir que a resposta aparece com origem `participante após empréstimo`.
8. Tentar responder novamente para o mesmo empréstimo e confirmar o bloqueio de duplicidade.

# Tucxa — Acervo Vivo — Ajustes 02

## Escopo implementado

1. Botão **Precisa de ajuda? Fale com a Mariana** mais destacado no tutorial.
2. Apoio Humano transformado em um bloco compacto que abre popup; o conteúdo principal do Acervo fica mais compacto no mobile.
3. Remoção do feedback público por WhatsApp como mecanismo de homologação.
4. Nova área **Homologação** somente para **Gestor Acervo Vivo - Biblioteca**.
5. Roteiro e ficha unificados no sistema.
6. Seleção obrigatória de participante já cadastrado.
7. Cadastro incluído como etapa da homologação do empréstimo.
8. Perguntas finais estruturadas para contabilização automática.
9. Entrada manual, por foto da ficha ou por áudio; foto/áudio geram rascunho automático quando a integração de IA está disponível.
10. Resultados consolidados na própria Gestão do Acervo Vivo.

## Arquivos alterados

- `src/app/api/organizacao-em-harmonia/cliente/acervo-vivo/route.ts`
- `src/app/solucoes/organizacao-em-harmonia/cliente/acervo-vivo/page.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-public-reader.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-reader.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-support-card.tsx`
- `src/lib/organizacao-em-harmonia/acervo-vivo-support.ts`

## Arquivos novos

- `src/components/organizacao-em-harmonia/acervo-vivo-homologacao-manager.tsx`
- `supabase/migrations/20260916073000_oh_tucxa_acervo_vivo_homologacao.sql`
- `docs/acervo-vivo-ajustes-02/ROTEIRO-FICHA-HOMOLOGACAO-UNIFICADOS.md`
- `docs/acervo-vivo-ajustes-02/LEIA-ME-IMPLEMENTACAO.md`

## Banco de dados

A migration cria:

- tabela `oh_acervo_homologations`;
- bucket privado `tucxa-acervo-vivo-homologacao` para foto/áudio de evidência.

## Integração de IA

O preenchimento manual funciona sem IA.

Para extração automática a implementação reutiliza `OPENAI_API_KEY`, já utilizada pelo fluxo de descrição de livros. Também aceita, opcionalmente:

- `OPENAI_ACERVO_HOMOLOGATION_MODEL`;
- `OPENAI_ACERVO_TRANSCRIBE_MODEL`.

Se a chave não estiver configurada, a evidência é armazenada e o Gestor pode preencher a homologação manualmente.

## Ordem de implantação

1. Aplicar a migration no Supabase.
2. Copiar os arquivos de `src` e `docs`.
3. Executar `npm run lint`.
4. Executar `npm run build`.
5. Commit/push na branch `feature/tucxa-acervo-vivo-ajustes-01`.
6. Homologar o Preview Deployment no Vercel.

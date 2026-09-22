# Automação Extrema — Impacto no Controle — Sementinha — InC-03

Base recebida:
- branch: `feature/impacto-no-controle-sementinha-v1`
- commit: `6cd69e4a3e479c3d71fbdec86785357d9c6fc7ac`
- working tree indicada no pacote: limpa

## Implementado

### 1. Cabeçalho da campanha mais compacto
- `60 números` e `R$ 10,00 cada` foram movidos para a mesma faixa visual do texto introdutório.
- Em telas muito estreitas existe fallback responsivo para não esmagar o conteúdo.

### 2. Foto correta como 1 de 8
A foto indicada no documento é `bike-03.jpeg`.
- A página também prioriza essa imagem para a campanha do Sementinha.
- Foi criada migration de dados para tornar `bike-03.jpeg` a imagem principal e a primeira da galeria.
- A ordem passa a ser: 03, 01, 02, 04, 05, 06, 07, 08.

### 3. Carrossel mais baixo
O palco da galeria passa a usar proporção próxima à própria foto horizontal (`20 / 9`), removendo o excesso de espaço vertical que aparecia acima e abaixo.

### 4. Botão PARTICIPE
Logo após o card de fotos existe um botão `PARTICIPE`.
Ele abre o fluxo real de participação em popup.

### 5. Fluxo guiado real
O popup reutiliza o backend já existente de reserva.

#### Tela 1 — Regras da ação
- FECHAR no topo;
- regras reais da campanha;
- TIRAR DÚVIDA;
- CONTINUAR.

#### Tela 2 — Escolha dos números
- números disponíveis/reservados/confirmados;
- seleção real dos números;
- total da participação;
- cotas extras, quando existirem;
- TIRAR DÚVIDA;
- CONTINUAR.

#### Tela 3 — Dados
- Nome;
- Celular com DDD;
- E-mail opcional;
- consentimento;
- resumo do próximo passo;
- TIRAR DÚVIDA;
- `Reservar números e gerar Pix`.

Ao confirmar, o fluxo continua usando `/api/impacto-no-controle/reservations` e redireciona à tela Pix já existente.

### 6. Acompanhamento logo após PARTICIPE
O card de acompanhamento ficou imediatamente depois do botão PARTICIPE e mostra:
- valor confirmado;
- impacto estimado;
- barra da meta;
- meta ideal;
- meta estendida, quando configurada.

### 7. Informações complementares
O antigo botão `Como participar` foi removido da seção complementar porque o novo botão PARTICIPE já executa o fluxo guiado real.
Continuam disponíveis, quando houver conteúdo:
- Sobre a bicicleta;
- Regulamento.

## Arquivos alterados
- `src/app/solucoes/impacto-no-controle/acao/[slug]/page.tsx`
- `src/app/solucoes/impacto-no-controle/impacto.css`
- `src/components/impacto-no-controle/CampaignParticipation.tsx`
- `src/components/impacto-no-controle/CampaignInfoGuide.tsx`

## Arquivo novo
- `supabase/migrations/20260919213000_impacto_no_controle_sementinha_inc03.sql`

## Banco / Vercel
- nova migration Supabase: **sim**
- nova tabela: **não**
- nova coluna: **não**
- nova variável Vercel: **não**
- alterações nas variáveis PIX_*: **não**

## Validação já realizada
Os arquivos TS/TSX alterados foram processados pelo parser/transpilador TypeScript 5.8.3 sem erros de sintaxe.

No repositório completo execute obrigatoriamente:

```powershell
npm run lint
npm run build
```

## Homologação sugerida
1. Aplicar a migration InC-03.
2. Abrir a campanha no celular.
3. Confirmar `bike-03.jpeg` como Foto 1 de 8.
4. Confirmar redução dos espaços do carrossel.
5. Conferir quantidade/preço ao lado do texto introdutório.
6. Clicar PARTICIPE.
7. Tela Regras: testar FECHAR, TIRAR DÚVIDA e CONTINUAR.
8. Selecionar números reais e tocar CONTINUAR.
9. Preencher Nome, Celular, E-mail e consentimento.
10. Tocar `Reservar números e gerar Pix`.
11. Confirmar que o fluxo segue para a tela Pix.
12. Voltar à campanha e validar o card de andamento logo abaixo de PARTICIPE.

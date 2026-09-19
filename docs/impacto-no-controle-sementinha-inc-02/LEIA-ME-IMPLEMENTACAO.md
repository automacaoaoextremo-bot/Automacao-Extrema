# Automação Extrema — Impacto no Controle — Sementinha — InC-02

Base recebida:
- branch: `feature/impacto-no-controle-sementinha-v1`
- commit: `05079ee5b07c29179094fe5c0ad24c0c81471397`
- working tree indicada no pacote: limpa

## Implementado

### Popup inicial
- remove o selo `Primeira visita`;
- remove o parágrafo introdutório longo indicado no AE - InC-02;
- troca o `X` por botão textual `FECHAR`;
- compacta o conteúdo para mobile;
- mantém três passos curtos: Reserve, Faça o Pix e Comprove;
- inclui `COMEÇAR`, que fecha o popup e leva à área de participação;
- mantém suporte e `Não mostrar novamente neste navegador`.

### Cabeçalho público da rifa
- na página da campanha, o cabeçalho usa logo/nome do cliente (`Sementinha`);
- os botões `Cliente` e `Gestão` ficam ocultos na página pública da rifa;
- as demais páginas do Impacto no Controle continuam podendo usar o cabeçalho genérico.

### Galeria da bicicleta
- cria `CampaignGallery.tsx`;
- usa `main_image_url` como primeira imagem;
- deduplica a foto principal caso também esteja em `gallery_images`;
- mostra uma foto por vez;
- oferece setas e indicadores;
- no seed atual, a primeira imagem continua sendo `bike-01.jpeg`, conforme a campanha já cadastrada.

### Informações guiadas
- cria `CampaignInfoGuide.tsx`;
- substitui blocos longos abertos na página por botões:
  - Como participar;
  - Sobre a bicicleta;
  - Regulamento.
- `Como participar` abre fluxo passo a passo com:
  - VOLTAR;
  - SEGUIR;
  - PARTICIPAR AGORA na última etapa.
- o último botão fecha o guia e rola até a área real de participação.

## Arquivos alterados
- `src/app/solucoes/impacto-no-controle/acao/[slug]/page.tsx`
- `src/app/solucoes/impacto-no-controle/impacto.css`
- `src/components/impacto-no-controle/PublicHeader.tsx`
- `src/components/impacto-no-controle/CampaignIntroModal.tsx`

## Arquivos novos
- `src/components/impacto-no-controle/CampaignGallery.tsx`
- `src/components/impacto-no-controle/CampaignInfoGuide.tsx`

## Banco / Vercel
- nova migration Supabase: **não**
- nova tabela/coluna: **não**
- nova variável Vercel: **não**
- alteração em `vercel.json`: **não**
- alterações nas variáveis `PIX_*`: **não**

## Validação realizada
Os arquivos TS/TSX alterados/novos foram processados pelo parser/transpilador TypeScript 5.8.3 sem erros de sintaxe.

No repositório completo execute obrigatoriamente:
```powershell
npm run lint
npm run build
```

## Homologação sugerida
1. Abra a campanha da rifa em um celular.
2. Confira popup sem `Primeira visita` e sem o parágrafo longo.
3. Confira `FECHAR` no canto superior.
4. Valide se o popup cabe sem rolagem em aparelhos de altura normal.
5. Clique `COMEÇAR` e confira o deslocamento para participação.
6. Reabra a campanha e confira o cabeçalho com identidade do Sementinha.
7. Confirme ausência de `Cliente` e `Gestão`.
8. Teste setas/indicadores da galeria e confirme `bike-01` primeiro.
9. Abra `Como participar` e percorra todas as etapas com `SEGUIR`.
10. Teste `Sobre a bicicleta` e `Regulamento`.
11. Na última etapa use `PARTICIPAR AGORA`.
12. Faça uma reserva real de homologação para garantir que o fluxo anterior não regrediu.

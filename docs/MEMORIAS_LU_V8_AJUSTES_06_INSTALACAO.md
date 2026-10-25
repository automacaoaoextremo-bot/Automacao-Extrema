# Memórias que Encantam — V8 / Ajustes 06

**Projeto:** Livro Musical da Lu (2026)  
**Branch:** `fix/memorias-lu-20261025-v1`  
**Base do pacote:** fonte recebida no ZIP `memorias-lu-ajustes-06-fontes-20261025-174611.zip`, commit `40cc964c`.  
**Escopo:** apenas três arquivos de código da solução; uma documentação nova.

## Ajustes realizados

1. **QR Codes:** em `Gerar QR Codes > Abrir pré-visualização`, clicar em **FECHAR** retorna para `QR Codes do livro`, preservando a seleção anterior. Um segundo FECHAR fecha a janela inteira. ESC segue o mesmo fluxo.
2. **Página pública:** retirado o selo `📱 feito para o celular` sem afetar as outras etiquetas.
3. **Ouvir todas:** novo cartão `Ouça todas as músicas`, imediatamente abaixo de `Escolha uma música`. Abre um player contínuo das 12 canções na ordem persistida por `ae_education_track_order`, com Reproduzir/Pausar, Anterior/Próxima, progresso e Recomeçar. Ao encerrar, interrompe o áudio.

## Reprodução e segurança

- O visitante precisa tocar em **Reproduzir** para começar; isso evita bloqueios de autoplay inicial em navegadores móveis.
- Quando uma gravação termina, o player renova os links assinados via `GET /api?view=public` antes da faixa seguinte, pois os URLs do Supabase expiram após cinco minutos.
- O player respeita `media_authorized`, `family_released` e a prévia docente já estabelecidas pela API existente. Sem publicação autorizada, permanece a demonstração atual.
- Se uma gravação selecionada estiver indisponível, não exibe outra gravação como substituta: informa o problema e permite avançar manualmente.
- Alguns aparelhos bloqueiam autoplay nas transições assíncronas; nesse caso, o player orienta tocar novamente em Reproduzir.

## Instalação

1. Confirmar `fix/memorias-lu-20261025-v1` e árvore limpa. Antes de aplicar o pacote, sincronizar a branch com `origin/main` por `git merge --ff-only origin/main` se possível.
2. Executar `instalar_memorias_lu_v8_ajustes_06.ps1` com o ZIP do pacote.
3. Testar: `npx eslint src/components/education src/lib/education src/app/solucoes/memorias-que-encantam`, `npx tsc --noEmit`, `npm run build`.
4. Adicionar apenas os três arquivos alterados e este documento; revisar `git diff --cached --check`, fazer commit e push na branch de correção.
5. Homologar em Vercel Preview em Android/iOS, incluindo cenário de 12 faixas, mudança de ordenação e bloqueio por permissões.
6. Abrir PR de `fix/memorias-lu-20261025-v1` para `main`, revisar e publicar somente após aprovação.

## Validação

O pacote possui hashes SHA-256 e os arquivos TypeScript/TSX passaram na verificação sintática do transpiler TypeScript. O build integral **não foi executado com sucesso neste ambiente**: o projeto requer Node.js 24 e a instalação de dependências não concluiu. É obrigatório validar no ambiente Windows antes de publicar.

## Sem mudanças de infraestrutura

Não há novas migrations, dependências npm ou variáveis Vercel. Não incluímos dados de docentes, credenciais, mídias reais nem URLs assinados.

# Memórias que Encantam — V5 / Ajustes 03

Base: `memorias-lu-ajustes-03-fontes-20261025-083122.zip`.
Branch EXATA: `feature/memorias-que-encantam-lu-piloto-v1`.
Worktree: `C:\Users\lacos\Documents\Github\automacao-extrema-memorias`.

## Entrega
- Página pública com espaçamento mobile equilibrado, distribuindo o conteúdo principal pela altura disponível, sem cortar conteúdos em telas pequenas.
- Primeiro acesso com cabeçalho verde, dados pessoais, aceite, nova senha e confirmação. Senha inicial NÃO é solicitada novamente.
- Sessão de primeiro acesso assinada de até 15 minutos, criada SOMENTE após login com credencial válida. Após conclusão, rotação da versão da sessão e sessão normal de 12h.
- Nova senha deve conter 10–128 caracteres, letras e números, e ser diferente da senha anterior.
- Sem migração SQL nova nem novas variáveis.

## Instalação
1. Confirme o worktree e a branch `feature/memorias-que-encantam-lu-piloto-v1`.
2. Execute o instalador com ZIP e worktree limpo; ele cria backup fora do repositório.
3. Execute `npx eslint src/lib/education src/components/education src/app/solucoes/memorias-que-encantam`, `npx tsc --noEmit` e `npm run build`.
4. Revise `git status` e `git diff --check`, `git diff --stat` e garanta que não há .env nem dados infantis.
5. Commit + push apenas na branch da Lu, valide Vercel Preview e depois abra PR para main (sem trazer Bingo/TUCXA).

## Testes importantes
- Página em Chrome Android / Safari iOS em 360×740, 390×844 e 375×667; se a fonte estiver ampliada, rolagem deve ser possível e não cortar conteúdo.
- Primeiro login com senha temporária -> página troca de senha SEM campo “senha temporária”.
- Nova senha fraca, senha atual repetida, confirmação divergente e aceite ausente devem falhar.
- Após troca a sessão normal permite entrar na curadoria; nova visita deve pedir a nova senha.
- Teste logout, sessão inicial expirada >15min, POST sem cookie, POST sem Origin válido e POST com sessão já ativada (não deve alterar senha).
- Não usar senha real em prints/logs/tickets.

## Segurança
O cookie do primeiro acesso é HttpOnly, SameSite=Lax e assinado; autenticação só ocorre após validação da senha. Se o usuário não concluir em 15 minutos, deverá realizar o login novamente. Não exponha tokens ou chaves em código nem altere produção antes da homologação.

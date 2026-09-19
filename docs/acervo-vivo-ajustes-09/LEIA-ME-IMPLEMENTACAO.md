# Tucxa — Acervo Vivo — Ajustes 09

Base recebida:
- branch: `feature/tucxa-acervo-vivo-ajustes-01`
- commit: `729e1b33376d91a69f5f1e4691897af3861d29dd`
- working tree indicada no pacote: limpa

## Implementado

### 1. Código da reserva nas telas
O sistema passou a exibir uma referência amigável derivada do UUID da própria reserva, no formato:

`RSV-XXXXXXXX-XXXX`

Esse código não exige coluna nova no banco e continua deterministicamente ligado ao `id` real da reserva.

- Na tela `Confirmar reserva`, antes de a reserva existir, é informado que o código será gerado automaticamente após a confirmação.
- Na tela `Obrigado!`, o código real é exibido.
- Em `Meus livros > Reservas`, o mesmo código aparece junto da reserva.

### 2. E-mail de cancelamento
Além de:
- `Enviar e-mail`
- `Falar pelo WhatsApp`

o e-mail agora inclui o botão:

- `Acessar o Acervo Vivo`

apontando para a página pública do Acervo Vivo.

### 3. Fechar nas subtelas de Inventário
Quando o Gestor estiver em uma subtela do Inventário — criar, selecionar, conferir, revisar, histórico ou excluir — o botão `Fechar` volta para o menu principal do Inventário.

O botão `Voltar` continua servindo para navegação mais granular, por exemplo:
- exemplar -> categoria;
- categoria -> menu do Inventário.

### 4. Excluir inventário
Foi incluída a opção:

`7. Excluir inventário`

A tela lista os inventários registrados e permite exclusão com confirmação forte.

A exclusão:
- remove a sessão de inventário;
- remove automaticamente seus scans/conferências pelo `ON DELETE CASCADE` já existente;
- não exclui títulos, livros ou exemplares;
- não desfaz alterações já aplicadas ao estado dos exemplares;
- limpa referências de `last_inventory_session_id` e `inventory_added_during_session_id` quando apontarem para a sessão excluída;
- registra auditoria `inventario_excluido`.

Não foi necessária migration.

### 5. Google Maps nos e-mails de reserva
Nos e-mails enviados ao leitor quando a reserva é confirmada ou fica disponível para retirada, o endereço continua sendo apresentado e o acesso ao mapa agora aparece como botão:

`Abrir no Google Maps`

O e-mail em texto simples continua contendo a URL completa.

## Arquivos alterados
- `src/components/organizacao-em-harmonia/acervo-vivo-public-reader.tsx`
- `src/components/organizacao-em-harmonia/acervo-vivo-reader.tsx`
- `src/app/solucoes/organizacao-em-harmonia/cliente/acervo-vivo/page.tsx`
- `src/app/api/organizacao-em-harmonia/cliente/acervo-vivo/route.ts`
- `src/lib/organizacao-em-harmonia/acervo-vivo-notifications.ts`

## Banco / Vercel
- nova migration Supabase: **não**
- nova tabela: **não**
- nova coluna: **não**
- nova variável Vercel: **não**
- novo cron: **não**
- alteração em `vercel.json`: **não**

## Validação feita no pacote
Os 5 arquivos TS/TSX foram processados pelo parser/transpilador do TypeScript 5.8.3 sem erros de sintaxe.

No repositório completo execute obrigatoriamente:

```powershell
npm run lint
npm run build
```

## Homologação sugerida
1. Faça uma reserva pelo leitor público.
2. Na confirmação prévia, confira a mensagem de que o código será gerado após confirmar.
3. Confirme e valide o código `RSV-...` na tela `Obrigado!`.
4. Entre no perfil logado e confira o mesmo padrão em `Meus livros > Reservas`.
5. Cancele uma reserva como Gestor e valide o botão `Acessar o Acervo Vivo`.
6. Faça uma nova reserva e confira o botão `Abrir no Google Maps` no e-mail.
7. Abra Gestão > Inventário.
8. Entre em cada subtela e use `Fechar`; deve voltar ao menu do Inventário.
9. Abra `7. Excluir inventário`, exclua um inventário de teste e confirme que livros/exemplares permanecem.

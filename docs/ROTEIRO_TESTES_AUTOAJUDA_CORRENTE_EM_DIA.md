# Roteiro de testes — Corrente em Dia autoajuda e checklist

## 1. Fluxo site → obrigado → WhatsApp

1. Acessar `/solucoes/corrente-em-dia/quero-conhecer`.
2. Preencher Nome do contato, WhatsApp e E-mail.
3. Enviar interesse.
4. Confirmar redirecionamento para `/solucoes/corrente-em-dia/obrigado`.
5. Clicar em **Continuar seu cadastro pelo WhatsApp**.
6. Confirmar que a mensagem pré-preenchida contém nome, e-mail, WhatsApp e código do lead.

## 2. BotConversa

1. Enviar a mensagem pré-preenchida.
2. Confirmar que o fluxo `CED - Lead vindo do site V2` inicia.
3. Confirmar etiquetas aplicadas.
4. Executar Bloco de Integração para `/api/corrente-em-dia/leads/lookup`.
5. Confirmar retorno com `found: true`.
6. Confirmar que o BotConversa envia link de login e e-mail usado.
7. Responder `AJUDA`.
8. Confirmar menu de suporte.

## 3. Login e primeiros passos

1. Acessar `/solucoes/corrente-em-dia/login`.
2. Entrar com o usuário do lead.
3. Confirmar acesso ao painel.
4. Confirmar card de checklist no painel.
5. Acessar `/solucoes/corrente-em-dia/cliente/primeiros-passos`.
6. Confirmar fluxo de 5 etapas e checklist.

## 4. Checklist

Validar cada item:

1. Completar dados da organização.
2. Informar chave Pix.
3. Definir valor padrão.
4. Definir dia de contribuição.
5. Revisar funções e permissões.
6. Cadastrar/importar contribuintes.
7. Criar acessos.
8. Fazer contribuição de teste.
9. Aprovar comprovante de teste.

O percentual do checklist deve evoluir conforme dados forem preenchidos.

## 5. Ajuda contextual

Verificar se cada tela possui ajuda rápida:

- Cadastro
- Configurações
- Contribuintes
- Contribuir
- Aprovações

## 6. Mobile

Testar no celular:

- menu horizontal do cabeçalho;
- cards do checklist;
- formulários;
- botões principais;
- página Primeiros Passos;
- botão WhatsApp.

## 7. Build/lint

Executar:

```powershell
npm run lint
npm run build
```

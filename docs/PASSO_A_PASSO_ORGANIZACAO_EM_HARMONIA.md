# Organização em Harmonia — implementação mastigada

## 1. Arquitetura funcional recomendada da suíte

### Guarda-chuva comercial

**Organização em Harmonia** é a solução completa da Automação Extrema para organizações que precisam centralizar rotina, pessoas, permissões, agenda, atendimentos e contribuições.

### Núcleo interno

**Base Única** é o núcleo compartilhado. Ela não é apresentada como módulo comercial separado no primeiro momento, mas como diferencial estrutural da suíte.

Ela concentra:

- organizações;
- pessoas;
- contatos;
- funções;
- permissões;
- vínculos;
- módulos habilitados;
- consentimentos;
- auditoria.

### Módulos comerciais

1. **Corrente em Dia**
   - contribuições;
   - Pix;
   - comprovantes;
   - aprovações;
   - lembretes;
   - prestação de contas.

2. **Atendimento em Harmonia**
   - recepção;
   - fila;
   - agenda de atendimento;
   - check-in;
   - retornos;
   - encaixes;
   - cambonos;
   - status do atendimento.

3. **Agenda Viva**
   - calendário único;
   - atividades;
   - recorrências;
   - responsáveis;
   - aprovações;
   - conflitos;
   - comunicação interna.

## 2. Estrutura de menus

### Público

Na página pública:

- Quero Conhecer
- Já sou Cliente
- Visão
- Módulos
- Base Única
- Benefícios
- Como Funciona
- Cliente Fundador

### Área logada desktop

Seguir o padrão do Bazar no Controle:

- cabeçalho superior;
- faixa “Desenvolvido por”;
- menu superior de módulos;
- menu lateral esquerdo para opções internas;
- conteúdo principal à direita.

### Área logada mobile

Seguir o padrão do Corrente em Dia:

- cabeçalho fixo;
- menu em pílulas no cabeçalho;
- sem menu lateral;
- conteúdo em cards de uma coluna.

## 3. Estrutura da Base Única

A Base Única precisa evitar que o mesmo cliente cadastre a mesma pessoa várias vezes.

### Tabelas recomendadas

```txt
oh_organizations
oh_people
oh_roles
oh_permissions
oh_role_permissions
oh_memberships
oh_module_settings
oh_audit_logs
```

### Regras principais

- Uma organização pode ter vários módulos habilitados.
- Uma pessoa pode ter uma ou mais funções.
- Uma função pode ter permissões diferentes por módulo.
- O cliente define quem aprova calendário, atendimento, contribuição e alterações críticas.
- A auditoria deve registrar ações sensíveis.

## 4. Formulário único de Quero Conhecer

Rota:

```txt
/solucoes/organizacao-em-harmonia/quero-conhecer
```

Parâmetros:

```txt
?modulo=corrente-em-dia
?modulo=atendimento-em-harmonia
?modulo=agenda-viva
```

Sem parâmetro, a opção padrão é:

```txt
Organização em Harmonia — solução completa
```

Campos:

- Solução de interesse
- Nome do contato
- WhatsApp
- E-mail
- Nome da organização opcional
- LGPD opcional no primeiro contato
- Interesse Cliente Fundador opcional no primeiro contato

O envio deve:

1. gravar lead em `oh_leads`;
2. enviar e-mail de confirmação;
3. abrir página Obrigado;
4. orientar continuidade pelo WhatsApp;
5. levar no WhatsApp nome, e-mail, WhatsApp, código do lead e solução de interesse.

## 5. Página Obrigado

A página deve orientar:

- continuar pelo WhatsApp;
- procurar o e-mail em spam/lixo eletrônico se não encontrar;
- não preencher novamente o formulário;
- usar o WhatsApp como canal principal para validação.

## 6. BotConversa

Fluxo único:

```txt
OH - Lead vindo do site
```

No início, usar mensagem fixa segura. Depois que a API preencher `oh_resp_botconversa`, usar o campo personalizado.

## 7. Supabase

Rodar o SQL:

```txt
supabase/sql/20260628_15_organizacao_em_harmonia_base_unica.sql
```

Esse SQL cria ou complementa a Base Única.

## 8. GitHub

Branch recomendada:

```txt
feature/organizacao-em-harmonia
```

## 9. Vercel

Após push, validar deploy preview. Só promover para produção quando:

- lint OK;
- build OK;
- formulário OK;
- e-mail OK;
- WhatsApp OK;
- páginas públicas OK;
- mobile OK.

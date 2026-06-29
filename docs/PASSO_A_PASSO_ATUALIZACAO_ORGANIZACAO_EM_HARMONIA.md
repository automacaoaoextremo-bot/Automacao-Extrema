# Passo a passo de atualização — Organização em Harmonia

## 1. Objetivo desta atualização

Esta atualização ajusta a Organização em Harmonia para seguir a estratégia definida:

- Organização em Harmonia = suíte completa.
- Corrente em Dia, Atendimento em Harmonia e Agenda Viva = módulos comerciais.
- Base Única = núcleo interno compartilhado de pessoas, funções, permissões e módulos habilitados.
- Quero Conhecer = formulário único, com interesse pré-selecionado por módulo.
- Cliente Fundador = padronizado visualmente no mesmo modelo do Corrente em Dia.
- Página pública sem citar “Oceano Azul”; o conceito fica como estratégia interna.
- Área logada preparada com menu lateral no desktop e menu no cabeçalho no mobile.

## 2. Arquivos principais alterados

```txt
src/lib/organizacao-em-harmonia.ts
src/components/organizacao-em-harmonia-landing.tsx
src/components/organizacao-client-shell.tsx
src/app/solucoes/organizacao-em-harmonia/page.tsx
src/app/solucoes/organizacao-em-harmonia/quero-conhecer/page.tsx
src/app/solucoes/organizacao-em-harmonia/quero-conhecer/lead-form.tsx
src/app/solucoes/organizacao-em-harmonia/obrigado/page.tsx
src/app/solucoes/organizacao-em-harmonia/cliente/page.tsx
src/app/solucoes/organizacao-em-harmonia/cliente/base-unica/page.tsx
src/app/solucoes/organizacao-em-harmonia/cliente/modulos/page.tsx
src/app/solucoes/organizacao-em-harmonia/cliente/configuracoes/page.tsx
src/app/solucoes/organizacao-em-harmonia/cliente/relatorios/page.tsx
src/app/solucoes/atendimento-em-harmonia/page.tsx
src/app/solucoes/agenda-viva/page.tsx
```

## 3. Atualização local

Na pasta do projeto:

```powershell
cd C:\Users\lacos\Documents\GitHub\automacao-extrema
```

Faça backup:

```powershell
Compress-Archive -Path .\* -DestinationPath ..\automacao-extrema-backup-antes-oh-ajustes.zip -Force
```

Extraia o ZIP atualizado por cima do projeto.

Depois rode:

```powershell
npm run lint
npm run build
npm run dev
```

## 4. Rotas para testar localmente

```txt
http://localhost:3000/solucoes/organizacao-em-harmonia
http://localhost:3000/solucoes/atendimento-em-harmonia
http://localhost:3000/solucoes/agenda-viva
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=corrente-em-dia
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=atendimento-em-harmonia
http://localhost:3000/solucoes/organizacao-em-harmonia/quero-conhecer?modulo=agenda-viva
http://localhost:3000/solucoes/organizacao-em-harmonia/cliente
```

## 5. Supabase

Se a base `oh_*` ainda não existir no projeto, rode o SQL da Organização em Harmonia já entregue anteriormente.

A estrutura recomendada para próximas evoluções é:

```txt
oh_organizations
oh_people
oh_roles
oh_permissions
oh_role_permissions
oh_memberships
oh_leads
agv_events
agv_event_approvals
aeh_service_days
aeh_attendance_requests
```

Nesta atualização visual/arquitetural, não há SQL destrutivo obrigatório.

## 6. GitHub

Usar a branch específica:

```powershell
git checkout feature/organizacao-em-harmonia
```

Se ainda não existir:

```powershell
git checkout -b feature/organizacao-em-harmonia
```

Depois:

```powershell
git status
git add .
git commit -m "Ajusta Organizacao em Harmonia com Base Unica e padroes de modulos"
git push origin feature/organizacao-em-harmonia
```

## 7. Vercel

Após o push, se a branch estiver conectada à Vercel, aguarde o deploy preview.

Para forçar produção somente quando validado:

```powershell
npx vercel --prod
```

## 8. BotConversa

Manter fluxo único:

```txt
OH - Lead vindo do site
```

Usar palavras-chave com condição **Contém**:

```txt
Organização em Harmonia
Corrente em Dia
Atendimento em Harmonia
Agenda Viva
Cliente Fundador
Quero conhecer
Preenchi o Quero Conhecer
```

Enquanto a API não preencher `oh_resp_botconversa` de forma confiável, usar mensagem fixa segura no bloco do fluxo.

Depois de validar API e campos, trocar para:

```txt
{oh_resp_botconversa}
```

## 9. Checklist de validação

- Página principal não cita “Oceano Azul”.
- Benefícios aparecem em cards claros.
- Cliente Fundador segue padrão do Corrente em Dia.
- Quero Conhecer segue padrão do Corrente em Dia.
- O seletor não mostra “Pacote Completo” separado de Organização em Harmonia.
- Páginas dos módulos apontam para a solução completa.
- Base Única aparece como núcleo interno compartilhado.
- Desktop da área logada tem menu lateral.
- Mobile da área logada mantém menu fixo no cabeçalho.

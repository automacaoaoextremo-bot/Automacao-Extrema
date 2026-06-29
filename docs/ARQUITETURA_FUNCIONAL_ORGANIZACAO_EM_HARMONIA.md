# Arquitetura funcional recomendada — Organização em Harmonia

## 1. Visão geral

**Organização em Harmonia** é a suíte comercial da Automação Extrema. Ela não deve ser tratada como “mais um sistema”, mas como uma forma de organizar a rotina da organização em uma base única, simples, configurável e mobile-first.

A suíte é composta por:

1. **Base Única** — núcleo interno compartilhado.
2. **Corrente em Dia** — contribuições, Pix, comprovantes, aprovações e lembretes.
3. **Atendimento em Harmonia** — recepção, agenda, fila, retornos, check-in, encaixes e cambonos.
4. **Agenda Viva** — calendário único, atividades, responsáveis, aprovações, recorrências e conflitos.

## 2. Decisão comercial

A Organização em Harmonia é a solução completa. Os módulos podem ser contratados separadamente ou combinados.

Modelo recomendado:

- **Módulo individual**: Corrente em Dia, Atendimento em Harmonia ou Agenda Viva.
- **Pacote integrado**: dois módulos.
- **Organização em Harmonia completa**: Base Única + os três módulos.

No formulário público não usar duas opções separadas para “Pacote Completo” e “Organização em Harmonia”, pois isso gera redundância. Usar:

- Organização em Harmonia — solução completa
- Corrente em Dia
- Atendimento em Harmonia
- Agenda Viva

## 3. Base Única

A Base Única é um módulo interno compartilhado, não um produto isolado para venda inicial. Ela deve sustentar todos os módulos.

### Entidades principais

- Organização
- Pessoas
- Contatos
- Funções
- Permissões
- Vínculos pessoa/organização/função
- Módulos habilitados
- Preferências de LGPD
- Auditoria

### Por que isso é diferencial

Uma pessoa cadastrada uma vez pode ser:

- contribuinte no Corrente em Dia;
- cambono no Atendimento em Harmonia;
- responsável por atividade na Agenda Viva;
- aprovador, coordenador ou gestor em qualquer módulo.

Isso reduz retrabalho, evita duplicidades e cria uma “memória operacional” da organização.

## 4. Menus recomendados

### Área pública

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

- Cabeçalho superior com logo, nome, botão Sair e faixa “Desenvolvido por”.
- Menu superior para módulos principais.
- Menu lateral esquerdo para opções internas da área em uso.
- Conteúdo principal à direita.

### Área logada mobile

Seguir o padrão do Corrente em Dia:

- Cabeçalho fixo.
- Botões/pílulas no cabeçalho para navegação.
- Não usar menu lateral à esquerda no celular.
- Conteúdo em uma coluna, com cards e botões grandes.

## 5. Páginas públicas

### Página principal

`/solucoes/organizacao-em-harmonia`

Função:

- explicar a suíte;
- apresentar módulos;
- explicar Base Única;
- apresentar benefícios;
- padronizar Cliente Fundador;
- direcionar para o Quero Conhecer único.

### Páginas dos módulos

- `/solucoes/corrente-em-dia`
- `/solucoes/atendimento-em-harmonia`
- `/solucoes/agenda-viva`

Cada módulo deve:

- explicar a dor específica;
- mostrar benefícios do módulo;
- citar que faz parte da Organização em Harmonia;
- ter link para a suíte completa;
- usar o mesmo Quero Conhecer com interesse pré-selecionado.

## 6. Formulário único de Quero Conhecer

Rota única:

`/solucoes/organizacao-em-harmonia/quero-conhecer`

Parâmetros opcionais:

- `?modulo=corrente-em-dia`
- `?modulo=atendimento-em-harmonia`
- `?modulo=agenda-viva`
- sem parâmetro = Organização em Harmonia completa

Campos mínimos:

- Solução de interesse
- Nome do contato
- WhatsApp
- E-mail
- Nome da organização opcional
- LGPD opcional no primeiro contato
- Interesse Cliente Fundador opcional no primeiro contato

Os dados obrigatórios mais sensíveis e completos ficam para a área logada, reduzindo fricção inicial.

## 7. BotConversa

Criar um fluxo único:

**OH - Lead vindo do site**

Palavras-chave com condição **Contém**:

- Organização em Harmonia
- Corrente em Dia
- Atendimento em Harmonia
- Agenda Viva
- Cliente Fundador
- Quero conhecer
- Preenchi o Quero Conhecer

Mensagem fixa inicial recomendada enquanto a API ainda estiver em validação:

```txt
Olá, {primeiro-nome}! Recebi seu cadastro da Organização em Harmonia.

Seu interesse já está salvo e também enviamos uma confirmação para o e-mail informado no formulário. Se não encontrar, confira spam/lixo eletrônico.

A proposta é começar pelas dores reais da organização: pessoas, funções, permissões, agenda, atendimentos e contribuições em uma base mais clara, sem obrigar a rotina a mudar sua essência.

Próximo passo:
vamos entender qual módulo faz mais sentido primeiro, quais regras precisam ser configuradas e quem poderá aprovar, editar ou acompanhar cada informação.

Se tiver qualquer dificuldade, responda AJUDA por aqui.
```

Depois que o campo `oh_resp_botconversa` estiver preenchendo corretamente via API, o bloco pode usar:

```txt
{oh_resp_botconversa}
```

## 8. Roteiro de validação com diretoria

1. Validar entendimento da suíte.
2. Confirmar nomes comerciais.
3. Confirmar se Base Única faz sentido como núcleo interno.
4. Validar módulos prioritários para o Tucxa.
5. Definir permissões iniciais: presidente, diretoria, coordenação, recepção, tesouraria, cambonos e filhos da corrente.
6. Validar fluxo de aprovação de atividades na Agenda Viva.
7. Validar fluxo de atendimento e retorno no Atendimento em Harmonia.
8. Validar continuidade do Corrente em Dia.
9. Definir piloto de 30 a 60 dias.
10. Coletar feedback para produto comercial.

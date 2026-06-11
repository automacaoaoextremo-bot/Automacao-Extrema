# Roteiro de testes — Corrente em Dia V1

## Papéis simulados

- Márcio: gestor AE / administrador geral.
- Laércio: parceiro comercial / apoio na validação com federações, associações e terreiros.
- Gestor de terreiro fictício: responsável financeiro ou dirigente.
- Contribuinte fictício: cambono, cavalo/médium, consulente ou família.

## 1. Teste de cadastro da solução

No Supabase:

```sql
select name, slug, current_status, stage, priority
from public.ae_solutions
where slug = 'corrente-em-dia';
```

Resultado esperado: solução `Corrente em Dia` cadastrada e ativa.

## 2. Teste de dados fictícios

```sql
select organization_type, name, slug, city, state, pix_key, is_demo
from public.ced_organizations
order by organization_type, name;
```

Resultado esperado: federações, associação e terreiros fictícios com `is_demo = true`.

## 3. Teste de vínculos

```sql
select p.name as entidade_superior, c.name as terreiro, l.relationship_type
from public.ced_organization_links l
join public.ced_organizations p on p.id = l.parent_organization_id
join public.ced_organizations c on c.id = l.child_organization_id;
```

Resultado esperado: vínculos fictícios entre federação/associação e terreiros.

## 4. Teste da landing

Acessar:

```txt
/solucoes/corrente-em-dia
```

Validar:

- Cabeçalho fixo.
- Texto claro, sem começar por dores.
- CTA para piloto.
- Benefícios da solução.
- Linguagem respeitosa e não agressiva.
- Boa leitura no celular.

## 5. Teste da página simples da casa

Acessar:

```txt
/c/casa-pai-benedito-das-matas
/c/tenda-cabocla-estrela-verde
/c/templo-vovo-catarina-de-aruanda
```

Validar:

- Nome da casa.
- Subcabeçalho Desenvolvido por Automação Extrema.
- Texto Deep Dive da contribuição.
- Valores individual/família.
- Botão de acesso.
- Rodapé simples.
- Responsividade no celular e no computador.

## 6. Teste do painel AE

Acessar logado:

```txt
/admin/ae/corrente-em-dia
```

Validar:

- Cards de previsto, aprovado, pendente, em revisão e divergente.
- Lista de entidades do piloto.
- Links para páginas públicas.
- Leitura fácil em celular.

## 7. Teste de contribuição e comprovante no banco

Consultar contribuições:

```sql
select o.name, p.full_name, c.reference_month, c.expected_amount, c.status
from public.ced_contributions c
join public.ced_organizations o on o.id = c.organization_id
left join public.ced_people p on p.id = c.person_id
order by o.name, p.full_name;
```

Validar que há pelo menos:

- uma contribuição aprovada;
- uma contribuição com comprovante enviado/pre-validado;
- uma contribuição em aberto.

## 8. Teste de comprovantes em revisão

```sql
select p.full_name, c.expected_amount, r.ocr_amount, r.ocr_pix_key, r.validation_status, r.validation_notes
from public.ced_payment_receipts r
join public.ced_contributions c on c.id = r.contribution_id
left join public.ced_people p on p.id = c.person_id;
```

Resultado esperado: comprovante fictício pré-validado para simular aprovação humana.

## 9. Teste de repasse gerencial

```sql
select organization_name, reference_month, beneficiary_kind, beneficiary_name, percentage, approved_amount, estimated_repass_amount
from public.ced_v_monthly_split_estimate
order by organization_name, beneficiary_kind;
```

Validar:

- AE com 1,00%.
- Laércio com 1,00%.
- Federação/associação com 0,50% quando houver vínculo.
- Reserva operacional de 0,50% quando não houver vínculo.

## 10. Critérios para considerar a V1 validada

A V1 pode seguir para conversa com uma casa real quando:

- landing e página simples estiverem claras no celular;
- dados fictícios carregarem corretamente;
- o painel mostrar indicadores sem erro;
- a lógica de comprovante e aprovação estiver compreendida;
- Laércio e Márcio concordarem com abordagem comercial;
- taxa operacional estiver descrita com cláusula de revisão;
- não houver promessa de split automático ou gateway na V1.

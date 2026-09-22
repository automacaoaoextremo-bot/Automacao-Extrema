-- Impacto no Controle — validação somente leitura após a migration.

select id, name, slug, responsible_email
from public.inc_clients
where slug = 'sementinha';

select
  id,
  title,
  slug,
  status,
  number_count,
  number_price_cents,
  starts_at,
  ends_at,
  jsonb_array_length(gallery_images) as gallery_images_count
from public.inc_campaigns
where slug = 'rifa-bike-seminova-sementinha';

select email, role, client_id
from public.inc_app_users
where lower(email) in (
  'impactonocontrole@gmail.com',
  'bazardosementinha@gmail.com'
)
order by email;

select id, name, public, file_size_limit
from storage.buckets
where id = 'impacto-no-controle-proofs';

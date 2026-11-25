-- Pacote 02: estruturas aditivas, sem alterar convidados, convites ou recados.
-- Execute primeiro em homologacao. Nenhum evento fica habilitado automaticamente.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presenca-querida-fotos','presenca-querida-fotos',false,3145728,array['image/jpeg'])
on conflict (id) do nothing;
-- Falhar em vez de reutilizar um bucket configurado de forma insegura.
do $$ begin
  if not exists (select 1 from storage.buckets where id='presenca-querida-fotos' and public=false and file_size_limit=3145728 and allowed_mime_types=array['image/jpeg']) then
    raise exception 'Bucket existente incompatível; revise antes de continuar';
  end if;
end $$;
create table if not exists public.pq_event_photo_settings (
  event_id uuid primary key references public.pq_events(id) on delete cascade,
  upload_token uuid not null default gen_random_uuid() unique,
  album_token uuid not null default gen_random_uuid() unique,
  uploads_open boolean not null default false,
  album_open boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.pq_event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.pq_event_photo_settings(event_id) on delete cascade,
  object_path text not null unique,
  author_name text not null default '' check (char_length(author_name)<=80),
  caption text not null default '' check (char_length(caption)<=240),
  share_allowed boolean not null default false,
  consent_version text not null default '2026-11-v1',
  byte_size integer not null check (byte_size between 1 and 3145728),
  rate_key text not null,
  status text not null default 'uploading' check (status in ('uploading','pending','approved','hidden','failed','deleting','deleted')),
  created_at timestamptz not null default now()
);
create index if not exists pq_event_photos_event_created_idx on public.pq_event_photos(event_id,created_at desc);
alter table public.pq_event_photo_settings enable row level security;
alter table public.pq_event_photos enable row level security;
revoke all on public.pq_event_photo_settings, public.pq_event_photos from public, anon, authenticated;
grant select,insert,update,delete on public.pq_event_photo_settings,public.pq_event_photos to service_role;
-- Bloquear acesso ao bucket via políticas genéricas de outras soluções.
-- Políticas RESTRICTIVE combinam com quaisquer políticas permissivas existentes.
drop policy if exists pq_photos_private_only on storage.objects;
create policy pq_photos_private_only on storage.objects as restrictive for all to anon,authenticated
using (bucket_id <> 'presenca-querida-fotos') with check (bucket_id <> 'presenca-querida-fotos');
-- Reserva atômica: serializa requisições por evento; contabiliza tentativas falhas
-- para evitar abuso. Limite inicial: 600 tentativas/450 MiB e 200/h por origem.
create or replace function public.pq_reserve_event_photo(
  p_event uuid, p_token uuid, p_id uuid, p_size integer, p_rate text,
  p_author text, p_caption text, p_share boolean
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare s public.pq_event_photo_settings%rowtype; n bigint; b bigint; recent bigint;
begin
  select * into s from public.pq_event_photo_settings where event_id=p_event for update;
  if not found or s.upload_token<>p_token or not s.uploads_open then return false; end if;
  select count(*),coalesce(sum(byte_size),0), count(*) filter (where rate_key=p_rate and created_at>now()-interval '1 hour')
    into n,b,recent from public.pq_event_photos where event_id=p_event;
  if n>=600 or b+p_size>471859200 or recent>=200 then return false; end if;
  insert into public.pq_event_photos(id,event_id,object_path,byte_size,rate_key,author_name,caption,share_allowed)
    values(p_id,p_event,'eventos/'||p_event||'/'||p_id||'.jpg',p_size,p_rate,p_author,p_caption,p_share);
  return true;
end $$;
revoke all on function public.pq_reserve_event_photo(uuid,uuid,uuid,integer,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.pq_reserve_event_photo(uuid,uuid,uuid,integer,text,text,text,boolean) to service_role;
commit;

-- AE / Reparos RMC - Historico multimidia por pedido.
-- APLICAR EM HOMOLOGACAO PRIMEIRO. Sem exclusao dos anexos existentes.
create table if not exists public.ae_ai_request_timeline (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  request_id uuid not null,
  author_user_id uuid references auth.users(id),
  author_role text not null check (author_role in ('customer','operator','imported')),
  author_label text not null check (length(author_label) between 1 and 120),
  event_type text not null check (event_type in ('message','attachment')),
  body text,
  object_path text unique,
  mime_type text,
  original_name text,
  file_size_bytes bigint,
  uploaded boolean not null default false,
  origin text not null default 'portal' check (origin in ('portal','whatsapp_import')),
  source_key text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (organization_id,request_id) references public.ae_ai_requests(organization_id,id),
  constraint ae_ai_timeline_content check (
    (event_type = 'message' and nullif(btrim(body),'') is not null and object_path is null) or
    (event_type = 'attachment' and object_path is not null and mime_type is not null and file_size_bytes > 0)
  ),
  constraint ae_ai_timeline_origin check (
    (origin = 'whatsapp_import' and author_role = 'imported' and source_key is not null)
    or (origin = 'portal' and author_role <> 'imported' and source_key is null)
  ),
  unique (organization_id,request_id,source_key)
);
create index if not exists ae_ai_timeline_request_idx
 on public.ae_ai_request_timeline (organization_id, request_id, occurred_at, id);
alter table public.ae_ai_request_timeline enable row level security;
revoke all on public.ae_ai_request_timeline from public, anon, authenticated;
-- A API server-side faz verificacao do JWT, cliente e empresa, antes de acessar os dados.
-- Reutilizar bucket privado existente para os mesmos pedidos, sem novo bucket por cliente.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('ae-ai-request-media','ae-ai-request-media',false,31457280,
 array['image/jpeg','image/png','image/webp','video/mp4','video/webm',
       'audio/ogg','audio/opus','audio/webm','audio/mp4','audio/mpeg','audio/x-m4a']::text[])
on conflict (id) do update set
 public=false, file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;
-- A tabela antiga continua intacta; so a nova timeline guarda mensagens e audios.

-- A tela inicial também poderá anexar audio no formato já usado pelo registro inicial.
alter table public.ae_ai_request_media drop constraint if exists ae_ai_request_media_mime_type_check;
alter table public.ae_ai_request_media add constraint ae_ai_request_media_mime_type_check
 check(mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm',
 'audio/ogg','audio/opus','audio/webm','audio/mp4','audio/mpeg','audio/x-m4a'));

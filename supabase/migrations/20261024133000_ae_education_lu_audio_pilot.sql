-- Memórias que Encantam: somente tabelas próprias, sem mexer nos módulos existentes.
-- Executar primeiro no Supabase de testes/homologação; confirmar backup e revisão antes do banco compartilhado de produção.
create table if not exists public.ae_education_projects (
 slug text primary key,
 title text not null,
 founder_contact_label text not null default 'Lu',
 founder_pilot boolean not null default true,
 media_authorized boolean not null default false,
 family_released boolean not null default false,
 created_at timestamptz not null default now(),
 constraint ae_education_project_release_requires_consent check (not family_released or media_authorized)
);
alter table public.ae_education_projects enable row level security;
revoke all on public.ae_education_projects from anon,authenticated;
insert into public.ae_education_projects (slug,title,founder_contact_label,founder_pilot)
values ('lu-2026','Nosso Livro Musical','Lu',true)
on conflict (slug) do nothing;

create table if not exists public.ae_education_audio_versions (
 id uuid primary key default gen_random_uuid(),
 project_slug text not null references public.ae_education_projects(slug) on delete restrict,
 track_id text not null check (track_id ~ '^(0[1-9]|1[0-2])$'),
 source_type text not null check (source_type in ('celular','whatsapp','nova')),
 original_filename text not null,
 storage_path text unique not null,
 mime_type text not null,
 file_bytes bigint not null default 0 check (file_bytes >= 0 and file_bytes <= 26214400),
 status text not null default 'pending' check (status in ('pending','available','hidden')),
 is_selected boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint ae_education_selected_requires_available check (not is_selected or status = 'available')
);
create unique index if not exists ae_education_one_selected_per_song
on public.ae_education_audio_versions(project_slug,track_id) where is_selected;
create index if not exists ae_education_versions_track on public.ae_education_audio_versions(project_slug,track_id,created_at);
alter table public.ae_education_audio_versions enable row level security;
revoke all on public.ae_education_audio_versions from anon,authenticated;

-- Funções chamadas SOMENTE no servidor com a chave service_role.
create or replace function public.ae_education_choose_audio(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare chosen record;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Acesso negado'; end if;
 select project_slug,track_id into chosen from public.ae_education_audio_versions
 where id=p_id and status='available' and project_slug='lu-2026' for update;
 if not found then raise exception 'Arquivo não disponível'; end if;
 update public.ae_education_audio_versions set is_selected=false, updated_at=now()
 where project_slug=chosen.project_slug and track_id=chosen.track_id and is_selected;
 update public.ae_education_audio_versions set is_selected=true,updated_at=now() where id=p_id;
end;
$$;
create or replace function public.ae_education_hide_audio(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Acesso negado'; end if;
 update public.ae_education_audio_versions set status='hidden',is_selected=false,updated_at=now()
 where id=p_id and project_slug='lu-2026' and status='available';
 if not found then raise exception 'Arquivo não disponível'; end if;
end;
$$;
create or replace function public.ae_education_restore_audio(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Acesso negado'; end if;
 update public.ae_education_audio_versions set status='available',is_selected=false,updated_at=now()
 where id=p_id and project_slug='lu-2026' and status='hidden';
 if not found then raise exception 'Arquivo não está oculto'; end if;
end;
$$;
revoke all on function public.ae_education_choose_audio(uuid) from public,anon,authenticated;
revoke all on function public.ae_education_hide_audio(uuid) from public,anon,authenticated;
revoke all on function public.ae_education_restore_audio(uuid) from public,anon,authenticated;
grant execute on function public.ae_education_choose_audio(uuid) to service_role;
grant execute on function public.ae_education_hide_audio(uuid) to service_role;
grant execute on function public.ae_education_restore_audio(uuid) to service_role;

-- Bucket SEM acesso público. O browser usa URL de upload assinada após login de curadoria.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('education-media-private','education-media-private',false,26214400,
 array['audio/mp4','audio/x-m4a','audio/ogg','audio/mpeg','audio/wav','audio/x-wav','audio/webm','audio/aac'])
on conflict (id) do nothing;
-- Não criar políticas públicas para storage.objects: somente service_role e assinaturas temporárias.

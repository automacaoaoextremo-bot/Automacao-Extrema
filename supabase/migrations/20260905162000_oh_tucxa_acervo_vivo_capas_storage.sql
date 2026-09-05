-- TUCXA / Acervo Vivo — bucket público exclusivo para capas de livros.
-- PDFs e demais conteúdos continuam no bucket privado tucxa-acervo-vivo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tucxa-acervo-vivo-capas',
  'tucxa-acervo-vivo-capas',
  true,
  3145728,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- TUCXA / Acervo Vivo - bucket privado para fotos de trechos usados em descricoes.
-- As fotos nao sao publicadas no Acervo; servem para processamento manual ou sugestao assistida.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tucxa-acervo-vivo-descricao-fotos',
  'tucxa-acervo-vivo-descricao-fotos',
  false,
  3145728,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

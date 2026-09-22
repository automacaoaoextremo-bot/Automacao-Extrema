-- Impacto no Controle / Sementinha / InC-03
-- Ajusta a ordem pública das fotos da campanha da bicicleta seminova.
-- A foto bike-03 passa a ser a principal e a primeira da galeria.

update public.inc_campaigns
set
  main_image_url = '/impacto-no-controle/sementinha/bike-03.jpeg',
  prize_image_url = '/impacto-no-controle/sementinha/bike-03.jpeg',
  gallery_images = jsonb_build_array(
    '/impacto-no-controle/sementinha/bike-03.jpeg',
    '/impacto-no-controle/sementinha/bike-01.jpeg',
    '/impacto-no-controle/sementinha/bike-02.jpeg',
    '/impacto-no-controle/sementinha/bike-04.jpeg',
    '/impacto-no-controle/sementinha/bike-05.jpeg',
    '/impacto-no-controle/sementinha/bike-06.jpeg',
    '/impacto-no-controle/sementinha/bike-07.jpeg',
    '/impacto-no-controle/sementinha/bike-08.jpeg'
  ),
  updated_at = now()
where slug = 'rifa-bike-seminova-sementinha';

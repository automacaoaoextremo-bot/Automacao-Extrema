-- Ajustes finais da landing page pública do evento Daniela 50 anos
-- Executar após a atualização dos arquivos do projeto.

update pq_events
set
  host_name = 'Daniela',
  public_headline = 'Sua presença é muito querida nos 50 anos da Daniela.',
  invitation_message = 'Ela quer celebrar seus 50 anos cercada de pessoas que fazem parte de sua história. Esta página reúne os detalhes da festa e também permite confirmar presença com carinho.',
  event_date = '2026-12-19',
  event_time = '12h30 às 17h30',
  venue_name = 'Chácara Piloto',
  address = 'Chácara Piloto, Campinas - SP',
  city = 'Campinas',
  state = 'SP',
  map_url = 'https://www.google.com/maps/search/?api=1&query=Ch%C3%A1cara%20Piloto%20Campinas%20SP',
  venue_instagram_url = 'https://www.instagram.com/chacara.piloto?igsh=MWxobnJham9tMXQyZg==',
  host_photo_url = '/presenca-querida/daniela-50-anos/daniela-01.jpeg',
  host_photo_gallery = ARRAY['/presenca-querida/daniela-50-anos/daniela-01.jpeg'],
  event_gallery = ARRAY['/presenca-querida/daniela-50-anos/chacara-01.png', '/presenca-querida/daniela-50-anos/chacara-02.png'],
  menu_gallery = ARRAY[]::text[],
  buffet_name = 'J_M Festas',
  buffet_instagram_url = null,
  drinks_provider_name = 'Chopp Kremer Campinas',
  drinks_provider_instagram_url = 'https://www.instagram.com/choppkremercampinas/',
  cake_info = 'Bolo de abacaxi e docinhos para fechar a tarde com doçura.'
where slug in ('daniela-50-anos', 'daniela-50-anos-demo');

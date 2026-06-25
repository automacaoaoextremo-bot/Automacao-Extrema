-- Ajustes Daniela 50 anos — textos, cardápio e endereço exibido na LP
-- Execute no Supabase SQL Editor após aplicar os arquivos do pacote.

update pq_events
set
  address = 'Valinhos, Campinas - SP',
  city = 'Valinhos',
  state = 'SP',
  public_headline = 'Sua presença é muito querida nos meus 50 anos.',
  invitation_message = 'Quero celebrar meus 50 anos com pessoas que fazem parte da minha história.
Esta página reúne detalhes da festa e também permite a confirmação da sua presença.',
  attractions = jsonb_build_array(
    jsonb_build_object(
      'title', 'Banda Raça de Quintal',
      'subtitle', 'Samba, alegria e clima de celebração',
      'time', '13h30 às 16h30',
      'description', 'No melhor momento da tarde, a Banda Raça de Quintal entra para embalar a celebração com muito samba e alegria!',
      'instagramUrl', 'https://www.instagram.com/racadequintal?igsh=NmZjOGJxenNic3Ni',
      'imageUrl', '/presenca-querida/daniela-50-anos/raca-de-quintal.png'
    ),
    jsonb_build_object(
      'title', 'DJ Gabriel Mattano',
      'subtitle', 'Recepção musical antes e depois da banda',
      'time', 'Antes do almoço, nos intervalos e no encerramento',
      'description', 'O DJ Gabriel Mattano cuida da trilha da recepção e dos intervalos para que a energia da festa siga leve, acolhedora e com a cara da Dani do começo ao fim.',
      'instagramUrl', 'https://www.instagram.com/gabrielmattanosilva/',
      'imageUrl', '/presenca-querida/daniela-50-anos/dj-gabriel.png'
    )
  ),
  menu_sections = jsonb_build_array(
    jsonb_build_object(
      'title', 'Entradinhas e acompanhamentos',
      'items', jsonb_build_array('Churipam com chimichurri', 'Guacamole com doritos caseiro', 'Pão de alho', 'Mandioca frita', 'Batata frita', 'Salada Caesar', 'Maionese de legumes', 'Salada marroquina', 'Vinagrete', 'Farofa')
    ),
    jsonb_build_object(
      'title', 'Carnes e pratos quentes',
      'items', jsonb_build_array('Contra filé', 'Maminha', 'Linguiça', 'Tulipa de frango', 'Arroz branco', 'Arroz primavera', 'Feijão gordo')
    ),
    jsonb_build_object(
      'title', 'Bebidas para refrescar a tarde',
      'items', jsonb_build_array('Coca-Cola', 'Guaraná', 'Água aromatizada', 'Chopp Kremer', 'Café')
    ),
    jsonb_build_object(
      'title', 'Bolo e doces finos',
      'items', jsonb_build_array('Bolo', 'Doces finos', 'Petit fours')
    )
  ),
  cake_info = 'Bolo e doces finos para fechar a tarde com doçura.'
where slug in ('daniela-50-anos', 'daniela-50-anos-demo');

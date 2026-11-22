-- AG26: SOMENTE LEITURA. Executar apos a migracao e antes de habilitar avisos.
SELECT 'colunas' AS secao, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND (
  (table_name='oh_tucxa_consulente_relationships' AND column_name IN ('approval_status','related_whatsapp_requested')) OR
  (table_name='oh_tucxa_pilot_person_preferences' AND column_name='reception_new_booking_channels')
)
ORDER BY table_name,column_name;

SELECT approval_status, COUNT(*) AS quantidade
FROM public.oh_tucxa_consulente_relationships
GROUP BY approval_status ORDER BY approval_status;

SELECT reception_new_booking_channels AS canais_opt_in, COUNT(*) AS pessoas
FROM public.oh_tucxa_pilot_person_preferences
GROUP BY reception_new_booking_channels
ORDER BY pessoas DESC;

SELECT channel, status, COUNT(*) AS quantidade
FROM public.oh_tucxa_pilot_booking_notice_dispatches
GROUP BY channel, status ORDER BY channel, status;

-- Não apresenta nomes, links de confirmação, telefones nem e-mails.

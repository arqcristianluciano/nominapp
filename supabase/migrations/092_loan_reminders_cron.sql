-- =====================================================
-- NominApp - Migración 092: recordatorio diario de cuotas de préstamo
-- Fecha: 2026-06-12
--
-- Objetivo:
--   Programar un job diario (pg_cron + pg_net) que invoca la Edge Function
--   `loan-reminders`, la cual envía una notificación push a los directores
--   cuando hay cuotas de préstamo vencidas o que vencen en los próximos
--   2 días.
--
-- Diseño:
--   - public.internal_config guarda secretos de uso interno (server-to-server).
--     RLS habilitado SIN policies: solo service_role puede leer/escribir.
--   - El secreto 'internal_push_secret' se genera una sola vez al migrar.
--   - El job corre a las 12:00 UTC = 8:00 AM en República Dominicana (UTC-4).
--   - Idempotente: cron.schedule con el mismo nombre actualiza el job.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configuración interna (secretos server-to-server). Sin policies: el rol
-- service_role salta RLS; anon/authenticated no pueden leerla.
CREATE TABLE IF NOT EXISTS public.internal_config (
  key         text        PRIMARY KEY,
  value       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_config FROM anon, authenticated;

INSERT INTO public.internal_config (key, value)
VALUES ('internal_push_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Job diario: invoca la Edge Function con el secreto interno.
SELECT cron.schedule(
  'loan-reminders-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pkllcsexipdvwdpunlkz.supabase.co/functions/v1/loan-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', (SELECT value FROM public.internal_config WHERE key = 'internal_push_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

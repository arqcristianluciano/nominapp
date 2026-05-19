-- =====================================================
-- NominApp - Migración 015: Suscripciones Web Push (Nivel 4)
-- Almacena las suscripciones VAPID por usuario para enviar push
-- notifications desde un worker / Edge Function.
-- =====================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  display_name    TEXT,
  endpoint        TEXT NOT NULL UNIQUE,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);

COMMENT ON TABLE push_subscriptions IS
  'Suscripciones Web Push (VAPID) por usuario. Se usa desde un worker para enviar notificaciones cuando hay eventos relevantes.';

-- 056_payment_distribution_beneficiary_doc.sql
-- Agrega el documento de identidad del beneficiario (cédula del contratista o
-- RNC del proveedor) al snapshot de la distribución de pagos. Es un dato que los
-- bancos suelen requerir para transferencias en RD, y al guardarlo como copia
-- queda congelado al momento del pago.
--
-- Idempotente: usa IF NOT EXISTS. Aditiva, nullable; sin impacto en filas previas.

alter table public.payment_distributions
  add column if not exists beneficiary_doc text;

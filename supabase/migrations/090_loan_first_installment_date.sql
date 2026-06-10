-- 090_loan_first_installment_date
-- Fecha de la primera cuota de un préstamo, elegida por el usuario.
--
-- Antes las fechas de las cuotas se calculaban solo a partir de la fecha de
-- desembolso más la frecuencia. Esta columna permite indicar explícitamente
-- cuándo se paga la primera cuota; las siguientes se calculan desde ahí
-- según la frecuencia. Si queda NULL se mantiene el cálculo anterior.

ALTER TABLE public.contractor_loans
  ADD COLUMN IF NOT EXISTS first_installment_date date;

COMMENT ON COLUMN public.contractor_loans.first_installment_date IS
  'Fecha elegida para la primera cuota; NULL = calcular desde la fecha de desembolso.';

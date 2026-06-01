-- =====================================================
-- NominApp - Migración 054: adjunto (conduce) en movimientos de inventario
-- -----------------------------------------------------
-- Permite adjuntar el conduce / nota de entrega (foto o PDF) a la recepción de
-- mercancía. El archivo vive en el bucket privado 'receipt-attachments' (ver
-- migración 055) y aquí se guarda su path. Una recepción puede generar varios
-- movimientos (uno por línea); todos comparten el mismo attachment_path.
-- =====================================================

ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS attachment_path TEXT;

COMMENT ON COLUMN inventory_movements.attachment_path IS
  'Path en el bucket receipt-attachments del conduce/nota de entrega de la recepción (opcional).';

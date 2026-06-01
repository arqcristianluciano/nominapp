-- Migration 057: Endurecer el bucket invoice-attachments (tamaño + MIME)
--
-- Defensa en profundidad: además de la validación del cliente (imagen/PDF,
-- máx. 10 MB), el bucket privado de comprobantes de facturas rechaza del lado
-- del servidor cualquier archivo que no sea imagen o PDF, o que exceda 10 MB.
-- Idempotente: sólo actualiza el bucket si ya existe.

UPDATE storage.buckets
SET
  file_size_limit = 10485760, -- 10 MB
  allowed_mime_types = ARRAY['image/*', 'application/pdf']
WHERE id = 'invoice-attachments';

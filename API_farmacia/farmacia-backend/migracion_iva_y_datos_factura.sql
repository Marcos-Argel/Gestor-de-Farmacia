-- ============================================================
-- MIGRACION: IVA por producto + datos de la farmacia en la factura
-- ============================================================
-- OBLIGATORIA: el backend valida al arrancar que exista la columna
-- productos.grava_iva (ddl-auto=validate). Es idempotente.
-- ============================================================

-- La mayoria de medicamentos estan excluidos de IVA; se marca a mano
-- (Inventario > editar producto) los que si lo llevan.
ALTER TABLE productos ADD COLUMN IF NOT EXISTS grava_iva BOOLEAN NOT NULL DEFAULT FALSE;

-- Antes el NIT estaba escrito a mano en el codigo de la factura.
INSERT INTO configuracion (clave, valor, descripcion)
VALUES ('nit', '900.000.000-0', 'NIT de la farmacia (se imprime en las facturas)')
ON CONFLICT (clave) DO NOTHING;

UPDATE configuracion
SET descripcion = 'Porcentaje de IVA para productos que lo llevan (el precio de venta ya lo incluye; la factura lo desglosa)'
WHERE clave = 'iva_porcentaje';

UPDATE configuracion SET descripcion = 'Dirección de la farmacia (se imprime en las facturas)' WHERE clave = 'direccion';
UPDATE configuracion SET descripcion = 'Teléfono de la farmacia (se imprime en las facturas)' WHERE clave = 'telefono';

-- ============================================================
-- Migracion: productos en mal estado por vencimiento
-- ============================================================
-- Antes de esto, el sistema dejaba vender lotes ya vencidos o a punto de
-- vencer (la consulta FEFO de ventas no filtraba por fecha_vencimiento
-- para nada). Este cambio agrega una columna "en_mal_estado" a "lotes"
-- que, cuando esta en TRUE, saca el lote de la venta (ver
-- LoteRepository.buscarLotesDisponiblesFEFO). Un job programado
-- (VencimientoScheduler, corre 1 vez al dia y tambien al arrancar la
-- app) marca esto automaticamente segun la configuracion
-- "dias_alerta_mal_estado" (10 dias por defecto: a esos dias o menos
-- para vencer, o ya vencido, el lote pasa a mal estado solo).
--
-- Ejecutar UNA SOLA VEZ contra la base de datos ya existente (la que usa
-- el docker-compose, puerto 5433). Correr esto en DBeaver conectado a esa
-- base, no a tu Postgres local (ahi ya se crea con farmacy_schema.sql
-- actualizado si es una base nueva).
-- ============================================================

ALTER TABLE lotes
    ADD COLUMN IF NOT EXISTS en_mal_estado BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO configuracion (clave, valor, descripcion)
SELECT 'dias_alerta_mal_estado', '10', 'Dias antes del vencimiento (o ya vencido) para que un lote pase automaticamente a "mal estado" y se excluya de la venta'
WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave = 'dias_alerta_mal_estado');

-- Aplica la regla de una vez sobre los lotes que ya existen (sin esperar
-- a que corra el scheduler): marca en mal estado los que ya estan a 10
-- dias o menos de vencer (o ya vencidos) y todavia tienen stock.
UPDATE lotes
SET en_mal_estado = TRUE
WHERE cantidad_actual > 0
  AND en_mal_estado = FALSE
  AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '10 days';

-- Verificacion rapida.
SELECT id, numero_lote, fecha_vencimiento, cantidad_actual, en_mal_estado
FROM lotes
ORDER BY fecha_vencimiento ASC;

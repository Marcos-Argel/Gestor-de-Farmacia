-- ============================================================
-- MIGRACION: baja automatica de lotes 15 dias antes de vencer
-- ============================================================
-- Antes eran 10 dias. Se puede cambiar despues desde
-- Configuracion > dias_alerta_mal_estado. Es idempotente.
-- ============================================================

UPDATE configuracion
SET valor = '15',
    descripcion = 'Días antes del vencimiento para dar de baja un lote automáticamente (deja de venderse y sale del stock)'
WHERE clave = 'dias_alerta_mal_estado';

-- Marca ya mismo los lotes que caen dentro del nuevo margen (el backend
-- tambien lo hace solo cada hora y al arrancar).
UPDATE lotes
SET en_mal_estado = TRUE
WHERE en_mal_estado = FALSE
  AND cantidad_actual > 0
  AND fecha_vencimiento <= CURRENT_DATE + 15;

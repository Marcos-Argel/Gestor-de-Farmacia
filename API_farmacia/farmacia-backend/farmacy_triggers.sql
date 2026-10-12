
-- ============================================================
-- SISTEMA DE GESTIÓN DE FARMACIA
-- Triggers de auditoría automática
-- ============================================================
-- Ejecutar DESPUÉS de farmacy_schema.sql, en la misma base
-- de datos (farmacia_db).
-- ============================================================

-- ============================================================
-- 1. FUNCIÓN GENÉRICA DE AUDITORÍA
-- ============================================================
-- Se dispara automáticamente en INSERT / UPDATE / DELETE sobre
-- cualquier tabla a la que se le asigne este trigger.
-- Lee el usuario actual desde una variable de sesión que el
-- backend debe establecer al abrir cada transacción con:
--   SET LOCAL app.current_user_id = '<id_del_usuario_autenticado>';
-- Si el backend no la establece, queda NULL (no rompe la operación).

CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id BIGINT;
BEGIN
    -- Intenta leer el usuario actual de la sesión; si no existe, NULL.
    BEGIN
        v_usuario_id := current_setting('app.current_user_id', true)::BIGINT;
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := NULL;
    END;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, valores_anteriores, valores_nuevos)
        VALUES (v_usuario_id, 'INSERT', TG_TABLE_NAME, NEW.id, NULL, (to_jsonb(NEW) - 'password_hash'));
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, valores_anteriores, valores_nuevos)
        VALUES (v_usuario_id, 'UPDATE', TG_TABLE_NAME, NEW.id, (to_jsonb(OLD) - 'password_hash'), (to_jsonb(NEW) - 'password_hash'));
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO auditoria (usuario_id, accion, tabla_afectada, registro_id, valores_anteriores, valores_nuevos)
        VALUES (v_usuario_id, 'DELETE', TG_TABLE_NAME, OLD.id, (to_jsonb(OLD) - 'password_hash'), NULL);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. ASIGNAR EL TRIGGER A LAS TABLAS CRÍTICAS
-- ============================================================
-- Empezamos con productos y lotes (inventario y precios).
-- Se puede extender a ventas, compras, etc. más adelante.

CREATE TRIGGER trg_auditoria_productos
AFTER INSERT OR UPDATE OR DELETE ON productos
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_lotes
AFTER INSERT OR UPDATE OR DELETE ON lotes
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_usuarios
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_clientes
AFTER INSERT OR UPDATE OR DELETE ON clientes
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_proveedores
AFTER INSERT OR UPDATE OR DELETE ON proveedores
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_ventas
AFTER INSERT OR UPDATE OR DELETE ON ventas
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_detalle_ventas
AFTER INSERT OR UPDATE OR DELETE ON detalle_ventas
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_compras
AFTER INSERT OR UPDATE OR DELETE ON compras
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_detalle_compras
AFTER INSERT OR UPDATE OR DELETE ON detalle_compras
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_caja_sesiones
AFTER INSERT OR UPDATE OR DELETE ON caja_sesiones
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER trg_auditoria_movimientos_caja
AFTER INSERT OR UPDATE OR DELETE ON movimientos_caja
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

-- ============================================================
-- 3. NOTA SOBRE EL BLOQUEO SEGURO PARA FEFO (se implementa en Java)
-- ============================================================
-- Esta parte NO va en la base de datos, sino en el backend Spring
-- Boot, en el servicio que procesa una venta. Referencia para
-- cuando construyamos las entidades JPA:
--
--   @Transactional
--   public void procesarVenta(...) {
--       // 1. Buscar lotes disponibles del producto ordenados por
--       //    fecha_vencimiento ASC (FEFO), con bloqueo pesimista:
--       //
--       //    SELECT * FROM lotes
--       //    WHERE producto_id = ? AND cantidad_actual > 0
--       //    ORDER BY fecha_vencimiento ASC
--       //    FOR UPDATE;
--       //
--       //    En JPA esto se logra con @Lock(LockModeType.PESSIMISTIC_WRITE)
--       //    en el método del repositorio.
--       //
--       // 2. Mientras dure la transacción, ningún otro proceso puede
--       //    tocar esos mismos lotes: se ponen en cola hasta que
--       //    termine, evitando que dos ventas descuenten el mismo
--       //    stock al mismo tiempo (race condition).
--       //
--       // 3. Si la cantidad solicitada supera el stock disponible,
--       //    lanzar una excepción de negocio (StockInsuficienteException)
--       //    ANTES de intentar el UPDATE, para dar un mensaje claro
--       //    al usuario en vez de depender solo del CHECK de la BD.
--   }

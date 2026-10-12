-- ============================================================
-- MIGRACIÓN: extender auditoría a más tablas
-- ============================================================
-- Ejecutar una sola vez sobre la base de datos ya existente
-- (farmacia_db). Es seguro correrlo más de una vez: cada
-- DROP TRIGGER IF EXISTS evita el error de "ya existe".
-- ============================================================

DROP TRIGGER IF EXISTS trg_auditoria_usuarios ON usuarios;
CREATE TRIGGER trg_auditoria_usuarios
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_clientes ON clientes;
CREATE TRIGGER trg_auditoria_clientes
AFTER INSERT OR UPDATE OR DELETE ON clientes
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_proveedores ON proveedores;
CREATE TRIGGER trg_auditoria_proveedores
AFTER INSERT OR UPDATE OR DELETE ON proveedores
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_ventas ON ventas;
CREATE TRIGGER trg_auditoria_ventas
AFTER INSERT OR UPDATE OR DELETE ON ventas
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_detalle_ventas ON detalle_ventas;
CREATE TRIGGER trg_auditoria_detalle_ventas
AFTER INSERT OR UPDATE OR DELETE ON detalle_ventas
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_compras ON compras;
CREATE TRIGGER trg_auditoria_compras
AFTER INSERT OR UPDATE OR DELETE ON compras
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_detalle_compras ON detalle_compras;
CREATE TRIGGER trg_auditoria_detalle_compras
AFTER INSERT OR UPDATE OR DELETE ON detalle_compras
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_caja_sesiones ON caja_sesiones;
CREATE TRIGGER trg_auditoria_caja_sesiones
AFTER INSERT OR UPDATE OR DELETE ON caja_sesiones
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_movimientos_caja ON movimientos_caja;
CREATE TRIGGER trg_auditoria_movimientos_caja
AFTER INSERT OR UPDATE OR DELETE ON movimientos_caja
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

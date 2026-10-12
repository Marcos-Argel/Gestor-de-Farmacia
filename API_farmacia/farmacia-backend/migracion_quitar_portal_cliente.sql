-- ============================================================
-- MIGRACION (opcional): limpieza tras quitar el portal de clientes
-- ============================================================
-- El sistema ahora es solo para el personal. Esto:
--  1) desactiva las cuentas CLIENTE (igual ya no pueden iniciar sesion)
--  2) borra las claves de configuracion que solo usaba el portal publico
-- No borra usuarios ni el rol, para no romper la auditoria historica.
-- ============================================================

UPDATE usuarios SET activo = FALSE
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'CLIENTE');

DELETE FROM configuracion
WHERE clave IN ('sobre_nosotros', 'whatsapp', 'horario_atencion', 'facebook', 'instagram');

-- ============================================================
-- Migracion: informacion publica de la farmacia
-- ============================================================
-- Agrega a "configuracion" las claves que alimentan el sitio publico
-- (pagina de inicio sin login: quienes somos, ubicacion, redes sociales,
-- horario). Se editan despues desde Configuracion > (esta pantalla ya
-- lista TODA fila de "configuracion" automaticamente, no hace falta
-- tocar el frontend para poder editarlas).
--
-- Ejecutar UNA SOLA VEZ contra la base de datos ya existente (la que usa
-- el docker-compose, puerto 5433). Correr esto en DBeaver conectado a esa
-- base, no a tu Postgres local (ahi ya se crea con farmacy_schema.sql
-- actualizado si es una base nueva).
-- ============================================================

INSERT INTO configuracion (clave, valor, descripcion)
SELECT * FROM (VALUES
    ('sobre_nosotros', 'Somos una farmacia comprometida con la salud y el bienestar de nuestra comunidad, ofreciendo productos de calidad y atencion cercana.', 'Texto de "Quienes somos" en el sitio publico'),
    ('direccion', 'Calle 00 # 00-00, Medellin, Colombia', 'Direccion fisica mostrada en el sitio publico'),
    ('telefono', '(604) 000 0000', 'Telefono de contacto mostrado en el sitio publico'),
    ('whatsapp', '57300000000', 'Numero de WhatsApp (solo digitos, con indicativo de pais) para el boton de contacto'),
    ('horario_atencion', 'Lunes a sabado: 8:00 a.m. - 8:00 p.m.', 'Horario de atencion mostrado en el sitio publico'),
    ('facebook', '', 'URL de la pagina de Facebook (vacio = no se muestra el icono)'),
    ('instagram', '', 'URL del perfil de Instagram (vacio = no se muestra el icono)')
) AS nuevas(clave, valor, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE configuracion.clave = nuevas.clave);

-- Verificacion rapida: deberias ver, ademas de las 3 claves previas
-- (nombre_farmacia, dias_alerta_vencimiento, iva_porcentaje), estas 7
-- nuevas (10 filas en total).
SELECT id, clave, valor, descripcion FROM configuracion ORDER BY id;

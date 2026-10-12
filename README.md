# Farma Argel — Sistema de gestión de farmacia

Sistema interno para el personal de la farmacia (no tiene portal ni registro público).
Backend en Spring Boot 3 + PostgreSQL, frontend en React 19 + Vite + Tailwind.

```
API_farmacia/farmacia-backend/   API REST (Java 17, Maven)
farmacia-frontend/               Panel web del personal (React)
```

## Módulos

Inventario por lotes (FEFO), ventas con lector de código de barras y receta médica, facturas,
compras a proveedores, caja (apertura, movimientos y cierre con cuadre), devoluciones,
reportes exportables (PDF/Excel/Word), auditoría automática por triggers, usuarios por rol
(ADMIN, GERENTE, VENDEDOR, INVENTARIO), login con Google para empleados, 5 idiomas y modo oscuro.

- **Vencimientos:** los lotes que vencen en 15 días o menos (configurable) se dan de baja solos:
  dejan de venderse y salen del stock. Se revisa cada hora.
- **IVA:** cada producto indica si grava IVA. El precio de venta ya lo incluye; la factura lo desglosa.

## Cómo levantarlo en local

### 1. Base de datos

```bash
cd API_farmacia/farmacia-backend
docker compose up -d db      # PostgreSQL en el puerto 5433, carga schema + triggers
```


Migraciones, en este orden si la base es anterior:

| Archivo | ¿Obligatoria? |
|---|---|
| `migracion_auditoria_sin_password.sql` | Sí (quita hashes de contraseña de la auditoría) |
| `migracion_baja_15_dias.sql` | Sí |
| `migracion_iva_y_datos_factura.sql` | **Sí — el backend no arranca sin ella** |
| `migracion_quitar_portal_cliente.sql` | Opcional (limpia datos del portal de clientes eliminado) |

### 2. Backend

```bash
cp src/main/resources/application.properties.example src/main/resources/application.properties
# Edita los valores o defínelos como variables de entorno:
#   DATABASE_URL, DATABASE_USERNAME, DATABASE_PASSWORD
#   JWT_SECRET            (obligatorio, mínimo 32 caracteres)
#   GOOGLE_CLIENT_ID      (opcional, para "Iniciar sesión con Google")
#   ADMIN_EMAIL / ADMIN_PASSWORD   (crea el primer ADMIN si la BD no tiene ninguno)
mvn spring-boot:run
mvn test           # pruebas unitarias de las reglas de negocio (no necesitan BD)
```

### 3. Frontend

```bash
cd farmacia-frontend
cp .env.example .env
npm install
npm run dev        # http://localhost:5173 (el proxy envía /api a localhost:8080)
```

## Despliegue (Render)

- **Backend**: servicio Docker con el `Dockerfile` del backend. Variables: `DATABASE_URL`,
  `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`
  (URL del frontend), `GOOGLE_CLIENT_ID`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- **Frontend**: Static Site con `npm run build` y `dist/` como carpeta publicada.
  Variables de build: `VITE_API_URL` (URL del backend + `/api`) y `VITE_GOOGLE_CLIENT_ID`.
  Agrega una regla de *rewrite* `/* → /index.html` para que funcionen las rutas de React.

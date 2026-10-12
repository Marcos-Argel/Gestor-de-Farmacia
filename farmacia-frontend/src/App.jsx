import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import { authService } from './services/authService';
import { puedeVer } from './utils/permisos';

// Cada pantalla se descarga solo cuando se abre (antes TODO iba en un
// unico archivo de ~580 kB, incluidas las librerias de Excel/PDF/Word que
// solo usan Reportes y Facturas).
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InventarioPage = lazy(() => import('./pages/InventarioPage'));
const ClientesPage = lazy(() => import('./pages/ClientesPage'));
const ProveedoresPage = lazy(() => import('./pages/ProveedoresPage'));
const VentasPage = lazy(() => import('./pages/VentasPage'));
const FacturasPage = lazy(() => import('./pages/FacturasPage'));
const ComprasPage = lazy(() => import('./pages/ComprasPage'));
const CajaPage = lazy(() => import('./pages/CajaPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const AuditoriaPage = lazy(() => import('./pages/AuditoriaPage'));
const DevolucionesPage = lazy(() => import('./pages/DevolucionesPage'));
const ReportesPage = lazy(() => import('./pages/ReportesPage'));
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage'));

const PAGINAS = [
  ['inicio', DashboardPage],
  ['inventario', InventarioPage],
  ['clientes', ClientesPage],
  ['proveedores', ProveedoresPage],
  ['ventas', VentasPage],
  ['facturas', FacturasPage],
  ['compras', ComprasPage],
  ['caja', CajaPage],
  ['usuarios', UsuariosPage],
  ['auditoria', AuditoriaPage],
  ['devoluciones', DevolucionesPage],
  ['reportes', ReportesPage],
  ['configuracion', ConfiguracionPage],
];

// El sistema es solo para el personal de la farmacia: se quito el portal
// publico del rol CLIENTE. Una sesion vieja de CLIENTE se descarta.
function sesionValida() {
  if (!authService.estaAutenticado()) return false;
  if (authService.obtenerUsuarioActual()?.rol === 'CLIENTE') {
    authService.logout();
    return false;
  }
  return true;
}

function RutaProtegida({ children }) {
  return sesionValida() ? children : <Navigate to="/login" replace />;
}

// Segunda capa: aunque el menu ya oculta las pantallas que el rol no
// puede usar, alguien podria escribir la URL a mano (/panel/usuarios).
// En ese caso se le devuelve al inicio del panel.
function RutaConRol({ ruta, children }) {
  return puedeVer(ruta) ? children : <Navigate to="/panel/inicio" replace />;
}

function CargandoPagina() {
  return (
    <div className="max-w-6xl space-y-6" aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={sesionValida() ? '/panel/inicio' : '/login'} replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/panel"
          element={
            <RutaProtegida>
              <Layout />
            </RutaProtegida>
          }
        >
          {PAGINAS.map(([ruta, Pagina]) => (
            <Route
              key={ruta}
              path={ruta}
              element={
                <RutaConRol ruta={`/panel/${ruta}`}>
                  <Suspense fallback={<CargandoPagina />}>
                    <Pagina />
                  </Suspense>
                </RutaConRol>
              }
            />
          ))}
          <Route index element={<Navigate to="/panel/inicio" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

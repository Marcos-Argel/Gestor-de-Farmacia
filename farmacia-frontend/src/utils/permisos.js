import { authService } from '../services/authService';

// Que roles pueden entrar a cada pantalla del panel. Refleja las reglas de
// SecurityConfig.java en el backend: antes el menu mostraba TODO a todos
// los roles (un VENDEDOR veia Usuarios/Auditoria, entraba y le fallaba
// cada peticion). El backend sigue siendo quien protege los datos; esto
// solo evita mostrar pantallas que de todas formas no van a funcionar.
const STAFF = ['ADMIN', 'GERENTE', 'VENDEDOR', 'INVENTARIO'];
const SUPERVISORES = ['ADMIN', 'GERENTE'];
const VENTAS = ['ADMIN', 'GERENTE', 'VENDEDOR'];
const INVENTARIO = ['ADMIN', 'GERENTE', 'INVENTARIO'];

export const ROLES_POR_RUTA = {
  '/panel/inicio': STAFF,
  '/panel/inventario': STAFF,
  '/panel/ventas': VENTAS,
  '/panel/facturas': VENTAS,
  '/panel/compras': INVENTARIO,
  '/panel/caja': VENTAS,
  '/panel/clientes': VENTAS,
  '/panel/proveedores': INVENTARIO,
  '/panel/devoluciones': STAFF,
  '/panel/reportes': STAFF,
  '/panel/usuarios': SUPERVISORES,
  '/panel/auditoria': SUPERVISORES,
  // Todos entran (modo oscuro e idioma son personales); los datos de la
  // farmacia dentro de la pantalla solo los ve/edita un supervisor.
  '/panel/configuracion': STAFF,
};

export function rolActual() {
  return authService.obtenerUsuarioActual()?.rol ?? null;
}

export function puedeVer(ruta, rol = rolActual()) {
  const permitidos = ROLES_POR_RUTA[ruta];
  return !permitidos || permitidos.includes(rol);
}

export function esSupervisor(rol = rolActual()) {
  return SUPERVISORES.includes(rol);
}

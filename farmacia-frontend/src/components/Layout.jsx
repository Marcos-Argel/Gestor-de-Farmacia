import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Truck,
  Wallet,
  Users,
  Building2,
  RotateCcw,
  FileBarChart,
  UserCog,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  Sun,
  Moon,
} from 'lucide-react';
import { authService } from '../services/authService';
import { useIdioma } from '../context/LanguageContext';
import { useTema } from '../context/ThemeContext';
import { puedeVer } from '../utils/permisos';
import CampanaAlertas from './CampanaAlertas';
import logoFarmacia from '../assets/logo-farma-argel.png';

// Menu agrupado por area de trabajo (antes era una sola lista larga de 13
// opciones). "labelKey" se traduce con t() para poder cambiar de idioma
// sin recargar.
const GRUPOS_MENU = [
  {
    labelKey: 'nav.groupSales',
    items: [
      { to: '/panel/inicio', labelKey: 'nav.inicio', icon: LayoutDashboard },
      { to: '/panel/ventas', labelKey: 'nav.ventas', icon: ShoppingCart },
      { to: '/panel/facturas', labelKey: 'nav.facturas', icon: Receipt },
      { to: '/panel/caja', labelKey: 'nav.caja', icon: Wallet },
      { to: '/panel/clientes', labelKey: 'nav.clientes', icon: Users },
    ],
  },
  {
    labelKey: 'nav.groupInventory',
    items: [
      { to: '/panel/inventario', labelKey: 'nav.inventario', icon: Package },
      { to: '/panel/compras', labelKey: 'nav.compras', icon: Truck },
      { to: '/panel/proveedores', labelKey: 'nav.proveedores', icon: Building2 },
      { to: '/panel/devoluciones', labelKey: 'nav.devoluciones', icon: RotateCcw },
    ],
  },
  {
    labelKey: 'nav.groupAnalysis',
    items: [{ to: '/panel/reportes', labelKey: 'nav.reportes', icon: FileBarChart }],
  },
  {
    labelKey: 'nav.groupAdmin',
    items: [
      { to: '/panel/usuarios', labelKey: 'nav.usuarios', icon: UserCog },
      { to: '/panel/auditoria', labelKey: 'nav.auditoria', icon: History },
      { to: '/panel/configuracion', labelKey: 'nav.configuracion', icon: Settings },
    ],
  },
];

const TODOS_LOS_ITEMS = GRUPOS_MENU.flatMap((g) => g.items);
const CLAVE_COLAPSADO = 'farmacia_sidebar_colapsado';

function iniciales(nombre) {
  if (!nombre) return '?';
  const partes = nombre.trim().split(/\s+/);
  return partes.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function leerColapsado() {
  try {
    return localStorage.getItem(CLAVE_COLAPSADO) === '1';
  } catch {
    return false;
  }
}

function MenuUsuario({ usuario, colapsado, onLogout }) {
  const { t } = useIdioma();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    function alClicFuera(e) {
      if (!ref.current?.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, [abierto]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent ${
          abierto ? 'bg-sidebar-accent' : ''
        }`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        title={colapsado ? usuario?.nombre : undefined}
      >
        {usuario?.fotoUrl ? (
          <img src={usuario.fotoUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-mint text-xs font-semibold text-sidebar">
            {iniciales(usuario?.nombre)}
          </span>
        )}
        {!colapsado && (
          <>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-sm font-medium text-white">
                {usuario?.nombre ?? t('common.userFallback')}
              </span>
              <span className="truncate text-xs text-sidebar-text/60">{t(`roles.${usuario?.rol}`)}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-sidebar-text/60" />
          </>
        )}
      </button>

      {abierto && (
        <div
          role="menu"
          className={`absolute bottom-full z-50 mb-2 min-w-56 overflow-hidden rounded-xl border border-border bg-surface p-1 text-text shadow-xl ${
            colapsado ? 'left-0' : 'inset-x-0'
          }`}
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{usuario?.nombre}</p>
            <p className="truncate text-xs text-text-secondary">{usuario?.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            onClick={() => {
              setAbierto(false);
              navigate('/panel/configuracion');
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
          >
            <Settings className="size-4 text-text-secondary" />
            {t('nav.configuracion')}
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
          >
            <LogOut className="size-4" />
            {t('common.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useIdioma();
  const { alternarTema, esOscuro } = useTema();
  const usuario = authService.obtenerUsuarioActual();
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [colapsado, setColapsado] = useState(leerColapsado);

  // En el menu movil siempre se muestran los textos.
  const iconosSolos = colapsado && !menuMovilAbierto;

  function alternarColapsado() {
    setColapsado((v) => {
      try {
        localStorage.setItem(CLAVE_COLAPSADO, v ? '0' : '1');
      } catch {
        // sin localStorage (modo privado) simplemente no se recuerda
      }
      return !v;
    });
  }

  function manejarLogout() {
    authService.logout();
    navigate('/login', { replace: true });
  }

  const itemActual = TODOS_LOS_ITEMS.find((i) => pathname.startsWith(i.to));

  return (
    <div className="flex min-h-screen bg-bg">
      {menuMovilAbierto && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMenuMovilAbierto(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col bg-sidebar text-sidebar-text transition-[width,transform] duration-200 md:sticky md:top-0 md:h-screen ${
          iconosSolos ? 'w-[4.25rem]' : 'w-64'
        } ${menuMovilAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className={`flex items-center gap-3 px-3 pt-4 pb-3 ${iconosSolos ? 'justify-center' : ''}`}>
          <Link to="/panel/inicio" className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-mint">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white p-1">
              <img src={logoFarmacia} alt="Farma Argel" className="size-full object-contain" />
            </span>
            {!iconosSolos && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold text-white">Farma Argel</span>
                <span className="block truncate text-xs text-sidebar-text/60">{t('nav.subtitle')}</span>
              </span>
            )}
          </Link>
          <button
            className="ml-auto text-sidebar-text/70 hover:text-white md:hidden"
            onClick={() => setMenuMovilAbierto(false)}
            aria-label={t('common.closeMenu')}
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {GRUPOS_MENU.map((grupo) => {
            const visibles = grupo.items.filter(({ to }) => puedeVer(to, usuario?.rol));
            if (visibles.length === 0) return null;
            return (
              <div key={grupo.labelKey}>
                {iconosSolos ? (
                  <div className="mx-2 mb-2 h-px bg-white/10" />
                ) : (
                  <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-text/45">
                    {t(grupo.labelKey)}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visibles.map(({ to, labelKey, icon: Icon }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={() => setMenuMovilAbierto(false)}
                        title={iconosSolos ? t(labelKey) : undefined}
                        className={({ isActive }) =>
                          `relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                            iconosSolos ? 'justify-center' : ''
                          } ${
                            isActive
                              ? 'bg-sidebar-accent font-medium text-white before:absolute before:inset-y-1.5 before:-left-3 before:w-1 before:rounded-r-full before:bg-brand-mint'
                              : 'text-sidebar-text/75 hover:bg-sidebar-accent/60 hover:text-white'
                          }`
                        }
                      >
                        <Icon className="size-4 shrink-0" strokeWidth={2} />
                        {!iconosSolos && <span className="truncate">{t(labelKey)}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <MenuUsuario usuario={usuario} colapsado={iconosSolos} onLogout={manejarLogout} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg/80 px-4 backdrop-blur md:px-6">
          <button
            className="grid size-9 place-items-center rounded-lg text-text-secondary hover:bg-muted hover:text-text md:hidden"
            onClick={() => setMenuMovilAbierto(true)}
            aria-label={t('common.openMenu')}
          >
            <Menu className="size-5" />
          </button>
          <button
            className="hidden size-9 place-items-center rounded-lg text-text-secondary hover:bg-muted hover:text-text md:grid"
            onClick={alternarColapsado}
            aria-label={colapsado ? t('common.expandMenu') : t('common.collapseMenu')}
            title={colapsado ? t('common.expandMenu') : t('common.collapseMenu')}
          >
            {colapsado ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <p className="truncate text-sm font-medium text-text">{itemActual ? t(itemActual.labelKey) : ''}</p>

          <div className="ml-auto flex items-center gap-1">
            <CampanaAlertas />
            <button
              onClick={alternarTema}
              className="grid size-9 place-items-center rounded-lg text-text-secondary hover:bg-muted hover:text-text"
              aria-label={esOscuro ? t('common.lightTheme') : t('common.darkTheme')}
              title={esOscuro ? t('common.lightTheme') : t('common.darkTheme')}
            >
              {esOscuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

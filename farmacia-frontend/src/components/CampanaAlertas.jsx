import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Bell, PackageX, CalendarClock, AlertTriangle, ChevronRight } from 'lucide-react';
import { reporteService } from '../services/reporteService';
import { useIdioma } from '../context/LanguageContext';

const CADA_5_MINUTOS = 5 * 60 * 1000;

// Campana de la cabecera: resume lo que necesita atencion en el inventario
// (lotes dados de baja que hay que retirar del estante, lotes por vencer y
// productos con stock bajo) sin tener que entrar a Reportes a buscarlo.
export default function CampanaAlertas() {
  const { t } = useIdioma();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState({ malEstado: [], proximos: [], stockBajo: [] });
  const ref = useRef(null);

  useEffect(() => {
    let activo = true;
    function cargar() {
      Promise.allSettled([reporteService.malEstado(), reporteService.proximosAVencer(), reporteService.stockBajo()]).then(
        ([malEstado, proximos, stockBajo]) => {
          if (!activo) return;
          const valor = (r) => (r.status === 'fulfilled' ? r.value : []);
          setDatos({ malEstado: valor(malEstado), proximos: valor(proximos), stockBajo: valor(stockBajo) });
        }
      );
    }
    cargar();
    const intervalo = setInterval(cargar, CADA_5_MINUTOS);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    function alClicFuera(e) {
      if (!ref.current?.contains(e.target)) setAbierto(false);
    }
    function alEscape(e) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alEscape);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alEscape);
    };
  }, [abierto]);

  const filas = [
    {
      clave: 'malEstado',
      icono: PackageX,
      tono: 'bg-danger/10 text-danger',
      titulo: t('alertas.writtenOff'),
      detalle: t('alertas.writtenOffHint'),
      cantidad: datos.malEstado.length,
      ruta: '/panel/reportes',
    },
    {
      clave: 'proximos',
      icono: CalendarClock,
      tono: 'bg-warning/10 text-warning',
      titulo: t('alertas.expiring'),
      detalle: t('alertas.expiringHint'),
      cantidad: datos.proximos.length,
      ruta: '/panel/reportes',
    },
    {
      clave: 'stockBajo',
      icono: AlertTriangle,
      tono: 'bg-accent-copper-light text-accent-copper',
      titulo: t('alertas.lowStock'),
      detalle: t('alertas.lowStockHint'),
      cantidad: datos.stockBajo.length,
      ruta: '/panel/inventario',
    },
  ];
  const total = filas.reduce((s, f) => s + f.cantidad, 0);
  const hayCriticas = datos.malEstado.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative grid size-9 place-items-center rounded-lg text-text-secondary hover:bg-muted hover:text-text"
        aria-label={t('alertas.title')}
        aria-expanded={abierto}
        title={t('alertas.title')}
      >
        <Bell className="size-4" />
        {total > 0 && (
          <span
            className={`tabular absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold text-white ${
              hayCriticas ? 'bg-danger' : 'bg-warning'
            }`}
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-text">{t('alertas.title')}</p>
            <p className="text-xs text-text-secondary">
              {total === 0 ? t('alertas.allGood') : t('alertas.summary', { total })}
            </p>
          </div>
          <ul className="p-1">
            {filas.map(({ clave, icono: Icono, tono, titulo, detalle, cantidad, ruta }) => (
              <li key={clave}>
                <Link
                  to={ruta}
                  onClick={() => setAbierto(false)}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted"
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tono}`}>
                    <Icono className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-text">{titulo}</span>
                    <span className="block truncate text-xs text-text-secondary">{detalle}</span>
                  </span>
                  <span className={`tabular text-sm font-semibold ${cantidad > 0 ? 'text-text' : 'text-text-disabled'}`}>
                    {cantidad}
                  </span>
                  <ChevronRight className="size-4 text-text-disabled transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

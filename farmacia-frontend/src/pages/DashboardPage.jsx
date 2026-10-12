import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  CalendarClock,
  PackageX,
  ArrowRight,
  Truck,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { authService } from '../services/authService';
import { useIdioma } from '../context/LanguageContext';
import { puedeVer } from '../utils/permisos';

function claveSaludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'dashboard.goodMorning';
  if (hora < 19) return 'dashboard.goodAfternoon';
  return 'dashboard.goodEvening';
}

function Indicador({ titulo, valor, icono: Icono, tono, detalle, to }) {
  const contenido = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{titulo}</p>
        <span className={`grid size-8 place-items-center rounded-lg ${tono}`}>
          <Icono className="size-4" />
        </span>
      </div>
      <p className="tabular mt-3 text-3xl font-semibold tracking-tight text-text">{valor}</p>
      {detalle && <div className="mt-1.5 text-xs text-text-secondary">{detalle}</div>}
    </>
  );
  const clase = 'block rounded-xl border border-border bg-surface p-5';
  return to ? (
    <Link to={to} className={`${clase} transition-colors hover:border-brand-forest/40`}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

function Panel({ titulo, subtitulo, accion, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-border bg-surface ${className}`}>
      <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-text">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-sm text-text-secondary">{subtitulo}</p>}
        </div>
        {accion}
      </header>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

function VerTodo({ to }) {
  const { t } = useIdioma();
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-forest hover:underline">
      {t('dashboard.viewAll')}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

// Barras verticales de una sola serie: sin leyenda (el titulo la nombra),
// cuadricula discreta, y tooltip al pasar el mouse por cada dia.
function GraficoVentas({ dias, moneda, locale }) {
  const { t } = useIdioma();
  const [activo, setActivo] = useState(null);
  const maximo = Math.max(...dias.map((d) => d.total), 1);
  const lineas = [1, 0.5, 0];

  return (
    <div className="relative">
      <div className="relative h-52">
        {lineas.map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${f * 100}%` }}>
            <span className="tabular absolute -top-2.5 right-0 bg-surface pl-2 text-[11px] text-text-disabled">
              {f === 0 ? '' : moneda.format(maximo * f)}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-2 pr-16">
          {dias.map((d, i) => {
            const alto = d.total > 0 ? Math.max((d.total / maximo) * 100, 2) : 0;
            const esHoy = i === dias.length - 1;
            return (
              <div
                key={d.clave}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setActivo(i)}
                onMouseLeave={() => setActivo(null)}
                onFocus={() => setActivo(i)}
                onBlur={() => setActivo(null)}
                tabIndex={0}
                aria-label={`${d.fecha.toLocaleDateString(locale, { weekday: 'long', day: 'numeric' })}: ${moneda.format(d.total)}`}
              >
                <div
                  className={`w-full max-w-10 rounded-t-[4px] transition-colors ${
                    esHoy ? 'bg-brand-forest' : activo === i ? 'bg-brand-forest/80' : 'bg-brand-forest/45'
                  }`}
                  style={{ height: `${alto}%` }}
                />
                {activo === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                    <p className="font-medium text-text first-letter:uppercase">
                      {d.fecha.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="tabular mt-0.5 text-text">{moneda.format(d.total)}</p>
                    <p className="text-text-secondary">{t('dashboard.salesCount', { n: d.cantidad })}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-2 pr-16">
        {dias.map((d, i) => (
          <span
            key={d.clave}
            className={`flex-1 text-center text-xs first-letter:uppercase ${
              i === dias.length - 1 ? 'font-medium text-text' : 'text-text-secondary'
            }`}
          >
            {d.fecha.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')}
          </span>
        ))}
      </div>
    </div>
  );
}

function ComparacionAyer({ hoy, ayer }) {
  const { t } = useIdioma();
  if (ayer === 0 && hoy === 0) return <span>{t('dashboard.noSalesYet')}</span>;
  if (ayer === 0) return <span className="text-success">{t('dashboard.firstSalesVsYesterday')}</span>;
  const cambio = Math.round(((hoy - ayer) / ayer) * 100);
  const Icono = cambio > 0 ? TrendingUp : cambio < 0 ? TrendingDown : Minus;
  const color = cambio > 0 ? 'text-success' : cambio < 0 ? 'text-danger' : 'text-text-secondary';
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <Icono className="size-3.5" />
      {t('dashboard.vsYesterday', { pct: `${cambio > 0 ? '+' : ''}${cambio}%` })}
    </span>
  );
}

function Vacio({ texto }) {
  return <p className="py-6 text-center text-sm text-text-disabled">{texto}</p>;
}

function Cargando() {
  return (
    <div className="mx-auto max-w-7xl space-y-8" aria-busy="true">
      <div className="h-14 w-80 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="h-80 animate-pulse rounded-xl bg-muted lg:col-span-3" />
        <div className="h-80 animate-pulse rounded-xl bg-muted lg:col-span-2" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, locale } = useIdioma();
  const usuario = authService.obtenerUsuarioActual();
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    dashboardService
      .obtenerResumen()
      .then((data) => activo && setResumen(data))
      .catch(() => activo && setError(t('dashboard.loadError')));
    return () => {
      activo = false;
    };
  }, [t]);

  // La moneda se mantiene en pesos colombianos en cualquier idioma: es un
  // dato del negocio. El locale solo cambia separadores y nombres de dias.
  const moneda = new Intl.NumberFormat(locale, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  if (error) {
    return <p className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>;
  }
  if (!resumen) return <Cargando />;

  const primerNombre = usuario?.nombre?.split(' ')[0] ?? t('dashboard.welcomeFallback');
  const fechaHoy = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const puedeVender = puedeVer('/panel/ventas');
  const puedeComprar = puedeVer('/panel/compras');
  const bajas = resumen.dadosDeBajaLista;
  const maxVendido = Math.max(...resumen.masVendidos.map((p) => p.cantidad), 1);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary first-letter:uppercase">{fechaHoy}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {t(claveSaludo(), { nombre: primerNombre })}
          </h1>
        </div>
        <div className="flex gap-2">
          {puedeComprar && (
            <Link
              to="/panel/compras"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text transition-colors hover:bg-muted"
            >
              <Truck className="size-4" />
              {t('dashboard.newPurchase')}
            </Link>
          )}
          {puedeVender && (
            <Link
              to="/panel/ventas"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-forest px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-forest-dark"
            >
              <ShoppingCart className="size-4" />
              {t('dashboard.newSale')}
            </Link>
          )}
        </div>
      </div>

      {/* Aviso: lotes dados de baja que hay que retirar del estante */}
      {bajas.length > 0 && (
        <Link
          to="/panel/reportes"
          className="group flex items-center gap-4 rounded-xl border border-danger/30 bg-danger/5 p-4 transition-colors hover:bg-danger/10"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-danger/15 text-danger">
            <PackageX className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-text">
              {t('dashboard.writtenOffBanner', { n: bajas.length, unidades: bajas.reduce((s, l) => s + l.cantidadActual, 0) })}
            </p>
            <p className="text-sm text-text-secondary">{t('dashboard.writtenOffHint')}</p>
          </div>
          <ArrowRight className="size-4 text-text-secondary transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {resumen.puedeVerVentas && (
          <Indicador
            titulo={t('dashboard.todaySales')}
            valor={moneda.format(resumen.ventasHoyTotal)}
            icono={ShoppingCart}
            tono="bg-brand-forest-light text-brand-forest"
            to="/panel/facturas"
            detalle={
              <span className="flex flex-wrap items-center gap-x-2">
                {t('dashboard.salesCount', { n: resumen.ventasHoyCantidad })} ·
                <ComparacionAyer hoy={resumen.ventasHoyTotal} ayer={resumen.ventasAyerTotal} />
              </span>
            }
          />
        )}
        <Indicador
          titulo={t('dashboard.activeProducts')}
          valor={resumen.productosActivos}
          icono={Package}
          tono="bg-info/10 text-info"
          to="/panel/inventario"
          detalle={t('dashboard.inCatalog')}
        />
        <Indicador
          titulo={t('dashboard.lowStock')}
          valor={resumen.stockBajoCantidad}
          icono={AlertTriangle}
          tono="bg-accent-copper-light text-accent-copper"
          to="/panel/inventario"
          detalle={t('dashboard.belowMinimum')}
        />
        <Indicador
          titulo={t('dashboard.expiringSoon')}
          valor={resumen.proximosVencerCantidad}
          icono={CalendarClock}
          tono="bg-warning/10 text-warning"
          to="/panel/reportes"
          detalle={t('dashboard.lotsInAlert')}
        />
      </div>

      {/* Ventas de la semana + mas vendidos */}
      {resumen.puedeVerVentas && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Panel
            className="lg:col-span-3"
            titulo={t('dashboard.salesWeek')}
            subtitulo={t('dashboard.salesWeekTotal', { total: moneda.format(resumen.ventasSemanaTotal) })}
            accion={<VerTodo to="/panel/facturas" />}
          >
            <GraficoVentas dias={resumen.ventasSemana} moneda={moneda} locale={locale} />
          </Panel>

          <Panel className="lg:col-span-2" titulo={t('dashboard.topProducts')} subtitulo={t('dashboard.topProductsHint')}>
            {resumen.masVendidos.length === 0 ? (
              <Vacio texto={t('dashboard.noSalesMonth')} />
            ) : (
              <ol className="space-y-4">
                {resumen.masVendidos.map((p, i) => (
                  <li key={p.nombre}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="tabular w-4 shrink-0 text-xs text-text-disabled">{i + 1}</span>
                        <span className="truncate text-text">{p.nombre}</span>
                      </span>
                      <span className="tabular shrink-0 text-text-secondary">
                        {p.cantidad} {t('dashboard.units')}
                      </span>
                    </div>
                    <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand-forest" style={{ width: `${(p.cantidad / maxVendido) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      )}

      {/* Inventario */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel titulo={t('dashboard.lowStock')} accion={<VerTodo to="/panel/inventario" />}>
          {resumen.stockBajoLista.length === 0 ? (
            <Vacio texto={t('dashboard.noLowStock')} />
          ) : (
            <ul className="divide-y divide-border">
              {resumen.stockBajoLista.map((p) => (
                <li key={p.productoId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate text-text">{p.productoNombre}</span>
                  <span className="tabular shrink-0 rounded-full bg-accent-copper-light px-2 py-0.5 text-xs font-medium text-accent-copper">
                    {p.stockActual} / {p.stockMinimo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo={t('dashboard.expiringSoon')} accion={<VerTodo to="/panel/reportes" />}>
          {resumen.proximosVencerLista.length === 0 ? (
            <Vacio texto={t('dashboard.noExpiring')} />
          ) : (
            <ul className="divide-y divide-border">
              {resumen.proximosVencerLista.map((p) => (
                <li key={p.loteId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-text">{p.productoNombre}</span>
                    <span className="text-text-disabled"> · {t('dashboard.lot')} {p.numeroLote}</span>
                  </span>
                  <span className="tabular shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    {t('dashboard.expiresIn', { dias: p.diasParaVencer })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo={t('dashboard.writtenOff')} accion={<VerTodo to="/panel/reportes" />}>
          {bajas.length === 0 ? (
            <Vacio texto={t('dashboard.noWrittenOff')} />
          ) : (
            <ul className="divide-y divide-border">
              {bajas.slice(0, 5).map((p) => (
                <li key={p.loteId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-text line-through decoration-danger/50">{p.productoNombre}</span>
                    <span className="text-text-disabled"> · {p.cantidadActual} {t('dashboard.units')}</span>
                  </span>
                  <span className="tabular shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                    {p.diasParaVencer < 0
                      ? t('dashboard.expiredAgo', { dias: Math.abs(p.diasParaVencer) })
                      : t('dashboard.expiresIn', { dias: p.diasParaVencer })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

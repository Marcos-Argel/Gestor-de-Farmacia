import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Ban,
  TrendingUp,
  Truck,
  Users,
  UserCog,
  Building2,
  CreditCard,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { reporteService } from '../services/reporteService';
import { ventaService } from '../services/ventaService';
import { compraService } from '../services/compraService';
import { devolucionService } from '../services/devolucionService';
import BotonesExportar from '../components/BotonesExportar';
import logoFarmaArgel from '../assets/logo-farma-argel.png';
import { useIdioma } from '../context/LanguageContext';

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const moneda = (n) => formatoMoneda.format(n ?? 0);

function topN(mapa, n = 10) {
  return [...mapa.values()].sort((a, b) => b.orden - a.orden).slice(0, n);
}

function ultimosNDias(n) {
  const dias = [];
  for (let i = n - 1; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    dias.push(fecha.toISOString().slice(0, 10));
  }
  return dias;
}

export default function ReportesPage() {
  const { t } = useIdioma();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [tabActiva, setTabActiva] = useState('stock-bajo');

  const METODO_PAGO_LABEL = {
    EFECTIVO: t('ventas.metodoEfectivo'),
    TARJETA: t('ventas.metodoTarjeta'),
    TRANSFERENCIA: t('ventas.metodoTransferencia'),
    MIXTO: t('ventas.metodoMixto'),
  };

  const [stockBajo, setStockBajo] = useState([]);
  const [proximosVencer, setProximosVencer] = useState([]);
  const [malEstado, setMalEstado] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [devoluciones, setDevoluciones] = useState([]);

  useEffect(() => {
    setCargando(true);
    setError('');
    // allSettled: VENDEDOR no tiene permiso sobre compras e INVENTARIO no
    // lo tiene sobre ventas. Con Promise.all un solo 403 dejaba la pagina
    // entera en error; ahora esa seccion simplemente queda vacia.
    Promise.allSettled([
      reporteService.stockBajo(),
      reporteService.proximosAVencer(),
      reporteService.malEstado(),
      ventaService.listar(),
      compraService.listar(),
      devolucionService.listar(),
    ])
      .then((resultados) => {
        if (resultados.every((r) => r.status === 'rejected')) throw new Error('sin datos');
        const [sb, pv, me, v, c, d] = resultados.map((r) => (r.status === 'fulfilled' ? r.value : []));
        setStockBajo(sb);
        setProximosVencer([...pv].sort((a, b) => a.diasParaVencer - b.diasParaVencer));
        setMalEstado([...me].sort((a, b) => a.diasParaVencer - b.diasParaVencer));
        setVentas(v);
        setCompras(c);
        setDevoluciones(d);
      })
      .catch(() => setError(t('reportes.loadError')))
      .finally(() => setCargando(false));
  }, []);

  // ---- Reportes calculados a partir de ventas / compras / devoluciones reales ----

  const productosVendidos = useMemo(() => {
    const mapa = new Map();
    ventas.forEach((v) =>
      v.detalles?.forEach((d) => {
        const actual = mapa.get(d.productoNombre) ?? { productoNombre: d.productoNombre, cantidad: 0, total: 0 };
        actual.cantidad += d.cantidad;
        actual.total += d.subtotal;
        actual.orden = actual.cantidad;
        mapa.set(d.productoNombre, actual);
      })
    );
    return topN(mapa);
  }, [ventas]);

  const productosComprados = useMemo(() => {
    const mapa = new Map();
    compras.forEach((c) =>
      c.detalles?.forEach((d) => {
        const actual = mapa.get(d.productoNombre) ?? { productoNombre: d.productoNombre, cantidad: 0, total: 0 };
        actual.cantidad += d.cantidad;
        actual.total += d.subtotal;
        actual.orden = actual.cantidad;
        mapa.set(d.productoNombre, actual);
      })
    );
    return topN(mapa);
  }, [compras]);

  const mejoresClientes = useMemo(() => {
    const mapa = new Map();
    ventas.forEach((v) => {
      const nombre = v.clienteNombre || t('facturas.finalConsumer');
      const actual = mapa.get(nombre) ?? { clienteNombre: nombre, compras: 0, total: 0 };
      actual.compras += 1;
      actual.total += v.total;
      actual.orden = actual.total;
      mapa.set(nombre, actual);
    });
    return topN(mapa);
  }, [ventas]);

  const vendedores = useMemo(() => {
    const mapa = new Map();
    ventas.forEach((v) => {
      const nombre = v.usuarioNombre || '—';
      const actual = mapa.get(nombre) ?? { usuarioNombre: nombre, ventas: 0, total: 0 };
      actual.ventas += 1;
      actual.total += v.total;
      actual.orden = actual.total;
      mapa.set(nombre, actual);
    });
    return topN(mapa);
  }, [ventas]);

  const proveedoresTop = useMemo(() => {
    const mapa = new Map();
    compras.forEach((c) => {
      const nombre = c.proveedorEmpresa || '—';
      const actual = mapa.get(nombre) ?? { proveedorEmpresa: nombre, compras: 0, total: 0 };
      actual.compras += 1;
      actual.total += c.total;
      actual.orden = actual.total;
      mapa.set(nombre, actual);
    });
    return topN(mapa);
  }, [compras]);

  const ventasPorMetodoPago = useMemo(() => {
    const mapa = new Map();
    ventas.forEach((v) => {
      const metodo = METODO_PAGO_LABEL[v.metodoPago] ?? v.metodoPago;
      const actual = mapa.get(metodo) ?? { metodo, ventas: 0, total: 0 };
      actual.ventas += 1;
      actual.total += v.total;
      actual.orden = actual.total;
      mapa.set(metodo, actual);
    });
    return topN(mapa);
  }, [ventas]);

  const productosDevueltos = useMemo(() => {
    const mapa = new Map();
    devoluciones.forEach((d) => {
      const actual = mapa.get(d.productoNombre) ?? { productoNombre: d.productoNombre, vecesDevuelto: 0, cantidad: 0 };
      actual.vecesDevuelto += 1;
      actual.cantidad += d.cantidad;
      actual.orden = actual.cantidad;
      mapa.set(d.productoNombre, actual);
    });
    return topN(mapa);
  }, [devoluciones]);

  const ventasPorDia = useMemo(() => {
    const dias = ultimosNDias(7);
    const mapa = new Map(dias.map((f) => [f, { fecha: f, ventas: 0, total: 0 }]));
    ventas.forEach((v) => {
      const clave = v.fecha?.slice(0, 10);
      if (mapa.has(clave)) {
        const actual = mapa.get(clave);
        actual.ventas += 1;
        actual.total += v.total;
      }
    });
    return dias.map((f) => ({
      ...mapa.get(f),
      fecha: new Date(f + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }),
    }));
  }, [ventas]);

  const TABS = [
    { id: 'stock-bajo', label: t('reportes.tabLowStock'), icono: AlertTriangle },
    { id: 'proximos-vencer', label: t('reportes.tabExpiringSoon'), icono: CalendarClock },
    { id: 'mal-estado', label: t('reportes.tabBadCondition'), icono: Ban },
    { id: 'productos-vendidos', label: t('reportes.tabTopSold'), icono: TrendingUp },
    { id: 'productos-comprados', label: t('reportes.tabTopPurchased'), icono: Truck },
    { id: 'mejores-clientes', label: t('reportes.tabTopClients'), icono: Users },
    { id: 'vendedores', label: t('reportes.tabTopSellers'), icono: UserCog },
    { id: 'proveedores', label: t('reportes.tabTopSuppliers'), icono: Building2 },
    { id: 'metodo-pago', label: t('reportes.tabPaymentMethods'), icono: CreditCard },
    { id: 'devoluciones', label: t('reportes.tabTopReturned'), icono: RotateCcw },
    { id: 'ventas-dia', label: t('reportes.tabSalesByDay'), icono: BarChart3 },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-white border border-border rounded-xl p-1.5 shrink-0">
          <img src={logoFarmaArgel} alt="Farma Argel" className="h-9 w-9 object-contain" />
        </div>
        <div>
          <h1 className="font-display font-semibold text-2xl text-text">{t('reportes.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {t('reportes.subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-5">{error}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => {
          const Icono = t.icono;
          return (
            <button
              key={t.id}
              onClick={() => setTabActiva(t.id)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                tabActiva === t.id
                  ? 'bg-brand-forest text-white border-brand-forest'
                  : 'border-border text-text-secondary hover:bg-bg'
              }`}
            >
              <Icono className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {cargando ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {tabActiva === 'stock-bajo' && (
            <ReporteTabla
              titulo={t('reportes.lowStockTitle')}
              filas={stockBajo}
              columnas={[
                { clave: 'productoNombre', etiqueta: t('reportes.colProduct') },
                { clave: 'stockActual', etiqueta: t('reportes.colCurrentStock') },
                { clave: 'stockMinimo', etiqueta: t('reportes.colMinStock') },
              ]}
              vacio={t('reportes.noLowStock')}
              render={(p) => [p.productoNombre, p.stockActual, p.stockMinimo]}
            />
          )}

          {tabActiva === 'proximos-vencer' && (
            <ReporteTabla
              titulo={t('reportes.expiringTitle')}
              filas={proximosVencer}
              columnas={[
                { clave: 'productoNombre', etiqueta: t('reportes.colProduct') },
                { clave: 'numeroLote', etiqueta: t('reportes.colLot') },
                { clave: 'diasParaVencer', etiqueta: t('reportes.colDaysToExpire') },
              ]}
              vacio={t('reportes.noExpiring')}
              render={(p) => [p.productoNombre, p.numeroLote, t('reportes.daysSuffix', { n: p.diasParaVencer })]}
            />
          )}

          {tabActiva === 'mal-estado' && (
            <ReporteTabla
              titulo={t('reportes.badConditionTitle')}
              filas={malEstado}
              columnas={[
                { clave: 'productoNombre', etiqueta: t('reportes.colProduct') },
                { clave: 'numeroLote', etiqueta: t('reportes.colLot') },
                { clave: 'cantidadActual', etiqueta: t('reportes.colCurrentStock') },
                { clave: 'diasParaVencer', etiqueta: t('reportes.colDaysToExpire') },
              ]}
              vacio={t('reportes.noBadCondition')}
              render={(p) => [
                p.productoNombre,
                p.numeroLote,
                p.cantidadActual,
                p.diasParaVencer < 0
                  ? t('reportes.expiredSuffix', { n: Math.abs(p.diasParaVencer) })
                  : t('reportes.daysSuffix', { n: p.diasParaVencer }),
              ]}
            />
          )}

          {tabActiva === 'productos-vendidos' && (
            <ReporteTabla
              titulo={t('reportes.topSoldTitle')}
              filas={productosVendidos}
              columnas={[
                { clave: 'productoNombre', etiqueta: t('reportes.colProduct') },
                { clave: 'cantidad', etiqueta: t('reportes.colUnitsSold') },
                { clave: 'total', etiqueta: t('reportes.colTotalGenerated') },
              ]}
              vacio={t('reportes.noSalesYet')}
              render={(p) => [p.productoNombre, p.cantidad, moneda(p.total)]}
            />
          )}

          {tabActiva === 'productos-comprados' && (
            <ReporteTabla
              titulo={t('reportes.topPurchasedTitle')}
              filas={productosComprados}
              columnas={[
                { clave: 'productoNombre', etiqueta: t('reportes.colProduct') },
                { clave: 'cantidad', etiqueta: t('reportes.colUnitsPurchased') },
                { clave: 'total', etiqueta: t('reportes.colTotalInvested') },
              ]}
              vacio={t('reportes.noPurchasesYet')}
              render={(p) => [p.productoNombre, p.cantidad, moneda(p.total)]}
            />
          )}

          {tabActiva === 'mejores-clientes' && (
            <ReporteTabla
              titulo={t('reportes.topClientsTitle')}
              filas={mejoresClientes}
              columnas={[
                { clave: 'clienteNombre', etiqueta: t('reportes.colClient') },
                { clave: 'compras', etiqueta: t('reportes.colPurchasesMade') },
                { clave: 'total', etiqueta: t('reportes.colTotalSpent') },
              ]}
              vacio={t('reportes.noSalesYet')}
              render={(p) => [p.clienteNombre, p.compras, moneda(p.total)]}
            />
          )}

          {tabActiva === 'vendedores' && (
            <ReporteTabla
              titulo={t('reportes.topSellersTitle')}
              filas={vendedores}
              columnas={[
                { clave: 'usuarioNombre', etiqueta: t('reportes.colUser') },
                { clave: 'ventas', etiqueta: t('reportes.colSalesMade') },
                { clave: 'total', etiqueta: t('reportes.colTotalSold') },
              ]}
              vacio={t('reportes.noSalesYet')}
              render={(p) => [p.usuarioNombre, p.ventas, moneda(p.total)]}
            />
          )}

          {tabActiva === 'proveedores' && (
            <ReporteTabla
              titulo={t('reportes.topSuppliersTitle')}
              filas={proveedoresTop}
              columnas={[
                { clave: 'proveedorEmpresa', etiqueta: t('reportes.colSupplier') },
                { clave: 'compras', etiqueta: t('reportes.colPurchasesMade') },
                { clave: 'total', etiqueta: t('reportes.colTotalPurchased') },
              ]}
              vacio={t('reportes.noPurchasesYet')}
              render={(p) => [p.proveedorEmpresa, p.compras, moneda(p.total)]}
            />
          )}

          {tabActiva === 'metodo-pago' && (
            <ReporteTabla
              titulo={t('reportes.paymentMethodTitle')}
              filas={ventasPorMetodoPago}
              columnas={[
                { clave: 'metodo', etiqueta: t('reportes.colPaymentMethod') },
                { clave: 'ventas', etiqueta: t('reportes.colSalesCount') },
                { clave: 'total', etiqueta: t('reportes.colTotal') },
              ]}
              vacio={t('reportes.noSalesYet')}
              render={(p) => [p.metodo, p.ventas, moneda(p.total)]}
            />
          )}

          {tabActiva === 'devoluciones' && (
            <ReporteTabla
              titulo={t('reportes.topReturnedTitle')}
              filas={productosDevueltos}
              columnas={[
                { clave: 'productoNombre', etiqueta: t('reportes.colProduct') },
                { clave: 'vecesDevuelto', etiqueta: t('reportes.colTimesReturned') },
                { clave: 'cantidad', etiqueta: t('reportes.colUnitsReturned') },
              ]}
              vacio={t('reportes.noReturns')}
              render={(p) => [p.productoNombre, p.vecesDevuelto, p.cantidad]}
            />
          )}

          {tabActiva === 'ventas-dia' && (
            <ReporteTabla
              titulo={t('reportes.salesByDayTitle')}
              filas={ventasPorDia}
              columnas={[
                { clave: 'fecha', etiqueta: t('reportes.colDay') },
                { clave: 'ventas', etiqueta: t('reportes.colSalesCount') },
                { clave: 'total', etiqueta: t('reportes.colTotal') },
              ]}
              vacio={t('reportes.noSalesYet')}
              render={(p) => [p.fecha, p.ventas, moneda(p.total)]}
              permitirVacio
            />
          )}
        </>
      )}
    </div>
  );
}

function ReporteTabla({ titulo, filas, columnas, vacio, render, permitirVacio }) {
  const hayFilas = permitirVacio || filas.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-sm text-text">
          {titulo} {hayFilas && `(${filas.length})`}
        </h2>
        <BotonesExportar titulo={titulo} columnas={columnas} filas={filas} />
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {!hayFilas ? (
          <p className="text-sm text-text-secondary px-5 py-6">{vacio}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-forest text-left text-xs text-white/90 uppercase tracking-wide">
                {columnas.map((c) => (
                  <th key={c.clave} className="px-5 py-3 font-medium">
                    {c.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-brand-forest-light/60' : 'bg-surface'}>
                  {render(fila).map((valor, j) => (
                    <td key={j} className="px-5 py-2.5 text-text">
                      {valor}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

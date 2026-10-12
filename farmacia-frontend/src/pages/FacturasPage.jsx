import { useEffect, useMemo, useState } from 'react';
import { Search, Receipt, CalendarRange, X as XIcon, Eye } from 'lucide-react';
import { ventaService } from '../services/ventaService';
import BotonesExportar from '../components/BotonesExportar';
import FacturaDetalleModal from '../components/FacturaDetalleModal';
import { useIdioma } from '../context/LanguageContext';

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const moneda = (n) => formatoMoneda.format(n ?? 0);

export default function FacturasPage() {
  const { t } = useIdioma();

  const METODO_PAGO_LABEL = {
    EFECTIVO: t('ventas.metodoEfectivo'),
    TARJETA: t('ventas.metodoTarjeta'),
    TRANSFERENCIA: t('ventas.metodoTransferencia'),
    MIXTO: t('ventas.metodoMixto'),
  };

  const COLUMNAS_EXPORT = [
    { clave: 'id', etiqueta: t('facturas.colInvoiceNumber') },
    { clave: 'fecha', etiqueta: t('facturas.colDate') },
    { clave: 'cliente', etiqueta: t('facturas.colClient') },
    { clave: 'vendedor', etiqueta: t('facturas.colAttendedBy') },
    { clave: 'metodoPago', etiqueta: t('facturas.colPaymentMethod') },
    { clave: 'total', etiqueta: t('facturas.colTotal') },
    { clave: 'estado', etiqueta: t('facturas.colStatus') },
  ];
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  useEffect(() => {
    cargar();
  }, []);

  function cargar() {
    setCargando(true);
    ventaService
      .listar()
      // El backend ya las devuelve de la mas reciente a la mas vieja.
      .then(setVentas)
      .catch(() => {})
      .finally(() => setCargando(false));
  }

  const ventasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return ventas.filter((v) => {
      if (texto) {
        const coincideCliente = (v.clienteNombre ?? 'cliente general').toLowerCase().includes(texto);
        const coincideId = String(v.id).includes(texto);
        if (!coincideCliente && !coincideId) return false;
      }
      if (metodoPago && v.metodoPago !== metodoPago) return false;
      const fechaSolo = v.fecha?.slice(0, 10);
      if (fechaDesde && fechaSolo < fechaDesde) return false;
      if (fechaHasta && fechaSolo > fechaHasta) return false;
      return true;
    });
  }, [ventas, busqueda, fechaDesde, fechaHasta, metodoPago]);

  const filasExport = useMemo(
    () =>
      ventasFiltradas.map((v) => ({
        id: v.id,
        fecha: v.fecha ? new Date(v.fecha).toLocaleString('es-CO') : '',
        cliente: v.clienteNombre ?? t('facturas.finalConsumer'),
        vendedor: v.usuarioNombre ?? '',
        metodoPago: METODO_PAGO_LABEL[v.metodoPago] ?? v.metodoPago,
        total: Number(v.total ?? 0),
        estado: v.estado === 'ANULADA' ? t('facturas.statusVoided') : t('facturas.statusCompleted'),
      })),
    [ventasFiltradas]
  );

  function limpiarFiltros() {
    setBusqueda('');
    setFechaDesde('');
    setFechaHasta('');
    setMetodoPago('');
  }

  const hayFiltrosActivos = busqueda || fechaDesde || fechaHasta || metodoPago;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-text">{t('facturas.title')}</h1>
          <p className="text-text-secondary text-sm mt-1">
            {t('facturas.subtitle')}
          </p>
        </div>
        <BotonesExportar titulo={t('facturas.title')} columnas={COLUMNAS_EXPORT} filas={filasExport} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t('facturas.searchPlaceholder')}
            className="w-full text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
          />
        </div>

        <select
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
        >
          <option value="">{t('facturas.allMethods')}</option>
          {Object.entries(METODO_PAGO_LABEL).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 text-text-secondary">
          <CalendarRange className="w-4 h-4" />
          <span className="text-xs">{t('facturas.from')}</span>
        </div>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="text-sm border border-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
        />
        <span className="text-xs text-text-secondary">{t('facturas.to')}</span>
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="text-sm border border-border rounded-lg px-2.5 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
        />

        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text px-2 py-2 rounded-lg hover:bg-bg transition-colors"
          >
            <XIcon className="w-3.5 h-3.5" />
            {t('facturas.clearFilters')}
          </button>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {cargando ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded bg-bg animate-pulse" />
            ))}
          </div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
              <Receipt className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-text mb-1">
              {ventas.length === 0 ? t('facturas.noSalesYet') : t('facturas.noMatchFilters')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-secondary uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">{t('facturas.colNumber')}</th>
                  <th className="px-5 py-3 font-medium">{t('facturas.colDate')}</th>
                  <th className="px-5 py-3 font-medium">{t('facturas.colClient')}</th>
                  <th className="px-5 py-3 font-medium">{t('facturas.colAttendedBy')}</th>
                  <th className="px-5 py-3 font-medium">{t('facturas.colPaymentMethod')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('facturas.colTotal')}</th>
                  <th className="px-5 py-3 font-medium">{t('facturas.colStatus')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('facturas.colView')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ventasFiltradas.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-bg transition-colors cursor-pointer"
                    onClick={() => setVentaSeleccionada(v)}
                  >
                    <td className="px-5 py-3 text-text font-medium">#{v.id}</td>
                    <td className="px-5 py-3 text-text-secondary">
                      {v.fecha ? new Date(v.fecha).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td className="px-5 py-3 text-text">{v.clienteNombre ?? t('facturas.finalConsumer')}</td>
                    <td className="px-5 py-3 text-text-secondary">{v.usuarioNombre ?? '—'}</td>
                    <td className="px-5 py-3 text-text-secondary">
                      {METODO_PAGO_LABEL[v.metodoPago] ?? v.metodoPago}
                    </td>
                    <td className="px-5 py-3 text-right text-text font-medium">{moneda(v.total)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          v.estado === 'ANULADA'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-brand-forest-light text-brand-forest'
                        }`}
                      >
                        {v.estado === 'ANULADA' ? t('facturas.statusVoided') : t('facturas.statusCompleted')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVentaSeleccionada(v);
                        }}
                        className="p-1.5 text-text-secondary hover:text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors"
                        aria-label={t('facturas.viewInvoiceAria', { id: v.id })}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ventaSeleccionada && (
        <FacturaDetalleModal venta={ventaSeleccionada} onClose={() => setVentaSeleccionada(null)} />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, Truck, CheckCircle2, Package, CalendarRange, X as XIcon } from 'lucide-react';
import { productoService } from '../services/productoService';
import { proveedorService } from '../services/proveedorService';
import { compraService } from '../services/compraService';
import { useIdioma } from '../context/LanguageContext';

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const inputClase =
  'w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface';
const labelClase = 'block text-xs font-medium text-text-secondary mb-1.5';

function manana() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  return fecha.toISOString().split('T')[0];
}

export default function ComprasPage() {
  const { t } = useIdioma();
  const [proveedores, setProveedores] = useState([]);
  const [proveedorId, setProveedorId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const [detalles, setDetalles] = useState([]);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [compraConfirmada, setCompraConfirmada] = useState(null);

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    proveedorService.listar().then(setProveedores).catch(() => {});
    cargarHistorial();
  }, []);

  function cargarHistorial() {
    setCargandoHistorial(true);
    compraService
      .listar()
      .then(setHistorial)
      .catch(() => {})
      .finally(() => setCargandoHistorial(false));
  }

  // El backend ya devuelve el historial ordenado por fecha (mas reciente
  // primero). Sin filtro se muestran solo las 8 mas recientes (como antes);
  // en cuanto se elige una fecha, se muestran TODAS las que caigan en el
  // rango, sin ese tope de 8.
  const historialFiltrado = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return historial.slice(0, 8);
    return historial.filter((c) => {
      const fechaSolo = c.fecha?.slice(0, 10);
      if (!fechaSolo) return false;
      if (fechaDesde && fechaSolo < fechaDesde) return false;
      if (fechaHasta && fechaSolo > fechaHasta) return false;
      return true;
    });
  }, [historial, fechaDesde, fechaHasta]);

  function limpiarFiltroFechas() {
    setFechaDesde('');
    setFechaHasta('');
  }

  useEffect(() => {
    if (!busqueda.trim()) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const timeout = setTimeout(() => {
      productoService
        .listar(busqueda.trim())
        .then((data) => setResultados(data.slice(0, 6)))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  function agregarLinea(producto) {
    setDetalles((prev) => [
      ...prev,
      {
        clave: `${producto.id}-${Date.now()}`,
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precioUnitario: producto.precioCompra ?? 0,
        numeroLote: '',
        fechaVencimiento: '',
      },
    ]);
    setBusqueda('');
    setResultados([]);
  }

  function actualizarLinea(clave, campo, valor) {
    setDetalles((prev) => prev.map((d) => (d.clave === clave ? { ...d, [campo]: valor } : d)));
  }

  function quitarLinea(clave) {
    setDetalles((prev) => prev.filter((d) => d.clave !== clave));
  }

  function limpiarCompra() {
    setDetalles([]);
    setProveedorId('');
    setNumeroFactura('');
    setError('');
  }

  const total = detalles.reduce((suma, d) => suma + (Number(d.precioUnitario) || 0) * (Number(d.cantidad) || 0), 0);

  async function manejarRegistrar() {
    setError('');

    if (!proveedorId) {
      setError(t('compras.errorSelectSupplier'));
      return;
    }
    if (detalles.length === 0) {
      setError(t('compras.errorEmptyDetails'));
      return;
    }
    for (const d of detalles) {
      if (!d.numeroLote.trim()) {
        setError(t('compras.errorMissingLot', { nombre: d.nombre }));
        return;
      }
      if (!d.fechaVencimiento) {
        setError(t('compras.errorMissingExpiration', { nombre: d.nombre }));
        return;
      }
      if (!(Number(d.cantidad) > 0)) {
        setError(t('compras.errorInvalidQuantity', { nombre: d.nombre }));
        return;
      }
    }

    const payload = {
      proveedorId: Number(proveedorId),
      numeroFactura: numeroFactura.trim() || null,
      detalles: detalles.map((d) => ({
        productoId: d.productoId,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        numeroLote: d.numeroLote.trim(),
        fechaVencimiento: d.fechaVencimiento,
      })),
    };

    setGuardando(true);
    try {
      const compra = await compraService.crear(payload);
      setCompraConfirmada(compra);
      limpiarCompra();
      cargarHistorial();
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje || err.response?.data?.message || t('compras.errorGeneric');
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-text">{t('compras.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {t('compras.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-surface border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>{t('compras.supplierLabel')}</label>
              <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={inputClase}>
                <option value="">{t('compras.selectPlaceholder')}</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.empresa}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClase}>{t('compras.invoiceNumberLabel')}</label>
              <input
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder={t('compras.optional')}
                className={inputClase}
              />
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-text-disabled absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t('compras.searchPlaceholder')}
              className={`${inputClase} pl-9`}
            />
            {(resultados.length > 0 || buscando) && (
              <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                {buscando ? (
                  <p className="px-4 py-3 text-sm text-text-secondary">{t('compras.searching')}</p>
                ) : (
                  resultados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => agregarLinea(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-bg transition-colors flex items-center justify-between gap-3"
                    >
                      <span className="text-sm font-medium text-text truncate">{p.nombre}</span>
                      <span className="text-xs text-text-disabled shrink-0">
                        {t('compras.currentCost', { monto: formatoMoneda.format(p.precioCompra ?? 0) })}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {detalles.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
                  <Package className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-text mb-1">{t('compras.emptyTitle')}</p>
                <p className="text-sm text-text-secondary">{t('compras.emptyHint')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {detalles.map((d) => (
                  <div key={d.clave} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="font-medium text-text text-sm">{d.nombre}</p>
                      <button
                        onClick={() => quitarLinea(d.clave)}
                        className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                        aria-label={t('compras.removeAria', { nombre: d.nombre })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className={labelClase}>{t('compras.quantityLabel')}</label>
                        <input
                          type="number"
                          min="1"
                          value={d.cantidad}
                          onChange={(e) => actualizarLinea(d.clave, 'cantidad', e.target.value)}
                          className={inputClase}
                        />
                      </div>
                      <div>
                        <label className={labelClase}>{t('compras.unitPriceLabel')}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={d.precioUnitario}
                          onChange={(e) => actualizarLinea(d.clave, 'precioUnitario', e.target.value)}
                          className={inputClase}
                        />
                      </div>
                      <div>
                        <label className={labelClase}>{t('compras.lotNumberLabel')}</label>
                        <input
                          value={d.numeroLote}
                          onChange={(e) => actualizarLinea(d.clave, 'numeroLote', e.target.value)}
                          placeholder={t('compras.lotPlaceholder')}
                          className={inputClase}
                        />
                      </div>
                      <div>
                        <label className={labelClase}>{t('compras.expirationLabel')}</label>
                        <input
                          type="date"
                          min={manana()}
                          value={d.fechaVencimiento}
                          onChange={(e) => actualizarLinea(d.clave, 'fechaVencimiento', e.target.value)}
                          className={inputClase}
                        />
                      </div>
                    </div>
                    <p className="text-right text-sm font-medium text-text mt-2">
                      {t('compras.subtotalLine', { monto: formatoMoneda.format((Number(d.precioUnitario) || 0) * (Number(d.cantidad) || 0)) })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <h2 className="font-display font-semibold text-sm text-text">{t('compras.recentPurchasesTitle')}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span className="text-xs">{t('compras.from')}</span>
                </div>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="text-xs border border-border rounded-lg px-2 py-1 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
                />
                <span className="text-xs text-text-secondary">{t('compras.to')}</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="text-xs border border-border rounded-lg px-2 py-1 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
                />
                {(fechaDesde || fechaHasta) && (
                  <button
                    onClick={limpiarFiltroFechas}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-text px-1.5 py-1 rounded-lg hover:bg-bg transition-colors"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                    {t('compras.clear')}
                  </button>
                )}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {cargandoHistorial ? (
                <div className="p-4 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 rounded bg-bg animate-pulse" />
                  ))}
                </div>
              ) : historialFiltrado.length === 0 ? (
                <p className="text-sm text-text-secondary px-5 py-4">
                  {historial.length === 0
                    ? t('compras.noPurchasesYet')
                    : t('compras.noPurchasesInRange')}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {historialFiltrado.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-2.5 text-text-secondary whitespace-nowrap">
                          {new Date(c.fecha).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-2.5 text-text">{c.proveedorEmpresa}</td>
                        <td className="px-5 py-2.5 text-text-secondary">{c.numeroFactura || '—'}</td>
                        <td className="px-5 py-2.5 text-right font-medium text-text">
                          {formatoMoneda.format(c.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 h-fit space-y-4 lg:sticky lg:top-20">
          <h2 className="font-display font-semibold text-sm text-text">{t('compras.summaryTitle')}</h2>

          <div className="flex justify-between text-sm text-text-secondary">
            <span>{t('compras.productsLabel')}</span>
            <span>{detalles.length}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-text border-t border-border pt-3">
            <span>{t('compras.total')}</span>
            <span>{formatoMoneda.format(total)}</span>
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={manejarRegistrar}
            disabled={guardando || detalles.length === 0}
            className="w-full bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-3 transition-colors"
          >
            {guardando ? t('compras.registering') : t('compras.registerButton')}
          </button>
        </div>
      </div>

      {compraConfirmada && (
        <CompraConfirmadaModal compra={compraConfirmada} onClose={() => setCompraConfirmada(null)} />
      )}
    </div>
  );
}

function CompraConfirmadaModal({ compra, onClose }) {
  const { t } = useIdioma();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-4">
          <div className="w-14 h-14 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7 text-brand-forest" strokeWidth={1.75} />
          </div>
          <h2 className="font-display font-semibold text-lg text-text">{t('compras.confirmedTitle')}</h2>
          <p className="text-sm text-text-secondary mt-1">
            {t('compras.purchaseNumber', { id: compra.id })} · {compra.proveedorEmpresa}
          </p>
        </div>

        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
            <Truck className="w-3.5 h-3.5" />
            {t('compras.lotsCreated')}
          </div>
          <div className="border border-border rounded-lg divide-y divide-border">
            {compra.detalles.map((d, i) => (
              <div key={i} className="px-3 py-2 text-sm flex justify-between">
                <div>
                  <p className="text-text">{d.productoNombre}</p>
                  <p className="text-xs text-text-disabled">{t('compras.lot', { numero: d.numeroLote, cantidad: d.cantidad })}</p>
                </div>
                <span className="text-text font-medium">{formatoMoneda.format(d.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex justify-between text-base font-semibold text-text mb-4">
            <span>{t('compras.total')}</span>
            <span>{formatoMoneda.format(compra.total)}</span>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
          >
            {t('compras.newPurchase')}
          </button>
        </div>
      </div>
    </div>
  );
}

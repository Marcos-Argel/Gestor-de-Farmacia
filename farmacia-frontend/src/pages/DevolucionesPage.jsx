import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, CheckCircle2, CalendarRange, X as XIcon } from 'lucide-react';
import { devolucionService } from '../services/devolucionService';
import { productoService } from '../services/productoService';
import { ventaService } from '../services/ventaService';
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

const VALORES_INICIALES = {
  tipo: 'VENTA',
  ventaId: '',
  compraId: '',
  productoId: '',
  cantidad: '',
  motivo: '',
  montoReembolso: '',
  reingresarStock: true,
};

export default function DevolucionesPage() {
  const { t } = useIdioma();
  const [form, setForm] = useState(VALORES_INICIALES);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    productoService.listar().then(setProductos).catch(() => {});
    ventaService.listar().then((data) => setVentas(data.slice(0, 30))).catch(() => {});
    compraService.listar().then((data) => setCompras(data.slice(0, 30))).catch(() => {});
    cargarHistorial();
  }, []);

  function cargarHistorial() {
    setCargandoHistorial(true);
    devolucionService
      .listar()
      .then(setHistorial)
      .catch(() => {})
      .finally(() => setCargandoHistorial(false));
  }

  // El backend ya devuelve el historial ordenado por fecha (mas reciente
  // primero). Este filtro es client-side para no tener que tocar el
  // endpoint: compara solo la parte de fecha (YYYY-MM-DD), ignorando la
  // hora, contra el rango que elija el usuario.
  const historialFiltrado = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return historial;
    return historial.filter((d) => {
      const fechaSolo = d.fecha?.slice(0, 10);
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

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function cambiarTipo(tipo) {
    setForm({ ...VALORES_INICIALES, tipo });
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.tipo === 'VENTA' && !form.ventaId) {
      setError(t('devoluciones.errorSelectSale'));
      return;
    }
    if (form.tipo === 'COMPRA' && !form.compraId) {
      setError(t('devoluciones.errorSelectPurchase'));
      return;
    }
    if (!form.productoId) {
      setError(t('devoluciones.errorSelectProduct'));
      return;
    }
    if (!form.cantidad || Number(form.cantidad) <= 0) {
      setError(t('devoluciones.errorInvalidQuantity'));
      return;
    }
    if (!form.motivo.trim()) {
      setError(t('devoluciones.errorReasonRequired'));
      return;
    }

    const payload = {
      tipo: form.tipo,
      ventaId: form.tipo === 'VENTA' ? Number(form.ventaId) : null,
      compraId: form.tipo === 'COMPRA' ? Number(form.compraId) : null,
      productoId: Number(form.productoId),
      cantidad: Number(form.cantidad),
      motivo: form.motivo.trim(),
      montoReembolso: form.montoReembolso ? Number(form.montoReembolso) : null,
      reingresarStock: form.tipo === 'VENTA' ? form.reingresarStock : null,
    };

    setGuardando(true);
    try {
      const devolucion = await devolucionService.registrar(payload);
      setConfirmacion(devolucion);
      setForm(VALORES_INICIALES);
      cargarHistorial();
    } catch (err) {
      setError(err.response?.data?.mensaje || t('devoluciones.errorGeneric'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-text">{t('devoluciones.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {t('devoluciones.subtitle')}
        </p>
      </div>

      <form onSubmit={manejarSubmit} className="bg-surface border border-border rounded-xl p-5 space-y-4 mb-8">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cambiarTipo('VENTA')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
              form.tipo === 'VENTA'
                ? 'bg-brand-forest text-white border-brand-forest'
                : 'border-border text-text-secondary hover:bg-bg'
            }`}
          >
            {t('devoluciones.saleReturnTab')}
          </button>
          <button
            type="button"
            onClick={() => cambiarTipo('COMPRA')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
              form.tipo === 'COMPRA'
                ? 'bg-brand-forest text-white border-brand-forest'
                : 'border-border text-text-secondary hover:bg-bg'
            }`}
          >
            {t('devoluciones.purchaseReturnTab')}
          </button>
        </div>

        <div>
          <label className={labelClase}>{form.tipo === 'VENTA' ? t('devoluciones.originSaleLabel') : t('devoluciones.originPurchaseLabel')}</label>
          {form.tipo === 'VENTA' ? (
            <select value={form.ventaId} onChange={(e) => actualizarCampo('ventaId', e.target.value)} className={inputClase}>
              <option value="">{t('devoluciones.selectPlaceholder')}</option>
              {ventas.map((v) => (
                <option key={v.id} value={v.id}>
                  #{v.id} · {new Date(v.fecha).toLocaleDateString('es-CO')} · {v.clienteNombre} ·{' '}
                  {formatoMoneda.format(v.total)}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={form.compraId}
              onChange={(e) => actualizarCampo('compraId', e.target.value)}
              className={inputClase}
            >
              <option value="">{t('devoluciones.selectPlaceholder')}</option>
              {compras.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} · {new Date(c.fecha).toLocaleDateString('es-CO')} · {c.proveedorEmpresa} ·{' '}
                  {formatoMoneda.format(c.total)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClase}>{t('devoluciones.productLabel')}</label>
            <select
              value={form.productoId}
              onChange={(e) => actualizarCampo('productoId', e.target.value)}
              className={inputClase}
            >
              <option value="">{t('devoluciones.selectPlaceholder')}</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClase}>{t('devoluciones.quantityLabel')}</label>
            <input
              type="number"
              min="1"
              value={form.cantidad}
              onChange={(e) => actualizarCampo('cantidad', e.target.value)}
              className={inputClase}
            />
          </div>
        </div>

        <div>
          <label className={labelClase}>{t('devoluciones.reasonLabel')}</label>
          <input
            value={form.motivo}
            onChange={(e) => actualizarCampo('motivo', e.target.value)}
            placeholder={t('devoluciones.reasonPlaceholder')}
            className={inputClase}
          />
        </div>

        {form.tipo === 'VENTA' && (
          <label className="flex items-start gap-2.5 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={form.reingresarStock}
              onChange={(e) => actualizarCampo('reingresarStock', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border text-brand-forest focus:ring-brand-forest"
            />
            <span>
              <span className="block text-sm text-text">{t('devoluciones.restock')}</span>
              <span className="block text-xs text-text-secondary">{t('devoluciones.restockHint')}</span>
            </span>
          </label>
        )}

        {form.tipo === 'VENTA' && (
          <div className="max-w-xs">
            <label className={labelClase}>{t('devoluciones.refundAmountLabel')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.montoReembolso}
              onChange={(e) => actualizarCampo('montoReembolso', e.target.value)}
              placeholder="0"
              className={inputClase}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2.5 transition-colors"
        >
          {guardando ? t('devoluciones.registering') : t('devoluciones.registerButton')}
        </button>
      </form>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h2 className="font-display font-semibold text-sm text-text">{t('devoluciones.historyTitle')}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <CalendarRange className="w-4 h-4" />
            <span className="text-xs">{t('devoluciones.from')}</span>
          </div>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
          />
          <span className="text-xs text-text-secondary">{t('devoluciones.to')}</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
          />
          {(fechaDesde || fechaHasta) && (
            <button
              onClick={limpiarFiltroFechas}
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-text px-2 py-1.5 rounded-lg hover:bg-bg transition-colors"
            >
              <XIcon className="w-3.5 h-3.5" />
              {t('devoluciones.clear')}
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
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
              <RotateCcw className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-text mb-1">
              {historial.length === 0
                ? t('devoluciones.noReturnsYet')
                : t('devoluciones.noReturnsInRange')}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-secondary uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">{t('devoluciones.colDate')}</th>
                <th className="px-5 py-3 font-medium">{t('devoluciones.colType')}</th>
                <th className="px-5 py-3 font-medium">{t('devoluciones.colProduct')}</th>
                <th className="px-5 py-3 font-medium">{t('devoluciones.colQuantity')}</th>
                <th className="px-5 py-3 font-medium">{t('devoluciones.colReason')}</th>
                <th className="px-5 py-3 font-medium">{t('devoluciones.colUser')}</th>
              </tr>
            </thead>
            <tbody>
              {historialFiltrado.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 text-text-secondary whitespace-nowrap">
                    {new Date(d.fecha).toLocaleString('es-CO')}
                  </td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        d.tipo === 'VENTA'
                          ? 'text-brand-forest bg-brand-forest-light'
                          : 'text-accent-copper bg-accent-copper-light'
                      }`}
                    >
                      {d.tipo === 'VENTA' ? t('devoluciones.typeSale') : t('devoluciones.typePurchase')}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-text">{d.productoNombre}</td>
                  <td className="px-5 py-2.5 text-text-secondary">{d.cantidad}</td>
                  <td className="px-5 py-2.5 text-text-secondary">{d.motivo}</td>
                  <td className="px-5 py-2.5 text-text-secondary">{d.usuarioNombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-brand-forest-light flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-brand-forest" strokeWidth={1.75} />
            </div>
            <h2 className="font-display font-semibold text-lg text-text mb-1">{t('devoluciones.confirmedTitle')}</h2>
            <p className="text-sm text-text-secondary mb-6">
              {confirmacion.cantidad} × {confirmacion.productoNombre}
            </p>
            <button
              onClick={() => setConfirmacion(null)}
              className="w-full bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              {t('devoluciones.understood')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

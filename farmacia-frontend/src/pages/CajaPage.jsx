import { useEffect, useState } from 'react';
import { Wallet, Plus, Lock, ArrowUpCircle, ArrowDownCircle, ShoppingCart, DoorOpen } from 'lucide-react';
import { cajaService } from '../services/cajaService';
import { useIdioma } from '../context/LanguageContext';

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const inputClase =
  'w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface';
const labelClase = 'block text-xs font-medium text-text-secondary mb-1.5';

const ICONO_TIPO = {
  APERTURA: DoorOpen,
  INGRESO: ArrowUpCircle,
  EGRESO: ArrowDownCircle,
  VENTA: ShoppingCart,
  CIERRE: Lock,
};

const COLOR_TIPO = {
  APERTURA: 'text-text-secondary',
  INGRESO: 'text-brand-forest',
  EGRESO: 'text-danger',
  VENTA: 'text-accent-copper',
  CIERRE: 'text-text-secondary',
};

function calcularMontoEsperado(sesion) {
  let total = Number(sesion.montoApertura) || 0;
  for (const m of sesion.movimientos) {
    if (m.tipo === 'INGRESO' || m.tipo === 'VENTA') total += Number(m.monto);
    if (m.tipo === 'EGRESO') total -= Number(m.monto);
  }
  return total;
}

export default function CajaPage() {
  const { t } = useIdioma();
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [historial, setHistorial] = useState([]);
  const [historialCargando, setHistorialCargando] = useState(true);

  const [montoApertura, setMontoApertura] = useState('');
  const [abriendo, setAbriendo] = useState(false);

  const [tipoMovimiento, setTipoMovimiento] = useState('INGRESO');
  const [montoMovimiento, setMontoMovimiento] = useState('');
  const [conceptoMovimiento, setConceptoMovimiento] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);
  const [resultadoCierre, setResultadoCierre] = useState(null);

  useEffect(() => {
    cargarSesion();
    cargarHistorial();
  }, []);

  function cargarSesion() {
    setCargando(true);
    setError('');
    cajaService
      .obtenerActual()
      .then(setSesion)
      .catch(() => setError(t('caja.loadError')))
      .finally(() => setCargando(false));
  }

  // Historial de todas las cajas (quien abrio/cerro cada turno y cuanto
  // dio) -- antes esta informacion no se mostraba en ningun lado y se
  // "perdia" apenas se cerraba la caja.
  function cargarHistorial() {
    setHistorialCargando(true);
    cajaService
      .listarHistorial()
      .then(setHistorial)
      .catch(() => {})
      .finally(() => setHistorialCargando(false));
  }

  async function manejarAbrir() {
    setError('');
    if (montoApertura === '' || Number(montoApertura) < 0) {
      setError(t('caja.errorInvalidOpeningAmount'));
      return;
    }
    setAbriendo(true);
    try {
      const nueva = await cajaService.abrir(Number(montoApertura));
      setSesion(nueva);
      setMontoApertura('');
      cargarHistorial();
    } catch (err) {
      setError(err.response?.data?.mensaje || t('caja.errorOpen'));
    } finally {
      setAbriendo(false);
    }
  }

  async function manejarRegistrarMovimiento(e) {
    e.preventDefault();
    setError('');
    if (!montoMovimiento || Number(montoMovimiento) <= 0) {
      setError(t('caja.errorInvalidMovementAmount'));
      return;
    }
    setRegistrando(true);
    try {
      const actualizada = await cajaService.registrarMovimiento(sesion.id, {
        tipo: tipoMovimiento,
        monto: Number(montoMovimiento),
        concepto: conceptoMovimiento.trim() || null,
      });
      setSesion(actualizada);
      setMontoMovimiento('');
      setConceptoMovimiento('');
    } catch (err) {
      setError(err.response?.data?.mensaje || t('caja.errorMovement'));
    } finally {
      setRegistrando(false);
    }
  }

  function manejarCierreConfirmado(cerrada) {
    setResultadoCierre(cerrada);
    setSesion(null);
    setModalCierreAbierto(false);
    cargarHistorial();
  }

  if (cargando) {
    return (
      <div className="max-w-4xl">
        <div className="h-40 rounded-xl bg-surface border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-text">{t('caja.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {t('caja.subtitle')}
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-5">{error}</p>
      )}

      {!sesion ? (
        <div className="bg-surface border border-border rounded-xl p-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-brand-forest-light flex items-center justify-center mb-4">
            <Wallet className="w-7 h-7 text-brand-forest" strokeWidth={1.75} />
          </div>
          <h2 className="font-display font-semibold text-lg text-text mb-1">{t('caja.noOpenRegister')}</h2>
          <p className="text-sm text-text-secondary mb-6">{t('caja.openingHint')}</p>

          <div className="w-full max-w-xs space-y-4">
            <div>
              <label className={labelClase}>{t('caja.openingAmountLabel')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={montoApertura}
                onChange={(e) => setMontoApertura(e.target.value)}
                placeholder="0"
                className={inputClase}
              />
            </div>
            <button
              onClick={manejarAbrir}
              disabled={abriendo}
              className="w-full bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              {abriendo ? t('caja.opening') : t('caja.openButton')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-secondary mb-1">{t('caja.openingLabel')}</p>
              <p className="font-display font-semibold text-lg text-text">
                {formatoMoneda.format(sesion.montoApertura)}
              </p>
              <p className="text-xs text-text-disabled mt-0.5">
                {new Date(sesion.fechaApertura).toLocaleString('es-CO')}
              </p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-secondary mb-1">{t('caja.expectedTotal')}</p>
              <p className="font-display font-semibold text-lg text-text">
                {formatoMoneda.format(calcularMontoEsperado(sesion))}
              </p>
              <p className="text-xs text-text-disabled mt-0.5">{sesion.usuarioNombre}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 flex items-center">
              <button
                onClick={() => setModalCierreAbierto(true)}
                className="w-full flex items-center justify-center gap-2 border border-danger/30 text-danger hover:bg-danger/10 text-sm font-medium rounded-lg py-2.5 transition-colors"
              >
                <Lock className="w-4 h-4" />
                {t('caja.closeRegisterButton')}
              </button>
            </div>
          </div>

          <form
            onSubmit={manejarRegistrarMovimiento}
            className="bg-surface border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr_auto] gap-3 items-end"
          >
            <div>
              <label className={labelClase}>{t('caja.typeLabel')}</label>
              <select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)} className={inputClase}>
                <option value="INGRESO">{t('caja.income')}</option>
                <option value="EGRESO">{t('caja.expense')}</option>
              </select>
            </div>
            <div>
              <label className={labelClase}>{t('caja.amountLabel')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={montoMovimiento}
                onChange={(e) => setMontoMovimiento(e.target.value)}
                className={inputClase}
              />
            </div>
            <div>
              <label className={labelClase}>{t('caja.conceptLabel')}</label>
              <input
                value={conceptoMovimiento}
                onChange={(e) => setConceptoMovimiento(e.target.value)}
                placeholder={t('caja.optional')}
                className={inputClase}
              />
            </div>
            <button
              type="submit"
              disabled={registrando}
              className="flex items-center justify-center gap-2 bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors h-[38px]"
            >
              <Plus className="w-4 h-4" />
              {t('caja.addButton')}
            </button>
          </form>

          <div>
            <h2 className="font-display font-semibold text-sm text-text mb-3">{t('caja.movementsTitle')}</h2>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {sesion.movimientos.length === 0 ? (
                <p className="text-sm text-text-secondary px-5 py-4">{t('caja.noMovementsYet')}</p>
              ) : (
                <div className="divide-y divide-border">
                  {[...sesion.movimientos].reverse().map((m) => {
                    const Icono = ICONO_TIPO[m.tipo] ?? Wallet;
                    return (
                      <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                        <Icono className={`w-4 h-4 shrink-0 ${COLOR_TIPO[m.tipo]}`} strokeWidth={2} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text truncate">
                            {m.concepto || m.tipo}
                            {m.ventaId && <span className="text-text-disabled">{t('caja.saleTag', { id: m.ventaId })}</span>}
                          </p>
                          <p className="text-xs text-text-disabled">{new Date(m.fecha).toLocaleString('es-CO')}</p>
                        </div>
                        <span className={`text-sm font-medium shrink-0 ${COLOR_TIPO[m.tipo]}`}>
                          {m.tipo === 'EGRESO' ? '-' : ''}
                          {formatoMoneda.format(m.monto)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {resultadoCierre && (
        <CierreResumenModal resultado={resultadoCierre} onClose={() => setResultadoCierre(null)} />
      )}

      {modalCierreAbierto && (
        <CerrarCajaModal
          sesion={sesion}
          onClose={() => setModalCierreAbierto(false)}
          onCerrada={manejarCierreConfirmado}
        />
      )}

      {/* Historial de cajas: antes esta informacion (quien abrio/cerro
          cada turno, a que hora y con que diferencia) no se mostraba en
          ningun lado y quedaba "perdida" apenas se cerraba la caja. */}
      <div className="mt-8">
        <h2 className="font-display font-semibold text-sm text-text mb-3">{t('caja.historyTitle')}</h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {historialCargando ? (
            <div className="h-24 animate-pulse" />
          ) : historial.length === 0 ? (
            <p className="text-sm text-text-secondary px-5 py-4">{t('caja.noRegistersYet')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary uppercase tracking-wide">
                    <th className="py-2.5 px-4 font-medium">{t('caja.colUser')}</th>
                    <th className="py-2.5 px-4 font-medium">{t('caja.colOpening')}</th>
                    <th className="py-2.5 px-4 font-medium">{t('caja.colClosing')}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{t('caja.colOpeningAmount')}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{t('caja.colClosingAmount')}</th>
                    <th className="py-2.5 px-4 font-medium text-right">{t('caja.colDifference')}</th>
                    <th className="py-2.5 px-4 font-medium">{t('caja.colStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historial.map((h) => {
                    const diferencia = h.diferencia != null ? Number(h.diferencia) : null;
                    return (
                      <tr key={h.id}>
                        <td className="py-2.5 px-4 text-text">{h.usuarioNombre}</td>
                        <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">
                          {new Date(h.fechaApertura).toLocaleString('es-CO')}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">
                          {h.fechaCierre ? new Date(h.fechaCierre).toLocaleString('es-CO') : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-text text-right">
                          {formatoMoneda.format(h.montoApertura)}
                        </td>
                        <td className="py-2.5 px-4 text-text text-right">
                          {h.montoCierreReal != null ? formatoMoneda.format(h.montoCierreReal) : '—'}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-medium ${
                            diferencia == null ? 'text-text-disabled' : diferencia === 0 ? 'text-text' : diferencia > 0 ? 'text-brand-forest' : 'text-danger'
                          }`}
                        >
                          {diferencia == null ? '—' : formatoMoneda.format(diferencia)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              h.estado === 'ABIERTA'
                                ? 'bg-brand-forest-light text-brand-forest'
                                : 'bg-bg text-text-secondary'
                            }`}
                          >
                            {h.estado === 'ABIERTA' ? t('caja.statusOpen') : t('caja.statusClosed')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CerrarCajaModal({ sesion, onClose, onCerrada }) {
  const { t } = useIdioma();
  const [montoCierreReal, setMontoCierreReal] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const montoEsperado = calcularMontoEsperado(sesion);
  const diferencia = montoCierreReal !== '' ? Number(montoCierreReal) - montoEsperado : null;

  async function manejarConfirmar() {
    setError('');
    if (montoCierreReal === '' || Number(montoCierreReal) < 0) {
      setError(t('caja.errorInvalidCountedAmount'));
      return;
    }
    setGuardando(true);
    try {
      const cerrada = await cajaService.cerrar(sesion.id, {
        montoCierreReal: Number(montoCierreReal),
        observaciones: observaciones.trim() || null,
      });
      onCerrada(cerrada);
    } catch (err) {
      setError(err.response?.data?.mensaje || t('caja.errorClose'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-lg text-text">{t('caja.closeModalTitle')}</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{t('caja.expectedTotalLabel')}</span>
            <span className="font-medium text-text">{formatoMoneda.format(montoEsperado)}</span>
          </div>

          <div>
            <label className={labelClase}>{t('caja.countedAmountLabel')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={montoCierreReal}
              onChange={(e) => setMontoCierreReal(e.target.value)}
              className={inputClase}
              autoFocus
            />
          </div>

          {diferencia !== null && diferencia !== 0 && (
            <p className={`text-sm font-medium ${diferencia > 0 ? 'text-brand-forest' : 'text-danger'}`}>
              {diferencia > 0 ? t('caja.surplus') : t('caja.shortage')}: {formatoMoneda.format(Math.abs(diferencia))}
            </p>
          )}

          <div>
            <label className={labelClase}>{t('caja.observationsLabel')}</label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className={inputClase}
              placeholder={t('caja.optional')}
            />
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text transition-colors"
            >
              {t('caja.cancel')}
            </button>
            <button
              onClick={manejarConfirmar}
              disabled={guardando}
              className="px-5 py-2 bg-danger hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-opacity"
            >
              {guardando ? t('caja.closing') : t('caja.confirmClose')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CierreResumenModal({ resultado, onClose }) {
  const { t } = useIdioma();
  const diferencia = Number(resultado.diferencia);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-brand-forest-light flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-brand-forest" strokeWidth={1.75} />
        </div>
        <h2 className="font-display font-semibold text-lg text-text mb-4">{t('caja.closedTitle')}</h2>

        <div className="space-y-2 text-sm text-left mb-6">
          <div className="flex justify-between">
            <span className="text-text-secondary">{t('caja.expected')}</span>
            <span className="text-text">{formatoMoneda.format(resultado.montoCierreEsperado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">{t('caja.counted')}</span>
            <span className="text-text">{formatoMoneda.format(resultado.montoCierreReal)}</span>
          </div>
          <div className="flex justify-between font-medium border-t border-border pt-2">
            <span className={diferencia === 0 ? 'text-text' : diferencia > 0 ? 'text-brand-forest' : 'text-danger'}>
              {diferencia === 0 ? t('caja.exactMatch') : diferencia > 0 ? t('caja.surplus') : t('caja.shortage')}
            </span>
            <span className={diferencia === 0 ? 'text-text' : diferencia > 0 ? 'text-brand-forest' : 'text-danger'}>
              {formatoMoneda.format(Math.abs(diferencia))}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
        >
          {t('caja.understood')}
        </button>
      </div>
    </div>
  );
}

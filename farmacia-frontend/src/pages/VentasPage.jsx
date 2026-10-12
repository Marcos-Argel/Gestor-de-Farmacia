import { useEffect, useRef, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, Receipt, ScanBarcode } from 'lucide-react';
import { productoService } from '../services/productoService';
import { clienteService } from '../services/clienteService';
import { ventaService } from '../services/ventaService';
import { useIdioma } from '../context/LanguageContext';

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const inputClase =
  'w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface';
const labelClase = 'block text-xs font-medium text-text-secondary mb-1.5';

export default function VentasPage() {
  const { t } = useIdioma();

  const METODOS_PAGO = [
    { value: 'EFECTIVO', label: t('ventas.metodoEfectivo') },
    { value: 'TARJETA', label: t('ventas.metodoTarjeta') },
    { value: 'TRANSFERENCIA', label: t('ventas.metodoTransferencia') },
    { value: 'MIXTO', label: t('ventas.metodoMixto') },
  ];

  const ETIQUETA_METODO_PAGO = Object.fromEntries(METODOS_PAGO.map((m) => [m.value, m.label]));

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const [carrito, setCarrito] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [descuento, setDescuento] = useState('');
  const [numeroFormula, setNumeroFormula] = useState('');
  const [medicoNombre, setMedicoNombre] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ventaConfirmada, setVentaConfirmada] = useState(null);

  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  // --- Escaneo de codigo de barras ---
  // La mayoria de lectores laser USB/bluetooth (incluido el tipico lector
  // rojo de mano) funcionan como un TECLADO (HID keyboard-wedge): al
  // escanear, "escriben" el codigo carácter por carácter y rematan con un
  // Enter, exactamente como si alguien lo tipeara muy rapido. Por eso no
  // hace falta ningun driver ni libreria especial -- solo un <input>
  // enfocado esperando esa escritura, y capturar el Enter final.
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const [escaneando, setEscaneando] = useState(false);
  const [errorEscaneo, setErrorEscaneo] = useState('');
  const inputEscanerRef = useRef(null);

  useEffect(() => {
    // Al entrar a Ventas, el campo de escaneo queda listo de una vez --
    // el cajero no deberia tener que hacerle clic primero.
    inputEscanerRef.current?.focus();
  }, []);

  async function manejarEscaneo(e) {
    e.preventDefault();
    const codigo = codigoEscaneado.trim();
    if (!codigo) return;

    setErrorEscaneo('');
    setEscaneando(true);
    try {
      const producto = await productoService.buscarPorCodigoBarras(codigo);
      if ((producto.stockActual ?? 0) <= 0) {
        setErrorEscaneo(t('ventas.scanNoStock', { nombre: producto.nombre }));
      } else {
        agregarAlCarrito(producto);
      }
    } catch (err) {
      setErrorEscaneo(
        err.response?.status === 404
          ? t('ventas.scanNotFound', { codigo })
          : t('ventas.scanGenericError')
      );
    } finally {
      setCodigoEscaneado('');
      setEscaneando(false);
      // Vuelve a enfocar de una vez para que el siguiente escaneo entre
      // directo, sin que el cajero tenga que hacerle clic al campo otra vez.
      inputEscanerRef.current?.focus();
    }
  }

  useEffect(() => {
    clienteService.listar().then(setClientes).catch(() => {});
    cargarHistorial();
  }, []);

  function cargarHistorial() {
    setCargandoHistorial(true);
    ventaService
      .listar()
      .then((data) => setHistorial(data.slice(0, 8)))
      .catch(() => {})
      .finally(() => setCargandoHistorial(false));
  }

  // Búsqueda con un pequeño debounce para no disparar una petición por cada tecla.
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

  function agregarAlCarrito(producto) {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.productoId === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.productoId === producto.id
            ? { ...item, cantidad: Math.min(item.cantidad + 1, producto.stockActual ?? item.cantidad + 1) }
            : item
        );
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precioVenta: producto.precioVenta,
          stockActual: producto.stockActual,
          requiereReceta: producto.requiereReceta,
          cantidad: 1,
        },
      ];
    });
    setBusqueda('');
    setResultados([]);
  }

  function cambiarCantidad(productoId, delta) {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.productoId !== productoId) return item;
        const nuevaCantidad = item.cantidad + delta;
        if (nuevaCantidad < 1) return item;
        if (item.stockActual != null && nuevaCantidad > item.stockActual) return item;
        return { ...item, cantidad: nuevaCantidad };
      })
    );
  }

  function quitarDelCarrito(productoId) {
    setCarrito((prev) => prev.filter((item) => item.productoId !== productoId));
  }

  function limpiarVenta() {
    setCarrito([]);
    setClienteId('');
    setMetodoPago('EFECTIVO');
    setDescuento('');
    setNumeroFormula('');
    setMedicoNombre('');
    setError('');
  }

  const requiereReceta = carrito.some((item) => item.requiereReceta);
  const subtotal = carrito.reduce((suma, item) => suma + item.precioVenta * item.cantidad, 0);
  const descuentoNum = Number(descuento) || 0;
  const total = Math.max(0, subtotal - descuentoNum);

  async function manejarCobrar() {
    setError('');

    if (carrito.length === 0) {
      setError(t('ventas.errorEmptyCart'));
      return;
    }
    if (requiereReceta && (!numeroFormula.trim() || !medicoNombre.trim())) {
      setError(t('ventas.errorPrescriptionRequired'));
      return;
    }

    const payload = {
      clienteId: clienteId ? Number(clienteId) : null,
      metodoPago,
      descuento: descuentoNum || null,
      numeroFormula: requiereReceta ? numeroFormula.trim() : null,
      medicoNombre: requiereReceta ? medicoNombre.trim() : null,
      detalles: carrito.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
    };

    setGuardando(true);
    try {
      const venta = await ventaService.crear(payload);
      setVentaConfirmada(venta);
      limpiarVenta();
      cargarHistorial();
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje || err.response?.data?.message || t('ventas.errorGeneric');
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-text">{t('ventas.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {t('ventas.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: búsqueda + carrito */}
        <div className="lg:col-span-2 space-y-5">
          {/* Escaneo de código de barras */}
          <form onSubmit={manejarEscaneo} className="relative">
            <ScanBarcode className="w-4 h-4 text-brand-forest absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputEscanerRef}
              value={codigoEscaneado}
              onChange={(e) => setCodigoEscaneado(e.target.value)}
              placeholder={t('ventas.scanPlaceholder')}
              disabled={escaneando}
              className="w-full text-sm border-2 border-brand-forest/30 rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-brand-forest-light/40 disabled:opacity-60"
            />
            {errorEscaneo && (
              <p className="text-xs text-danger mt-1.5">{errorEscaneo}</p>
            )}
          </form>

          <div className="relative">
            <Search className="w-4 h-4 text-text-disabled absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t('ventas.searchPlaceholder')}
              className={`${inputClase} pl-9`}
            />
            {(resultados.length > 0 || buscando) && (
              <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                {buscando ? (
                  <p className="px-4 py-3 text-sm text-text-secondary">{t('ventas.searching')}</p>
                ) : (
                  resultados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => agregarAlCarrito(p)}
                      disabled={p.stockActual <= 0}
                      className="w-full text-left px-4 py-2.5 hover:bg-bg transition-colors flex items-center justify-between gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">{p.nombre}</p>
                        <p className="text-xs text-text-disabled">
                          {t('ventas.stockLabel', { cantidad: p.stockActual ?? 0 })}
                          {p.requiereReceta && t('ventas.requiresPrescriptionInline')}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-text shrink-0">
                        {formatoMoneda.format(p.precioVenta ?? 0)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
                  <ShoppingCart className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-text mb-1">{t('ventas.emptyCartTitle')}</p>
                <p className="text-sm text-text-secondary">{t('ventas.emptyCartHint')}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-secondary uppercase tracking-wide">
                    <th className="px-5 py-3 font-medium">{t('ventas.colProduct')}</th>
                    <th className="px-5 py-3 font-medium">{t('ventas.colQuantity')}</th>
                    <th className="px-5 py-3 font-medium text-right">{t('ventas.colSubtotal')}</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map((item) => (
                    <tr key={item.productoId} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-text">{item.nombre}</p>
                        <p className="text-xs text-text-disabled">{formatoMoneda.format(item.precioVenta)} {t('ventas.perUnit')}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => cambiarCantidad(item.productoId, -1)}
                            className="p-1 border border-border rounded text-text-secondary hover:bg-bg transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-text">{item.cantidad}</span>
                          <button
                            onClick={() => cambiarCantidad(item.productoId, 1)}
                            className="p-1 border border-border rounded text-text-secondary hover:bg-bg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-text">
                        {formatoMoneda.format(item.precioVenta * item.cantidad)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => quitarDelCarrito(item.productoId)}
                          className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          aria-label={t('ventas.removeAria', { nombre: item.nombre })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Historial reciente */}
          <div>
            <h2 className="font-display font-semibold text-sm text-text mb-3">{t('ventas.recentSalesTitle')}</h2>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {cargandoHistorial ? (
                <div className="p-4 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 rounded bg-bg animate-pulse" />
                  ))}
                </div>
              ) : historial.length === 0 ? (
                <p className="text-sm text-text-secondary px-5 py-4">{t('ventas.noSalesYet')}</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {historial.map((v) => (
                      <tr key={v.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-2.5 text-text-secondary whitespace-nowrap">
                          {new Date(v.fecha).toLocaleString('es-CO')}
                        </td>
                        <td className="px-5 py-2.5 text-text">{v.clienteNombre}</td>
                        <td className="px-5 py-2.5 text-text-secondary">{ETIQUETA_METODO_PAGO[v.metodoPago] ?? v.metodoPago}</td>
                        <td className="px-5 py-2.5 text-right font-medium text-text">
                          {formatoMoneda.format(v.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: datos de cobro */}
        <div className="bg-surface border border-border rounded-xl p-5 h-fit space-y-4 lg:sticky lg:top-20">
          <h2 className="font-display font-semibold text-sm text-text">{t('ventas.saleDataTitle')}</h2>

          <div>
            <label className={labelClase}>{t('ventas.clientLabel')}</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={inputClase}>
              <option value="">{t('ventas.finalConsumer')}</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClase}>{t('ventas.paymentMethodLabel')}</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={inputClase}>
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClase}>{t('ventas.discountLabel')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              placeholder="0"
              className={inputClase}
            />
          </div>

          {requiereReceta && (
            <div className="space-y-3 border border-accent-copper/30 bg-accent-copper-light rounded-lg p-3">
              <p className="text-xs font-medium text-accent-copper">
                {t('ventas.prescriptionWarning')}
              </p>
              <div>
                <label className={labelClase}>{t('ventas.prescriptionNumberLabel')}</label>
                <input
                  value={numeroFormula}
                  onChange={(e) => setNumeroFormula(e.target.value)}
                  className={inputClase}
                />
              </div>
              <div>
                <label className={labelClase}>{t('ventas.doctorNameLabel')}</label>
                <input
                  value={medicoNombre}
                  onChange={(e) => setMedicoNombre(e.target.value)}
                  className={inputClase}
                />
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4 space-y-1.5">
            <div className="flex justify-between text-sm text-text-secondary">
              <span>{t('ventas.subtotal')}</span>
              <span>{formatoMoneda.format(subtotal)}</span>
            </div>
            {descuentoNum > 0 && (
              <div className="flex justify-between text-sm text-text-secondary">
                <span>{t('ventas.discount')}</span>
                <span>-{formatoMoneda.format(descuentoNum)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold text-text pt-1">
              <span>{t('ventas.total')}</span>
              <span>{formatoMoneda.format(total)}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={manejarCobrar}
            disabled={guardando || carrito.length === 0}
            className="w-full bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-3 transition-colors"
          >
            {guardando ? t('ventas.registering') : t('ventas.registerButton')}
          </button>
        </div>
      </div>

      {ventaConfirmada && (
        <VentaConfirmadaModal venta={ventaConfirmada} onClose={() => setVentaConfirmada(null)} />
      )}
    </div>
  );
}

function VentaConfirmadaModal({ venta, onClose }) {
  const { t } = useIdioma();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-4">
          <div className="w-14 h-14 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7 text-brand-forest" strokeWidth={1.75} />
          </div>
          <h2 className="font-display font-semibold text-lg text-text">{t('ventas.confirmedTitle')}</h2>
          <p className="text-sm text-text-secondary mt-1">
            {t('ventas.saleNumber', { id: venta.id })} · {venta.clienteNombre}
          </p>
        </div>

        <div className="px-6 pb-2">
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
            <Receipt className="w-3.5 h-3.5" />
            {t('ventas.lotsDiscounted')}
          </div>
          <div className="border border-border rounded-lg divide-y divide-border">
            {venta.detalles.map((d, i) => (
              <div key={i} className="px-3 py-2 text-sm flex justify-between">
                <div>
                  <p className="text-text">{d.productoNombre}</p>
                  <p className="text-xs text-text-disabled">{t('ventas.lot', { numero: d.numeroLote, cantidad: d.cantidad })}</p>
                </div>
                <span className="text-text font-medium">{formatoMoneda.format(d.subtotal)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex justify-between text-base font-semibold text-text mb-4">
            <span>{t('ventas.totalCharged')}</span>
            <span>{formatoMoneda.format(venta.total)}</span>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
          >
            {t('ventas.newSale')}
          </button>
        </div>
      </div>
    </div>
  );
}

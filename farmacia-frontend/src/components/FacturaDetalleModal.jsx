import { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import logoFarmaArgel from '../assets/logo-farma-argel.png';
import { configuracionService } from '../services/configuracionService';

// Datos de la farmacia para el encabezado (antes el NIT estaba escrito a
// mano en el codigo). Se editan en Configuracion.
const NEGOCIO_POR_DEFECTO = { nombre_farmacia: 'Farma Argel', nit: '', direccion: '', telefono: '' };

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const moneda = (n) => formatoMoneda.format(n ?? 0);

const METODO_PAGO_LABEL = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  MIXTO: 'Mixto',
};

const ESTADO_LABEL = {
  COMPLETADA: 'Completada',
  ANULADA: 'Anulada',
};

function formatearFecha(fechaIso) {
  if (!fechaIso) return '—';
  return new Date(fechaIso).toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function formatearFechaCorta(fechaIso) {
  if (!fechaIso) return '—';
  return new Date(fechaIso).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

// Numero de factura con formato tipo "FV-000007", como en un talonario
// o sistema de facturacion formal (en vez del "#7" plano de antes).
function numeroFactura(id) {
  return `FV-${String(id ?? 0).padStart(6, '0')}`;
}

// "Codigo QR" puramente decorativo: dibuja los 3 "ojos" de esquina
// tipicos de un QR mas un relleno pseudo-aleatorio determinado por el
// numero de factura, para que visualmente se lea como un QR real.
// Por ahora no codifica ningun dato -- el usuario indico que mas
// adelante le dara una funcion (ej. link de verificacion), asi que solo
// se deja el espacio visual listo para ese momento.
function celdasQR(valor) {
  const modulos = 21;
  let semilla = 0;
  for (let i = 0; i < valor.length; i++) {
    semilla = (semilla * 31 + valor.charCodeAt(i)) >>> 0;
  }
  function siguiente() {
    semilla = (semilla * 1103515245 + 12345) >>> 0;
    return semilla % 100;
  }
  const esZonaOjo = (f, c) =>
    (f < 7 && c < 7) || (f < 7 && c >= modulos - 7) || (f >= modulos - 7 && c < 7);
  const pintaOjo = (f, c) => {
    const rf = f < 7 ? f : f - (modulos - 7);
    const rc = c < 7 ? c : c - (modulos - 7);
    return rf === 0 || rf === 6 || rc === 0 || rc === 6 || (rf >= 2 && rf <= 4 && rc >= 2 && rc <= 4);
  };
  const celdas = [];
  for (let f = 0; f < modulos; f++) {
    for (let c = 0; c < modulos; c++) {
      const pintado = esZonaOjo(f, c) ? pintaOjo(f, c) : siguiente() < 46;
      if (pintado) celdas.push([f, c]);
    }
  }
  return { modulos, celdas };
}

function CodigoQR({ valor, tamano = 84 }) {
  const { modulos, celdas } = celdasQR(valor);
  const celda = tamano / modulos;
  return (
    <svg viewBox={`0 0 ${tamano} ${tamano}`} width={tamano} height={tamano} className="fill-text shrink-0">
      {celdas.map(([f, c]) => (
        <rect key={`${f}-${c}`} x={c * celda} y={f * celda} width={celda} height={celda} />
      ))}
    </svg>
  );
}

// Version en texto plano (SVG como string) del mismo QR decorativo, para
// poder inyectarla en el HTML de la ventana emergente de impresion, que
// no corre React.
function qrSvgString(valor, tamano = 96) {
  const { modulos, celdas } = celdasQR(valor);
  const celda = tamano / modulos;
  const rects = celdas
    .map(([f, c]) => `<rect x="${c * celda}" y="${f * celda}" width="${celda}" height="${celda}" />`)
    .join('');
  return `<svg viewBox="0 0 ${tamano} ${tamano}" width="${tamano}" height="${tamano}" style="fill:#000">${rects}</svg>`;
}

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// La ventana emergente es HTML autonomo (document.write), asi que el logo
// no puede ir como <img src={importado}> normal -- se conveierte a base64
// para que quede incrustado en el propio documento y se vea sin depender
// de que esa ventana pueda resolver rutas del servidor de la app.
async function obtenerLogoBase64() {
  try {
    const respuesta = await fetch(logoFarmaArgel);
    const blob = await respuesta.blob();
    return await new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result);
      lector.onerror = reject;
      lector.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Arma el documento HTML autonomo del ticket (sin depender de React ni de
// los estilos de la app) para mostrarlo en una ventana nueva, lista para
// imprimir en una impresora termica de recibos -- igual al flujo que ya
// usan en el proyecto del restaurante.
function construirHtmlRecibo(venta, numero, logoBase64, negocio) {
  const encabezadoMarca = logoBase64
    ? `<img src="${logoBase64}" alt="Farma Argel" class="logo" />`
    : `<div class="nombre">💊 Farma Argel 💊</div>`;

  const detalles = venta.detalles ?? [];

  const filasDetalle = detalles
    .map((d) => {
      const nombre = escaparHtml(d.productoNombre) + (d.numeroLote ? ` (Lote ${escaparHtml(d.numeroLote)})` : '');
      return `
        <p>${nombre}</p>
        <div class="fila"><span>${d.cantidad} x ${moneda(d.precioUnitario)}</span><span>${moneda(d.subtotal)}</span></div>
      `;
    })
    .join('');

  const filaDescuento =
    Number(venta.descuento) > 0
      ? `<div class="fila"><span>Descuento</span><span>- ${moneda(venta.descuento)}</span></div>`
      : '';
  // El precio ya incluye el IVA: se muestra DEBAJO del total como
  // informativo, no como algo que se suma.
  const filaImpuesto =
    Number(venta.impuesto) > 0
      ? `<div class="fila"><span>IVA incluido:</span><span>${moneda(venta.impuesto)}</span></div>`
      : '';
  const lineasNegocio = [
    negocio.nit && `NIT ${escaparHtml(negocio.nit)}`,
    negocio.direccion && escaparHtml(negocio.direccion),
    negocio.telefono && `Tel. ${escaparHtml(negocio.telefono)}`,
  ]
    .filter(Boolean)
    .map((l) => `<p>${l}</p>`)
    .join('');
  const filaFormula = venta.numeroFormula
    ? `<p>N.º fórmula: ${escaparHtml(venta.numeroFormula)}</p>`
    : '';
  const filaMedico = venta.medicoNombre ? `<p>Médico: ${escaparHtml(venta.medicoNombre)}</p>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Factura ${numero}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 18px 14px 26px;
    width: 300px;
    font-family: 'Courier New', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #111;
    background: #fff;
  }
  .centro { text-align: center; }
  .nombre { font-size: 16px; font-weight: bold; }
  .linea { border-top: 1px dashed #111; margin: 10px 0; }
  .fila { display: flex; justify-content: space-between; gap: 8px; }
  .total { font-size: 14px; font-weight: bold; border-top: 1px solid #111; margin-top: 4px; padding-top: 4px; }
  .qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 6px 0; }
  .qr-caption { font-size: 10px; letter-spacing: 0.08em; }
  .logo { width: 68px; height: auto; display: block; margin: 0 auto 4px; }
  button#btn-imprimir {
    display: block;
    width: 100%;
    margin-top: 18px;
    padding: 10px;
    font-family: inherit;
    font-size: 13px;
    font-weight: bold;
    background: #1F4B3F;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  @media print {
    button#btn-imprimir { display: none; }
    body { width: auto; }
  }
</style>
</head>
<body>
  <div class="centro">
    ${encabezadoMarca}
    <p><strong>${escaparHtml(negocio.nombre_farmacia || 'Farma Argel')}</strong></p>
    ${lineasNegocio}
  </div>

  <div class="linea"></div>

  <div class="fila"><span>Factura:</span><span>${numero}</span></div>
  <div class="fila"><span>Fecha:</span><span>${escaparHtml(formatearFechaCorta(venta.fecha))}</span></div>
  <div class="fila"><span>Cliente:</span><span>${escaparHtml(venta.clienteNombre ?? 'Consumidor final')}</span></div>
  <div class="fila"><span>Cajero:</span><span>${escaparHtml(venta.usuarioNombre ?? '—')}</span></div>
  ${filaFormula}
  ${filaMedico}

  <div class="linea"></div>

  <p><strong>DETALLE:</strong></p>
  ${filasDetalle}

  <div class="linea"></div>

  <div class="fila"><span>Subtotal:</span><span>${moneda(venta.subtotal)}</span></div>
  ${filaDescuento}
  <div class="fila total"><span>TOTAL:</span><span>${moneda(venta.total)}</span></div>
  ${filaImpuesto}
  <div class="fila"><span>Método pago:</span><span>${METODO_PAGO_LABEL[venta.metodoPago] ?? venta.metodoPago}</span></div>

  <div class="linea"></div>

  <div class="qr-wrap">
    <p class="qr-caption">ESCANEA PARA VERIFICAR</p>
    ${qrSvgString(numero)}
    <p class="qr-caption">${numero}</p>
  </div>

  <div class="linea"></div>

  <p class="centro">Este documento es un comprobante de venta.<br />Conserve su factura para cambios y garantías.</p>
  <p class="centro"><strong>¡Gracias por su compra! 🌿</strong></p>

  <button id="btn-imprimir" onclick="window.print()">🖨️ Imprimir</button>
</body>
</html>`;
}

export default function FacturaDetalleModal({ venta, onClose }) {
  const [negocio, setNegocio] = useState(NEGOCIO_POR_DEFECTO);

  useEffect(() => {
    configuracionService
      .negocio()
      .then((datos) => setNegocio({ ...NEGOCIO_POR_DEFECTO, ...datos }))
      .catch(() => {});
  }, []);

  if (!venta) return null;

  const numero = numeroFactura(venta.id);
  const detalles = venta.detalles ?? [];

  // Abre el recibo en una ventana aparte (no depende de los estilos ni
  // el layout de la app), con su propio boton "Imprimir" adentro -- el
  // mismo flujo que ya usan en el proyecto del restaurante, en vez de
  // disparar el dialogo de impresion directo sobre este modal.
  async function abrirTicketParaImprimir() {
    // La ventana se abre ANTES del await del logo (no despues), porque los
    // navegadores solo permiten window.open() sin bloquearlo como popup si
    // ocurre en la misma pila de ejecucion del click del usuario.
    const ventana = window.open('', '_blank', 'width=380,height=680');
    if (!ventana) {
      toast.error('El navegador bloqueó la ventana emergente. Habilítala para poder imprimir el recibo.');
      return;
    }
    const logoBase64 = await obtenerLogoBase64();
    ventana.document.open();
    ventana.document.write(construirHtmlRecibo(venta, numero, logoBase64, negocio));
    ventana.document.close();
    ventana.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="font-display font-semibold text-lg text-text">Factura de venta</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={abrirTicketParaImprimir}
              className="p-1.5 text-text-secondary hover:text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors"
              aria-label="Imprimir"
              title="Imprimir"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vista en pantalla: tarjeta formal para revisar el detalle
            comodamente. El boton de imprimir de arriba abre el ticket
            real (arriba) en ventana aparte. */}
        <div className="p-6 sm:p-8 space-y-5 font-mono text-[13px] leading-snug">
          <div className="flex items-start justify-between gap-4 border-2 border-text pb-4 mb-1">
            <div className="flex items-center gap-3">
              <img src={logoFarmaArgel} alt="Farma Argel" className="w-12 h-auto shrink-0" />
              <div>
                <p className="font-display font-bold text-xl text-brand-forest leading-tight">
                  {negocio.nombre_farmacia || 'Farma Argel'}
                </p>
                {negocio.nit && <p className="text-text-secondary mt-0.5">NIT {negocio.nit}</p>}
                {negocio.direccion && <p className="text-text-secondary">{negocio.direccion}</p>}
                {negocio.telefono && <p className="text-text-secondary">Tel. {negocio.telefono}</p>}
              </div>
            </div>
            <div className="text-right border border-text rounded px-3 py-2 shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-text-secondary">Factura de venta</p>
              <p className="font-display font-bold text-lg text-text leading-tight">{numero}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-secondary">Fecha</p>
              <p className="text-text">{formatearFecha(venta.fecha)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-secondary">Estado</p>
              <p className="text-text">{ESTADO_LABEL[venta.estado] ?? venta.estado}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-secondary">Cliente</p>
              <p className="text-text">{venta.clienteNombre ?? 'Cliente general'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-secondary">Atendido por</p>
              <p className="text-text">{venta.usuarioNombre ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-secondary">Forma de pago</p>
              <p className="text-text">{METODO_PAGO_LABEL[venta.metodoPago] ?? venta.metodoPago}</p>
            </div>
            {venta.numeroFormula && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-secondary">N.º fórmula médica</p>
                <p className="text-text">{venta.numeroFormula}</p>
              </div>
            )}
            {venta.medicoNombre && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-secondary">Médico</p>
                <p className="text-text">{venta.medicoNombre}</p>
              </div>
            )}
          </div>

          <div className="border border-text">
            <table className="w-full">
              <thead>
                <tr className="border-b border-text text-left uppercase tracking-wide bg-brand-forest-light">
                  <th className="py-1.5 px-2 font-semibold text-[11px]">Producto</th>
                  <th className="py-1.5 px-2 font-semibold text-[11px] text-center w-14">Cant.</th>
                  <th className="py-1.5 px-2 font-semibold text-[11px] text-right w-24">Precio</th>
                  <th className="py-1.5 px-2 font-semibold text-[11px] text-right w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detalles.map((d, i) => (
                  <tr key={i}>
                    <td className="py-1.5 px-2 text-text align-top">
                      {d.productoNombre}
                      {d.numeroLote && (
                        <span className="block text-[11px] text-text-secondary">Lote {d.numeroLote}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-center text-text align-top">{d.cantidad}</td>
                    <td className="py-1.5 px-2 text-right text-text align-top">{moneda(d.precioUnitario)}</td>
                    <td className="py-1.5 px-2 text-right text-text font-medium align-top">{moneda(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-text -mt-2 divide-y divide-border ml-auto max-w-[240px]">
            <div className="flex justify-between px-3 py-1.5 text-text-secondary">
              <span>Subtotal</span>
              <span>{moneda(venta.subtotal)}</span>
            </div>
            {Number(venta.descuento) > 0 && (
              <div className="flex justify-between px-3 py-1.5 text-text-secondary">
                <span>Descuento</span>
                <span>- {moneda(venta.descuento)}</span>
              </div>
            )}
            <div className="flex justify-between px-3 py-2 text-text font-display font-bold text-base bg-brand-forest-light">
              <span>Total</span>
              <span>{moneda(venta.total)}</span>
            </div>
            {Number(venta.impuesto) > 0 && (
              <div className="flex justify-between px-3 py-1.5 text-text-secondary text-xs">
                <span>IVA incluido</span>
                <span>{moneda(venta.impuesto)}</span>
              </div>
            )}
          </div>

          <div className="flex items-end justify-between gap-3 pt-3 border-t border-dashed border-border">
            <div className="text-[11px] text-text-secondary">
              <p>Este documento es un comprobante de venta.</p>
              <p>Conserve su factura para cambios y garantías.</p>
            </div>
            <CodigoQR valor={numero} />
          </div>

          <p className="text-center text-text-secondary pt-1">¡Gracias por su compra!</p>
        </div>
      </div>
    </div>
  );
}

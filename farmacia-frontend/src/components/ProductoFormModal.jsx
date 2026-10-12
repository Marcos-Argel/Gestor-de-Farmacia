import { useEffect, useRef, useState } from 'react';
import { X, ImagePlus, Trash2 } from 'lucide-react';
import { productoService } from '../services/productoService';
import { useIdioma } from '../context/LanguageContext';

const VALORES_INICIALES = {
  nombre: '',
  descripcion: '',
  categoriaId: '',
  principioActivo: '',
  presentacion: '',
  unidadMedida: '',
  codigoBarras: '',
  requiereReceta: false,
  gravaIva: false,
  proveedorId: '',
  precioCompra: '',
  precioVenta: '',
  stockMinimo: '',
  imagenBase64: null,
};

function campoDesdeProducto(producto) {
  if (!producto) return VALORES_INICIALES;
  return {
    nombre: producto.nombre ?? '',
    descripcion: producto.descripcion ?? '',
    categoriaId: producto.categoriaId ?? '',
    principioActivo: producto.principioActivo ?? '',
    presentacion: producto.presentacion ?? '',
    unidadMedida: producto.unidadMedida ?? '',
    codigoBarras: producto.codigoBarras ?? '',
    requiereReceta: producto.requiereReceta ?? false,
    gravaIva: producto.gravaIva ?? false,
    proveedorId: producto.proveedorId ?? '',
    precioCompra: producto.precioCompra ?? '',
    precioVenta: producto.precioVenta ?? '',
    stockMinimo: producto.stockMinimo ?? '',
    imagenBase64: producto.imagenBase64 ?? null,
  };
}

// Redimensiona y comprime la foto en el navegador ANTES de guardarla como
// base64 -- así no se manda la foto original de varios MB de la cámara
// del celular, sino una version liviana (JPEG, max 400px de lado) que
// cabe sin problema en una columna TEXT y no infla el peso de la lista
// de Inventario.
function comprimirImagen(archivo, ladoMaximo = 400, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
        const ancho = Math.round(img.width * escala);
        const alto = Math.round(img.height * escala);
        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, ancho, alto);
        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = e.target.result;
    };
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(archivo);
  });
}

const inputClase =
  'w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface';
const labelClase = 'block text-xs font-medium text-text-secondary mb-1.5';

export default function ProductoFormModal({ producto, categorias, proveedores, onClose, onGuardado }) {
  const { t } = useIdioma();
  const esEdicion = !!producto;
  const [form, setForm] = useState(campoDesdeProducto(producto));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const inputArchivoRef = useRef(null);

  useEffect(() => {
    setForm(campoDesdeProducto(producto));
  }, [producto]);

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarSeleccionFoto(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      setError(t('productoForm.errorImageType'));
      return;
    }

    try {
      const base64 = await comprimirImagen(archivo);
      actualizarCampo('imagenBase64', base64);
      setError('');
    } catch {
      setError(t('productoForm.errorImageType'));
    }
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim()) {
      setError(t('productoForm.errorNameRequired'));
      return;
    }
    if (form.precioCompra === '' || form.precioVenta === '') {
      setError(t('productoForm.errorPricesRequired'));
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
      principioActivo: form.principioActivo.trim() || null,
      presentacion: form.presentacion.trim() || null,
      unidadMedida: form.unidadMedida.trim() || null,
      codigoBarras: form.codigoBarras.trim() || null,
      requiereReceta: form.requiereReceta,
      gravaIva: form.gravaIva,
      proveedorId: form.proveedorId ? Number(form.proveedorId) : null,
      precioCompra: Number(form.precioCompra),
      precioVenta: Number(form.precioVenta),
      stockMinimo: form.stockMinimo === '' ? 0 : Number(form.stockMinimo),
      imagenBase64: form.imagenBase64 || null,
    };

    setGuardando(true);
    try {
      if (esEdicion) {
        await productoService.actualizar(producto.id, payload);
      } else {
        await productoService.crear(payload);
      }
      onGuardado();
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje ||
        err.response?.data?.message ||
        t('productoForm.errorSave');
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="font-display font-semibold text-lg text-text">
            {esEdicion ? t('productoForm.editTitle') : t('productoForm.newTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors"
            aria-label={t('productoForm.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={manejarSubmit} className="p-6 space-y-5">
          <div>
            <label className={labelClase}>{t('productoForm.nameLabel')}</label>
            <input
              className={inputClase}
              value={form.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              placeholder={t('productoForm.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className={labelClase}>{t('productoForm.photoLabel')}</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border border-border bg-bg flex items-center justify-center overflow-hidden shrink-0">
                {form.imagenBase64 ? (
                  <img src={form.imagenBase64} alt={form.nombre} className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus className="w-6 h-6 text-text-disabled" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={inputArchivoRef}
                  type="file"
                  accept="image/*"
                  onChange={manejarSeleccionFoto}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => inputArchivoRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg text-text hover:bg-bg transition-colors w-fit"
                >
                  {form.imagenBase64 ? t('productoForm.changePhoto') : t('productoForm.uploadPhoto')}
                </button>
                {form.imagenBase64 && (
                  <button
                    type="button"
                    onClick={() => actualizarCampo('imagenBase64', null)}
                    className="flex items-center gap-1 text-xs text-danger hover:underline w-fit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('productoForm.removePhoto')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={labelClase}>{t('productoForm.descriptionLabel')}</label>
            <textarea
              className={inputClase}
              rows={2}
              value={form.descripcion}
              onChange={(e) => actualizarCampo('descripcion', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>{t('productoForm.categoryLabel')}</label>
              <select
                className={inputClase}
                value={form.categoriaId}
                onChange={(e) => actualizarCampo('categoriaId', e.target.value)}
              >
                <option value="">{t('productoForm.noCategory')}</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClase}>{t('productoForm.supplierLabel')}</label>
              <select
                className={inputClase}
                value={form.proveedorId}
                onChange={(e) => actualizarCampo('proveedorId', e.target.value)}
              >
                <option value="">{t('productoForm.noSupplier')}</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.empresa}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>{t('productoForm.activeIngredientLabel')}</label>
              <input
                className={inputClase}
                value={form.principioActivo}
                onChange={(e) => actualizarCampo('principioActivo', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClase}>{t('productoForm.presentationLabel')}</label>
              <input
                className={inputClase}
                value={form.presentacion}
                onChange={(e) => actualizarCampo('presentacion', e.target.value)}
                placeholder={t('productoForm.presentationPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>{t('productoForm.unitLabel')}</label>
              <input
                className={inputClase}
                value={form.unidadMedida}
                onChange={(e) => actualizarCampo('unidadMedida', e.target.value)}
                placeholder={t('productoForm.unitPlaceholder')}
              />
            </div>
            <div>
              <label className={labelClase}>{t('productoForm.barcodeLabel')}</label>
              <input
                className={inputClase}
                value={form.codigoBarras}
                onChange={(e) => actualizarCampo('codigoBarras', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClase}>{t('productoForm.purchasePriceLabel')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClase}
                value={form.precioCompra}
                onChange={(e) => actualizarCampo('precioCompra', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClase}>{t('productoForm.salePriceLabel')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClase}
                value={form.precioVenta}
                onChange={(e) => actualizarCampo('precioVenta', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClase}>{t('productoForm.minStockLabel')}</label>
              <input
                type="number"
                min="0"
                className={inputClase}
                value={form.stockMinimo}
                onChange={(e) => actualizarCampo('stockMinimo', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {esEdicion && (
            <p className="text-xs text-text-disabled">
              {t('productoForm.currentStockNote', { stock: producto.stockActual ?? 0 })}
            </p>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={form.requiereReceta}
              onChange={(e) => actualizarCampo('requiereReceta', e.target.checked)}
              className="w-4 h-4 rounded border-border text-brand-forest focus:ring-brand-forest"
            />
            <span className="text-sm text-text">{t('productoForm.requiresPrescription')}</span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={form.gravaIva}
              onChange={(e) => actualizarCampo('gravaIva', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border text-brand-forest focus:ring-brand-forest"
            />
            <span>
              <span className="block text-sm text-text">{t('productoForm.taxable')}</span>
              <span className="block text-xs text-text-secondary">{t('productoForm.taxableHint')}</span>
            </span>
          </label>

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text transition-colors"
            >
              {t('productoForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {guardando ? t('productoForm.saving') : esEdicion ? t('productoForm.saveChanges') : t('productoForm.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

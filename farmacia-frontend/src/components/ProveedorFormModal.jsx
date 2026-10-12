import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { proveedorService } from '../services/proveedorService';
import { useIdioma } from '../context/LanguageContext';

const VALORES_INICIALES = {
  nombreContacto: '',
  empresa: '',
  telefono: '',
  email: '',
  direccion: '',
  activo: true,
};

function campoDesdeProveedor(proveedor) {
  if (!proveedor) return VALORES_INICIALES;
  return {
    nombreContacto: proveedor.nombreContacto ?? '',
    empresa: proveedor.empresa ?? '',
    telefono: proveedor.telefono ?? '',
    email: proveedor.email ?? '',
    direccion: proveedor.direccion ?? '',
    activo: proveedor.activo ?? true,
  };
}

const inputClase =
  'w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface';
const labelClase = 'block text-xs font-medium text-text-secondary mb-1.5';

// Mismas reglas que el backend (ProveedorDTO).
const REGEX_NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' ]{2,99}$/;
const REGEX_EMPRESA = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ]).{2,150}$/;
const REGEX_TELEFONO = /^[0-9]{7,10}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProveedorFormModal({ proveedor, onClose, onGuardado }) {
  const { t } = useIdioma();
  const esEdicion = !!proveedor;
  const [form, setForm] = useState(campoDesdeProveedor(proveedor));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setForm(campoDesdeProveedor(proveedor));
  }, [proveedor]);

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    const nombreContacto = form.nombreContacto.trim();
    const empresa = form.empresa.trim();
    const telefono = form.telefono.trim();
    const email = form.email.trim();

    if (!nombreContacto || !empresa || !telefono || !email) {
      setError(t('proveedorForm.errorRequired'));
      return;
    }
    if (!REGEX_NOMBRE.test(nombreContacto)) {
      setError(t('proveedorForm.errorContactNameInvalid'));
      return;
    }
    if (!REGEX_EMPRESA.test(empresa)) {
      setError(t('proveedorForm.errorCompanyInvalid'));
      return;
    }
    if (!REGEX_TELEFONO.test(telefono)) {
      setError(t('proveedorForm.errorPhoneInvalid'));
      return;
    }
    if (!REGEX_EMAIL.test(email)) {
      setError(t('proveedorForm.errorEmailInvalid'));
      return;
    }

    const payload = {
      nombreContacto,
      empresa,
      telefono,
      email,
      direccion: form.direccion.trim() || null,
      activo: form.activo,
    };

    setGuardando(true);
    try {
      if (esEdicion) {
        await proveedorService.actualizar(proveedor.id, payload);
      } else {
        await proveedorService.crear(payload);
      }
      onGuardado();
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje ||
        err.response?.data?.message ||
        t('proveedorForm.errorSave');
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="font-display font-semibold text-lg text-text">
            {esEdicion ? t('proveedorForm.editTitle') : t('proveedorForm.newTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors"
            aria-label={t('proveedorForm.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={manejarSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>{t('proveedorForm.contactNameLabel')}</label>
              <input
                className={inputClase}
                value={form.nombreContacto}
                onChange={(e) => actualizarCampo('nombreContacto', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClase}>{t('proveedorForm.companyLabel')}</label>
              <input
                className={inputClase}
                value={form.empresa}
                onChange={(e) => actualizarCampo('empresa', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>{t('proveedorForm.phoneLabel')}</label>
              <input
                className={inputClase}
                value={form.telefono}
                onChange={(e) => actualizarCampo('telefono', e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={10}
                placeholder={t('proveedorForm.phonePlaceholder')}
                required
              />
            </div>
            <div>
              <label className={labelClase}>{t('proveedorForm.emailLabel')}</label>
              <input
                type="email"
                className={inputClase}
                value={form.email}
                onChange={(e) => actualizarCampo('email', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClase}>{t('proveedorForm.addressLabel')}</label>
            <input
              className={inputClase}
              value={form.direccion}
              onChange={(e) => actualizarCampo('direccion', e.target.value)}
            />
          </div>

          {esEdicion && (
            <label className="flex items-center gap-2.5 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => actualizarCampo('activo', e.target.checked)}
                className="w-4 h-4 rounded border-border text-brand-forest focus:ring-brand-forest"
              />
              <span className="text-sm text-text">{t('proveedorForm.activeLabel')}</span>
            </label>
          )}

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
              {t('proveedorForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {guardando ? t('proveedorForm.saving') : esEdicion ? t('proveedorForm.saveChanges') : t('proveedorForm.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

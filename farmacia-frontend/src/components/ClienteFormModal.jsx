import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { clienteService } from '../services/clienteService';
import { useIdioma } from '../context/LanguageContext';

const VALORES_INICIALES = {
  nombre: '',
  tipoDocumento: '',
  numeroDocumento: '',
  telefono: '',
  email: '',
  direccion: '',
};

function campoDesdeCliente(cliente) {
  if (!cliente) return VALORES_INICIALES;
  return {
    nombre: cliente.nombre ?? '',
    tipoDocumento: cliente.tipoDocumento ?? '',
    numeroDocumento: cliente.numeroDocumento ?? '',
    telefono: cliente.telefono ?? '',
    email: cliente.email ?? '',
    direccion: cliente.direccion ?? '',
  };
}

const inputClase =
  'w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface';
const labelClase = 'block text-xs font-medium text-text-secondary mb-1.5';

// Mismas reglas que el backend (ClienteDTO), para avisar de una vez en el
// formulario en vez de esperar el 400 del servidor. Solo letras/espacios
// para el nombre (nada de "1"), y solo dígitos con un rango razonable para
// documento y teléfono (antes no tenían tope).
const REGEX_NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' ]{2,99}$/;
const REGEX_DOCUMENTO = /^[0-9]{6,10}$/;
const REGEX_TELEFONO = /^[0-9]{7,10}$/;

export default function ClienteFormModal({ cliente, onClose, onGuardado }) {
  const { t } = useIdioma();
  const esEdicion = !!cliente;
  const [form, setForm] = useState(campoDesdeCliente(cliente));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setForm(campoDesdeCliente(cliente));
  }, [cliente]);

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    const nombre = form.nombre.trim();
    const numeroDocumento = form.numeroDocumento.trim();
    const telefono = form.telefono.trim();

    if (!nombre) {
      setError(t('clienteForm.errorNameRequired'));
      return;
    }
    if (!REGEX_NOMBRE.test(nombre)) {
      setError(t('clienteForm.errorNameInvalid'));
      return;
    }
    if (numeroDocumento && !REGEX_DOCUMENTO.test(numeroDocumento)) {
      setError(t('clienteForm.errorDocumentInvalid'));
      return;
    }
    if (telefono && !REGEX_TELEFONO.test(telefono)) {
      setError(t('clienteForm.errorPhoneInvalid'));
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      tipoDocumento: form.tipoDocumento.trim() || null,
      numeroDocumento: form.numeroDocumento.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      direccion: form.direccion.trim() || null,
    };

    setGuardando(true);
    try {
      if (esEdicion) {
        await clienteService.actualizar(cliente.id, payload);
      } else {
        await clienteService.crear(payload);
      }
      onGuardado();
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje ||
        err.response?.data?.message ||
        t('clienteForm.errorSave');
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
            {esEdicion ? t('clienteForm.editTitle') : t('clienteForm.newTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors"
            aria-label={t('clienteForm.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={manejarSubmit} className="p-6 space-y-5">
          <div>
            <label className={labelClase}>{t('clienteForm.nameLabel')}</label>
            <input
              className={inputClase}
              value={form.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              placeholder={t('clienteForm.namePlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>{t('clienteForm.documentTypeLabel')}</label>
              <select
                className={inputClase}
                value={form.tipoDocumento}
                onChange={(e) => actualizarCampo('tipoDocumento', e.target.value)}
              >
                <option value="">{t('clienteForm.selectPlaceholder')}</option>
                <option value="CC">{t('clienteForm.docCC')}</option>
                <option value="TI">{t('clienteForm.docTI')}</option>
                <option value="CE">{t('clienteForm.docCE')}</option>
                <option value="PA">{t('clienteForm.docPA')}</option>
              </select>
            </div>
            <div>
              <label className={labelClase}>{t('clienteForm.documentNumberLabel')}</label>
              <input
                className={inputClase}
                value={form.numeroDocumento}
                onChange={(e) => actualizarCampo('numeroDocumento', e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={10}
                placeholder={t('clienteForm.documentNumberPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>{t('clienteForm.phoneLabel')}</label>
              <input
                className={inputClase}
                value={form.telefono}
                onChange={(e) => actualizarCampo('telefono', e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={10}
                placeholder={t('clienteForm.phonePlaceholder')}
              />
            </div>
            <div>
              <label className={labelClase}>{t('clienteForm.emailLabel')}</label>
              <input
                type="email"
                className={inputClase}
                value={form.email}
                onChange={(e) => actualizarCampo('email', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClase}>{t('clienteForm.addressLabel')}</label>
            <input
              className={inputClase}
              value={form.direccion}
              onChange={(e) => actualizarCampo('direccion', e.target.value)}
            />
          </div>

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
              {t('clienteForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {guardando ? t('clienteForm.saving') : esEdicion ? t('clienteForm.saveChanges') : t('clienteForm.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { categoriaService } from '../services/categoriaService';
import { useIdioma } from '../context/LanguageContext';
import { toast } from 'sonner';
import { confirmar } from './ui/Confirmacion';

const VALORES_INICIALES = { nombre: '', descripcion: '' };

const inputClase =
  'w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface';
const labelClase = 'block text-xs font-medium text-text-secondary mb-1.5';

export default function CategoriasModal({ categorias, onClose, onCambio }) {
  const { t } = useIdioma();
  const [form, setForm] = useState(VALORES_INICIALES);
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function abrirEditar(categoria) {
    setEditandoId(categoria.id);
    setForm({ nombre: categoria.nombre ?? '', descripcion: categoria.descripcion ?? '' });
    setError('');
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setForm(VALORES_INICIALES);
    setError('');
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim()) {
      setError(t('categorias.errorNameRequired'));
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
    };

    setGuardando(true);
    try {
      if (editandoId) {
        await categoriaService.actualizar(editandoId, payload);
      } else {
        await categoriaService.crear(payload);
      }
      cancelarEdicion();
      onCambio();
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje ||
        err.response?.data?.message ||
        err.response?.data?.nombre ||
        t('categorias.errorSave');
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar(categoria) {
    const confirmado = await confirmar({ titulo: t('categorias.confirmDelete', { nombre: categoria.nombre }), peligro: true });
    if (!confirmado) return;

    try {
      await categoriaService.eliminar(categoria.id);
      if (editandoId === categoria.id) cancelarEdicion();
      onCambio();
    } catch {
      toast.error(t('categorias.deleteError'));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="font-display font-semibold text-lg text-text">{t('categorias.modalTitle')}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors"
            aria-label={t('categorias.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={manejarSubmit} className="space-y-3 border border-border rounded-lg p-4">
            <div>
              <label className={labelClase}>{t('categorias.nameLabel')}</label>
              <input
                className={inputClase}
                value={form.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                placeholder={t('categorias.namePlaceholder')}
                required
              />
            </div>
            <div>
              <label className={labelClase}>{t('categorias.descriptionLabel')}</label>
              <input
                className={inputClase}
                value={form.descripcion}
                onChange={(e) => actualizarCampo('descripcion', e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              {editandoId && (
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text transition-colors"
                >
                  {t('categorias.cancelEdit')}
                </button>
              )}
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editandoId ? (
                  <>
                    <Pencil className="w-3.5 h-3.5" />
                    {guardando ? t('categorias.saving') : t('categorias.saveChanges')}
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    {guardando ? t('categorias.creating') : t('categorias.createButton')}
                  </>
                )}
              </button>
            </div>
          </form>

          <div>
            {categorias.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <div className="w-10 h-10 rounded-full bg-brand-forest-light flex items-center justify-center mb-2">
                  <Tag className="w-5 h-5 text-brand-forest" strokeWidth={1.75} />
                </div>
                <p className="text-sm text-text-secondary">{t('categorias.emptyHint')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {categorias.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">{c.nombre}</p>
                      {c.descripcion && (
                        <p className="text-xs text-text-secondary truncate">{c.descripcion}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="p-1.5 text-text-secondary hover:text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors"
                        aria-label={t('categorias.editAria', { nombre: c.nombre })}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => manejarEliminar(c)}
                        className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        aria-label={t('categorias.deleteAria', { nombre: c.nombre })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

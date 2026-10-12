import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Ban, Building2 } from 'lucide-react';
import { proveedorService } from '../services/proveedorService';
import ProveedorFormModal from '../components/ProveedorFormModal';
import { useIdioma } from '../context/LanguageContext';
import { toast } from 'sonner';
import { confirmar } from '../components/ui/Confirmacion';

export default function ProveedoresPage() {
  const { t } = useIdioma();
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);

  async function cargar(buscar) {
    setCargando(true);
    setError('');
    try {
      const data = await proveedorService.listar(buscar);
      setProveedores(data);
    } catch {
      setError(t('proveedores.loadError'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function manejarBusqueda(e) {
    e.preventDefault();
    cargar(busqueda.trim() || undefined);
  }

  function abrirCrear() {
    setProveedorEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(proveedor) {
    setProveedorEditando(proveedor);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setProveedorEditando(null);
  }

  function manejarGuardado() {
    cerrarModal();
    cargar(busqueda.trim() || undefined);
  }

  async function manejarDesactivar(proveedor) {
    const confirmado = await confirmar({ titulo: t('proveedores.confirmDeactivate', { empresa: proveedor.empresa }), peligro: true });
    if (!confirmado) return;

    try {
      await proveedorService.desactivar(proveedor.id);
      cargar(busqueda.trim() || undefined);
    } catch {
      toast.error(t('proveedores.deactivateError'));
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text">{t('proveedores.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {t('proveedores.subtitle')}
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center justify-center gap-2 bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('proveedores.newButton')}
        </button>
      </div>

      <form onSubmit={manejarBusqueda} className="mb-5 flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-disabled absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t('proveedores.searchPlaceholder')}
            className="w-full text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg transition-colors"
        >
          {t('proveedores.searchButton')}
        </button>
      </form>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-5">
          {error}
        </p>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {cargando ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-bg animate-pulse" />
            ))}
          </div>
        ) : proveedores.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-text mb-1">
              {busqueda ? t('proveedores.noResults') : t('proveedores.emptyTitle')}
            </p>
            <p className="text-sm text-text-secondary">
              {busqueda ? t('proveedores.noResultsHint') : t('proveedores.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-secondary uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">{t('proveedores.colContactName')}</th>
                  <th className="px-5 py-3 font-medium">{t('proveedores.colCompany')}</th>
                  <th className="px-5 py-3 font-medium">{t('proveedores.colPhone')}</th>
                  <th className="px-5 py-3 font-medium">{t('proveedores.colEmail')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('proveedores.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg/60">
                    <td className="px-5 py-3 font-medium text-text">{p.nombreContacto}</td>
                    <td className="px-5 py-3 text-text-secondary">{p.empresa}</td>
                    <td className="px-5 py-3 text-text-secondary">{p.telefono || '—'}</td>
                    <td className="px-5 py-3 text-text-secondary">{p.email || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirEditar(p)}
                          className="p-2 text-text-secondary hover:text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors"
                          aria-label={t('proveedores.editAria', { empresa: p.empresa })}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => manejarDesactivar(p)}
                          className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          aria-label={t('proveedores.deactivateAria', { empresa: p.empresa })}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <ProveedorFormModal proveedor={proveedorEditando} onClose={cerrarModal} onGuardado={manejarGuardado} />
      )}
    </div>
  );
}

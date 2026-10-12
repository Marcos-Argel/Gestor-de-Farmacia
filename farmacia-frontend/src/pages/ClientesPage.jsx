import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react';
import { clienteService } from '../services/clienteService';
import ClienteFormModal from '../components/ClienteFormModal';
import { useIdioma } from '../context/LanguageContext';
import { toast } from 'sonner';
import { confirmar } from '../components/ui/Confirmacion';

export default function ClientesPage() {
  const { t } = useIdioma();
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const data = await clienteService.listar();
      setClientes(data);
    } catch {
      setError(t('clientes.loadError'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(termino) ||
        c.numeroDocumento?.toLowerCase().includes(termino) ||
        c.telefono?.toLowerCase().includes(termino)
    );
  }, [clientes, busqueda]);

  function abrirCrear() {
    setClienteEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(cliente) {
    setClienteEditando(cliente);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setClienteEditando(null);
  }

  function manejarGuardado() {
    cerrarModal();
    cargar();
  }

  async function manejarEliminar(cliente) {
    const confirmado = await confirmar({ titulo: t('clientes.confirmDelete', { nombre: cliente.nombre }), peligro: true });
    if (!confirmado) return;

    try {
      await clienteService.eliminar(cliente.id);
      cargar();
    } catch {
      toast.error(t('clientes.deleteError'));
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text">{t('clientes.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {t('clientes.subtitle')}
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center justify-center gap-2 bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('clientes.newButton')}
        </button>
      </div>

      <div className="mb-5 relative max-w-md">
        <Search className="w-4 h-4 text-text-disabled absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t('clientes.searchPlaceholder')}
          className="w-full text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
        />
      </div>

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
        ) : clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-text mb-1">
              {busqueda ? t('clientes.noResults') : t('clientes.emptyTitle')}
            </p>
            <p className="text-sm text-text-secondary">
              {busqueda ? t('clientes.noResultsHint') : t('clientes.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-secondary uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">{t('clientes.colName')}</th>
                  <th className="px-5 py-3 font-medium">{t('clientes.colDocument')}</th>
                  <th className="px-5 py-3 font-medium">{t('clientes.colPhone')}</th>
                  <th className="px-5 py-3 font-medium">{t('clientes.colEmail')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('clientes.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-bg/60">
                    <td className="px-5 py-3 font-medium text-text">{c.nombre}</td>
                    <td className="px-5 py-3 text-text-secondary">
                      {c.tipoDocumento && c.numeroDocumento
                        ? `${c.tipoDocumento} ${c.numeroDocumento}`
                        : c.numeroDocumento || '—'}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{c.telefono || '—'}</td>
                    <td className="px-5 py-3 text-text-secondary">{c.email || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirEditar(c)}
                          className="p-2 text-text-secondary hover:text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors"
                          aria-label={t('clientes.editAria', { nombre: c.nombre })}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => manejarEliminar(c)}
                          className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          aria-label={t('clientes.deleteAria', { nombre: c.nombre })}
                        >
                          <Trash2 className="w-4 h-4" />
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
        <ClienteFormModal cliente={clienteEditando} onClose={cerrarModal} onGuardado={manejarGuardado} />
      )}
    </div>
  );
}

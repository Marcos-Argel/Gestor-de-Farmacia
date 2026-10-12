import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Pencil, Ban, UserCog, UserCheck } from 'lucide-react';
import { usuarioService } from '../services/usuarioService';
import { authService } from '../services/authService';
import UsuarioFormModal from '../components/UsuarioFormModal';
import { useIdioma } from '../context/LanguageContext';
import { toast } from 'sonner';
import { confirmar } from '../components/ui/Confirmacion';

export default function UsuariosPage() {
  const { t } = useIdioma();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const data = await usuarioService.listar();
      setUsuarios(data);
    } catch {
      setError(t('usuarios.loadError'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirCrear() {
    setUsuarioEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(usuario) {
    setUsuarioEditando(usuario);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setUsuarioEditando(null);
  }

  function manejarGuardado(credencialesCambiaron) {
    const emailActual = authService.obtenerUsuarioActual()?.email;
    const editabaSuPropiaCuenta = usuarioEditando?.email === emailActual;

    cerrarModal();

    if (credencialesCambiaron && editabaSuPropiaCuenta) {
      authService.logout();
      navigate('/login', {
        state: { mensaje: t('usuarios.credentialsChangedMessage') },
      });
      return;
    }

    cargar();
  }

  async function manejarDesactivar(usuario) {
    const confirmado = await confirmar({ titulo: t('usuarios.confirmDeactivate', { nombre: usuario.nombre }), peligro: true });
    if (!confirmado) return;

    try {
      await usuarioService.desactivar(usuario.id);
      cargar();
    } catch (err) {
      // El backend explica el motivo (ej. "No puedes desactivar tu propia cuenta").
      toast.error(err.response?.data?.mensaje || t('usuarios.deactivateError'));
    }
  }

  // Antes la unica forma de reactivar era abrir "Editar" y encontrar el
  // checkbox de "Activo" -- en la practica parecia que no se podia.
  async function manejarReactivar(usuario) {
    if (!await confirmar({ titulo: t('usuarios.confirmReactivate', { nombre: usuario.nombre }), peligro: false })) return;

    try {
      await usuarioService.actualizar(usuario.id, {
        nombre: usuario.nombre,
        email: usuario.email,
        rolNombre: usuario.rolNombre,
        activo: true,
      });
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || t('usuarios.reactivateError'));
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text">{t('usuarios.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {t('usuarios.subtitle')}
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center justify-center gap-2 bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t('usuarios.newButton')}
        </button>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-5">
          {error}
        </p>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {cargando ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-bg animate-pulse" />
            ))}
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
              <UserCog className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-text mb-1">{t('usuarios.emptyTitle')}</p>
            <p className="text-sm text-text-secondary">{t('usuarios.emptyHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-secondary uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">{t('usuarios.colName')}</th>
                  <th className="px-5 py-3 font-medium">{t('usuarios.colEmail')}</th>
                  <th className="px-5 py-3 font-medium">{t('usuarios.colRole')}</th>
                  <th className="px-5 py-3 font-medium">{t('usuarios.colStatus')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('usuarios.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-bg/60">
                    <td className="px-5 py-3 font-medium text-text">{u.nombre}</td>
                    <td className="px-5 py-3 text-text-secondary">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium text-brand-forest bg-brand-forest-light px-2 py-0.5 rounded-full">
                        {u.rolNombre}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.activo ? (
                        <span className="text-xs font-medium text-brand-forest bg-brand-forest-light px-2 py-0.5 rounded-full">{t('usuarios.active')}</span>
                      ) : (
                        <span className="text-xs font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-full">{t('usuarios.inactive')}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirEditar(u)}
                          className="p-2 text-text-secondary hover:text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors"
                          aria-label={t('usuarios.editAria', { nombre: u.nombre })}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {u.activo ? (
                          <button
                            onClick={() => manejarDesactivar(u)}
                            className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            aria-label={t('usuarios.deactivateAria', { nombre: u.nombre })}
                            title={t('usuarios.deactivateAria', { nombre: u.nombre })}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => manejarReactivar(u)}
                            className="p-2 text-text-secondary hover:text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors"
                            aria-label={t('usuarios.reactivateAria', { nombre: u.nombre })}
                            title={t('usuarios.reactivateAria', { nombre: u.nombre })}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
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
        <UsuarioFormModal usuario={usuarioEditando} onClose={cerrarModal} onGuardado={manejarGuardado} />
      )}
    </div>
  );
}

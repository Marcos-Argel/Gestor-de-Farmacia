import { useEffect, useState } from 'react';
import { Settings, Pencil, Check, X, Sun, Moon, Languages } from 'lucide-react';
import { configuracionService } from '../services/configuracionService';
import { useTema } from '../context/ThemeContext';
import { useIdioma, IDIOMAS_DISPONIBLES } from '../context/LanguageContext';
import { esSupervisor } from '../utils/permisos';
import { toast } from 'sonner';

export default function ConfiguracionPage() {
  const { alternarTema, esOscuro } = useTema();
  const { idioma, cambiarIdioma, t } = useIdioma();
  // Solo ADMIN/GERENTE pueden leer o editar los datos de la farmacia (el
  // backend responde 403 al resto). Los demas roles igual entran aqui
  // para cambiar su tema e idioma, sin ver un error.
  const puedeEditarFarmacia = esSupervisor();
  const [configs, setConfigs] = useState([]);
  const [cargando, setCargando] = useState(puedeEditarFarmacia);
  const [error, setError] = useState('');

  const [editando, setEditando] = useState(null);
  const [valorEditado, setValorEditado] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (puedeEditarFarmacia) cargar();
  }, [puedeEditarFarmacia]);

  function cargar() {
    setCargando(true);
    setError('');
    configuracionService
      .listar()
      .then(setConfigs)
      .catch(() => setError('No pudimos cargar la configuración. Verifica que el backend esté disponible.'))
      .finally(() => setCargando(false));
  }

  function empezarEdicion(config) {
    setEditando(config.clave);
    setValorEditado(config.valor);
  }

  function cancelarEdicion() {
    setEditando(null);
    setValorEditado('');
  }

  async function guardarEdicion(clave) {
    setGuardando(true);
    try {
      const actualizada = await configuracionService.actualizar(clave, valorEditado);
      setConfigs((prev) => prev.map((c) => (c.clave === clave ? actualizada : c)));
      setEditando(null);
      toast.success(t('config.saved'));
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No pudimos guardar el cambio.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-text">{t('config.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">{t('config.subtitle')}</p>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-5">
          {error}
        </p>
      )}

      {/* Apariencia e idioma: son preferencias del navegador (localStorage),
          no datos de la farmacia -- por eso no usan configuracionService
          ni pasan por el backend, a diferencia de la lista de abajo. */}
      <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-brand-forest-light flex items-center justify-center shrink-0">
            {esOscuro ? (
              <Moon className="w-4 h-4 text-brand-forest" strokeWidth={1.75} />
            ) : (
              <Sun className="w-4 h-4 text-brand-forest" strokeWidth={1.75} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">{t('config.darkMode')}</p>
            <p className="text-xs text-text-secondary">
              {esOscuro ? t('config.on') : t('config.off')} · {t('config.savedLocally')}
            </p>
          </div>
        </div>
        <button
          onClick={alternarTema}
          role="switch"
          aria-checked={esOscuro}
          aria-label="Alternar modo oscuro"
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
            esOscuro ? 'bg-brand-forest' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow transition-transform ${
              esOscuro ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl px-5 py-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-brand-forest-light flex items-center justify-center shrink-0">
            <Languages className="w-4 h-4 text-brand-forest" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">{t('config.language')}</p>
            <p className="text-xs text-text-secondary">{t('config.languageHint')}</p>
          </div>
        </div>
        <select
          value={idioma}
          onChange={(e) => cambiarIdioma(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
        >
          {IDIOMAS_DISPONIBLES.map((op) => (
            <option key={op.codigo} value={op.codigo}>
              {op.etiqueta}
            </option>
          ))}
        </select>
      </div>

      {puedeEditarFarmacia && (
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {cargando ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-bg animate-pulse" />
            ))}
          </div>
        ) : configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
              <Settings className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-text">{t('config.noValues')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {configs.map((c) => (
              <div key={c.clave} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text">{c.descripcion || c.clave}</p>
                  <p className="text-xs text-text-disabled font-mono">{c.clave}</p>
                </div>

                {editando === c.clave ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-72">
                    <input
                      autoFocus
                      value={valorEditado}
                      onChange={(e) => setValorEditado(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') guardarEdicion(c.clave);
                        if (e.key === 'Escape') cancelarEdicion();
                      }}
                      className="flex-1 min-w-0 text-sm border border-brand-forest rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-brand-forest bg-surface"
                    />
                    <button
                      onClick={() => guardarEdicion(c.clave)}
                      disabled={guardando}
                      className="p-1.5 text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Guardar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelarEdicion}
                      className="p-1.5 text-text-secondary hover:bg-bg rounded-lg transition-colors"
                      aria-label="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => empezarEdicion(c)}
                    className="flex items-center gap-2 min-w-0 shrink-0 sm:max-w-[45%] text-left text-sm font-medium text-text hover:text-brand-forest transition-colors group"
                    title={c.valor}
                  >
                    <span className="truncate">{c.valor || '—'}</span>
                    <Pencil className="w-3.5 h-3.5 shrink-0 text-text-disabled group-hover:text-brand-forest" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, History, Eye } from 'lucide-react';
import { auditoriaService } from '../services/auditoriaService';
import AuditoriaDetalleModal from '../components/AuditoriaDetalleModal';
import { useIdioma } from '../context/LanguageContext';

const ESTILO_ACCION = {
  INSERT: 'text-brand-forest bg-brand-forest-light',
  UPDATE: 'text-accent-copper bg-accent-copper-light',
  DELETE: 'text-danger bg-danger/10',
};

export default function AuditoriaPage() {
  const { t } = useIdioma();
  const [pagina, setPagina] = useState(0);
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError('');
    auditoriaService
      .listar(pagina, 20)
      .then((res) => {
        if (activo) setData(res);
      })
      .catch(() => {
        if (activo) setError(t('auditoria.loadError'));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [pagina]);

  const registros = data?.content ?? [];
  const totalPaginas = data?.totalPages ?? 0;

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-text">{t('auditoria.title')}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {t('auditoria.subtitle')}
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-5">
          {error}
        </p>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {cargando ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-bg animate-pulse" />
            ))}
          </div>
        ) : registros.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
              <History className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-text mb-1">{t('auditoria.emptyTitle')}</p>
            <p className="text-sm text-text-secondary">
              {t('auditoria.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-secondary uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">{t('auditoria.colDate')}</th>
                  <th className="px-5 py-3 font-medium">{t('auditoria.colUser')}</th>
                  <th className="px-5 py-3 font-medium">{t('auditoria.colAction')}</th>
                  <th className="px-5 py-3 font-medium">{t('auditoria.colTable')}</th>
                  <th className="px-5 py-3 font-medium">{t('auditoria.colRecord')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('auditoria.colDetail')}</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg/60">
                    <td className="px-5 py-3 text-text-secondary whitespace-nowrap">
                      {new Date(r.fecha).toLocaleString('es-CO')}
                    </td>
                    <td className="px-5 py-3 text-text">{r.usuarioNombre}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTILO_ACCION[r.accion] ?? ''}`}
                      >
                        {r.accion}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{r.tablaAfectada}</td>
                    <td className="px-5 py-3 text-text-secondary">#{r.registroId}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setRegistroSeleccionado(r)}
                          className="p-2 text-text-secondary hover:text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors"
                          aria-label={t('auditoria.viewDetailAria')}
                        >
                          <Eye className="w-4 h-4" />
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

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-text-secondary">
            {t('auditoria.pageOf', { actual: pagina + 1, total: totalPaginas })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              disabled={pagina === 0}
              className="p-2 border border-border rounded-lg text-text-secondary hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('auditoria.prevPageAria')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              disabled={pagina >= totalPaginas - 1}
              className="p-2 border border-border rounded-lg text-text-secondary hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('auditoria.nextPageAria')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {registroSeleccionado && (
        <AuditoriaDetalleModal
          registro={registroSeleccionado}
          onClose={() => setRegistroSeleccionado(null)}
        />
      )}
    </div>
  );
}

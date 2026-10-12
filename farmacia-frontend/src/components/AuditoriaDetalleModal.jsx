import { X } from 'lucide-react';
import { useIdioma } from '../context/LanguageContext';

// Traduce nombres de columnas de la base de datos (snake_case) a etiquetas
// legibles. No cubre absolutamente todas las tablas del sistema, pero cae
// bien en un fallback razonable ("stock_actual" -> "Stock actual") para
// cualquier columna que no esté en el diccionario.
// Campos que no aportan nada útil en la comparación visual (ya se muestra
// el ID en el encabezado del modal, y el hash de contraseña no debe
// mostrarse aunque técnicamente esté en el JSON de auditoría).
const CAMPOS_OCULTOS = new Set(['id', 'password_hash']);

// Mapa de rol_id -> nombre. Coincide con el orden de inserción en
// farmacy_schema.sql (roles con IDENTITY: ADMIN=1, VENDEDOR=2, CAJERO=3,
// INVENTARIO=4) y con el array ROLES de UsuarioFormModal.jsx. Si en algún
// momento se agregan/reordenan roles directamente en la BD, este mapa hay
// que actualizarlo a mano (no se consulta la tabla roles en tiempo real).
//
// Tras la migracion migracion_rol_gerente.sql, el rol CAJERO (id 3) se
// eliminó y se creó GERENTE con un id nuevo (probablemente 5, ya que el
// contador IDENTITY no reutiliza ids borrados). Se deja el 3 -> 'CAJERO'
// para que las auditorías VIEJAS (de antes de la migración) se sigan
// leyendo correctamente -- son historial, no se deben cambiar. Verifica
// con el SELECT final de esa migración cuál quedó siendo el id real de
// GERENTE y ajústalo abajo si no es 5.
const ROLES_POR_ID = {
  1: 'ADMIN',
  2: 'VENDEDOR',
  3: 'CAJERO', // rol historico, ya no existe pero queda para leer auditorías viejas
  4: 'INVENTARIO',
  5: 'GERENTE', // ⚠️ confirma este id con el SELECT final de migracion_rol_gerente.sql
};

function etiquetaDe(t, campo) {
  return t(`auditoriaDetalle.fields.${campo}`) ?? campo.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function formatearValor(t, campo, valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? t('auditoriaDetalle.yes') : t('auditoriaDetalle.no');
  if (campo === 'rol_id') return ROLES_POR_ID[valor] ?? t('auditoriaDetalle.roleHash', { id: valor });
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString('es-CO');
  }
  if (typeof valor === 'number' && /precio/.test(campo)) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
      valor
    );
  }
  return String(valor);
}

function parsearJson(texto) {
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

export default function AuditoriaDetalleModal({ registro, onClose }) {
  const { t } = useIdioma();
  const anteriores = parsearJson(registro.valoresAnteriores);
  const nuevos = parsearJson(registro.valoresNuevos);

  const campos = Array.from(
    new Set([...Object.keys(anteriores ?? {}), ...Object.keys(nuevos ?? {})])
  ).filter((campo) => !CAMPOS_OCULTOS.has(campo));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface">
          <div>
            <h2 className="font-display font-semibold text-lg text-text">
              {registro.tablaAfectada} · {t('auditoriaDetalle.recordLabel')} #{registro.registroId}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {registro.usuarioNombre} · {new Date(registro.fecha).toLocaleString('es-CO')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors"
            aria-label={t('auditoriaDetalle.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {campos.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('auditoriaDetalle.noDetails')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-secondary uppercase tracking-wide border-b border-border">
                  <th className="py-2 pr-3 font-medium">{t('auditoriaDetalle.fieldCol')}</th>
                  {anteriores && <th className="py-2 px-3 font-medium">{t('auditoriaDetalle.beforeCol')}</th>}
                  {nuevos && <th className="py-2 pl-3 font-medium">{t('auditoriaDetalle.afterCol')}</th>}
                </tr>
              </thead>
              <tbody>
                {campos.map((campo) => {
                  const valorAntes = anteriores ? anteriores[campo] : undefined;
                  const valorDespues = nuevos ? nuevos[campo] : undefined;
                  const cambio =
                    anteriores && nuevos && JSON.stringify(valorAntes) !== JSON.stringify(valorDespues);

                  return (
                    <tr key={campo} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-3 text-text-secondary whitespace-nowrap">{etiquetaDe(t, campo)}</td>
                      {anteriores && (
                        <td
                          className={`py-2.5 px-3 ${cambio ? 'text-danger line-through decoration-danger/40' : 'text-text'}`}
                        >
                          {formatearValor(t, campo, valorAntes)}
                        </td>
                      )}
                      {nuevos && (
                        <td className={`py-2.5 pl-3 ${cambio ? 'text-brand-forest font-medium' : 'text-text'}`}>
                          {formatearValor(t, campo, valorDespues)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

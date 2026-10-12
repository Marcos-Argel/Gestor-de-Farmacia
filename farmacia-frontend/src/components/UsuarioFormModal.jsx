import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { usuarioService } from '../services/usuarioService';
import { authService } from '../services/authService';
import { useIdioma } from '../context/LanguageContext';

// No existe todavia un endpoint /api/roles en el backend, asi que por ahora
// se deja esta lista fija con los 4 roles que ya existen en la tabla `roles`.
// Si el dia de mañana agregas o cambias roles ahi, hay que actualizar esto
// tambien (o mejor, construir el endpoint y reemplazar este arreglo).
// CAJERO se elimino (hacia lo mismo que VENDEDOR) y se agrego GERENTE.
const ROLES = ['ADMIN', 'GERENTE', 'VENDEDOR', 'INVENTARIO'];

// Un GERENTE puede crear/editar usuarios, pero NO puede asignar el rol
// ADMIN ni GERENTE (esa regla tambien se valida en el backend, aqui es
// solo para no mostrar opciones que el servidor va a rechazar igual).
const ROLES_SENSIBLES = new Set(['ADMIN', 'GERENTE']);

const VALORES_INICIALES = {
  nombre: '',
  email: '',
  rolNombre: 'VENDEDOR',
  password: '',
  activo: true,
};

function campoDesdeUsuario(usuario) {
  if (!usuario) return VALORES_INICIALES;
  return {
    nombre: usuario.nombre ?? '',
    email: usuario.email ?? '',
    rolNombre: usuario.rolNombre ?? 'VENDEDOR',
    password: '',
    activo: usuario.activo ?? true,
  };
}

const inputClase =
  'w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface';
const labelClase = 'block text-xs font-medium text-text-secondary mb-1.5';

// Mismas reglas que el backend (UsuarioDTO): nombre solo letras, contraseña
// minimo 6 caracteres. Antes no se validaba nada de esto en el formulario.
const REGEX_NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' ]{2,99}$/;

export default function UsuarioFormModal({ usuario, onClose, onGuardado }) {
  const { t } = useIdioma();
  const esEdicion = !!usuario;
  const [form, setForm] = useState(campoDesdeUsuario(usuario));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const rolPropio = authService.obtenerUsuarioActual()?.rol;
  const esAdminActual = rolPropio === 'ADMIN';
  // El GERENTE no debe ver ADMIN/GERENTE como opciones para asignar (el
  // backend igual lo rechazaria, pero asi evitamos el viaje al servidor
  // solo para recibir un error). Si estas editando a alguien que YA es
  // ADMIN/GERENTE y no eres ADMIN, se deja su rol actual visible pero
  // deshabilitado, para no ocultarle el dato.
  const rolesDisponibles = esAdminActual
    ? ROLES
    : ROLES.filter((r) => !ROLES_SENSIBLES.has(r) || r === form.rolNombre);

  useEffect(() => {
    setForm(campoDesdeUsuario(usuario));
  }, [usuario]);

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    const nombre = form.nombre.trim();
    const password = form.password.trim();

    if (!nombre || !form.email.trim()) {
      setError(t('usuarioForm.errorRequired'));
      return;
    }
    if (!REGEX_NOMBRE.test(nombre)) {
      setError(t('usuarioForm.errorNameInvalid'));
      return;
    }
    if (!esEdicion && !password) {
      setError(t('usuarioForm.errorPasswordRequired'));
      return;
    }
    if (password && password.length < 6) {
      setError(t('usuarioForm.errorPasswordTooShort'));
      return;
    }

    const payload = {
      nombre,
      email: form.email.trim(),
      rolNombre: form.rolNombre,
      activo: form.activo,
    };
    if (password) {
      payload.password = password;
    }

    setGuardando(true);
    try {
      if (esEdicion) {
        await usuarioService.actualizar(usuario.id, payload);
      } else {
        await usuarioService.crear(payload);
      }
      // Si estabas editando y cambiaste el email o la contraseña, el token
      // JWT que tiene el navegador queda desactualizado (sigue apuntando
      // al email viejo). Se lo avisamos al padre para que pueda forzar un
      // cierre de sesión si era tu propia cuenta.
      const credencialesCambiaron =
        esEdicion && (form.email.trim() !== usuario.email || form.password.trim() !== '');
      onGuardado(credencialesCambiaron);
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje ||
        err.response?.data?.message ||
        t('usuarioForm.errorSave');
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
            {esEdicion ? t('usuarioForm.editTitle') : t('usuarioForm.newTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors"
            aria-label={t('usuarioForm.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={manejarSubmit} className="p-6 space-y-5">
          <div>
            <label className={labelClase}>{t('usuarioForm.nameLabel')}</label>
            <input
              className={inputClase}
              value={form.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelClase}>{t('usuarioForm.emailLabel')}</label>
            <input
              type="email"
              className={inputClase}
              value={form.email}
              onChange={(e) => actualizarCampo('email', e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelClase}>{t('usuarioForm.roleLabel')}</label>
            <select
              className={inputClase}
              value={form.rolNombre}
              onChange={(e) => actualizarCampo('rolNombre', e.target.value)}
              disabled={!esAdminActual && ROLES_SENSIBLES.has(form.rolNombre)}
            >
              {rolesDisponibles.map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
            {!esAdminActual && ROLES_SENSIBLES.has(form.rolNombre) && (
              <p className="text-xs text-text-secondary mt-1">
                {t('usuarioForm.roleRestrictedNote', { rol: form.rolNombre })}
              </p>
            )}
          </div>

          <div>
            <label className={labelClase}>
              {esEdicion ? t('usuarioForm.newPasswordLabel') : t('usuarioForm.passwordLabel')}
            </label>
            <input
              type="password"
              className={inputClase}
              value={form.password}
              onChange={(e) => actualizarCampo('password', e.target.value)}
              placeholder={t('usuarioForm.passwordPlaceholder')}
              minLength={esEdicion ? undefined : 6}
              required={!esEdicion}
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
              <span className="text-sm text-text">{t('usuarioForm.activeLabel')}</span>
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
              {t('usuarioForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 bg-brand-forest hover:bg-brand-forest-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {guardando ? t('usuarioForm.saving') : esEdicion ? t('usuarioForm.saveChanges') : t('usuarioForm.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

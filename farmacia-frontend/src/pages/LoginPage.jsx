import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Info,
  Loader2,
  PackageCheck,
  CalendarClock,
  BarChart3,
  ScanLine,
  Sun,
  Moon,
  Languages,
  ArrowBigUp,
  UserRound,
} from 'lucide-react';
import { authService } from '../services/authService';
import GoogleLoginButton from '../components/GoogleLoginButton';
import { useIdioma, IDIOMAS_DISPONIBLES } from '../context/LanguageContext';
import { useTema } from '../context/ThemeContext';
import logoFarmacia from '../assets/logo-farma-argel.png';

const BENEFICIOS = [
  { clave: 'login.benefit1', icono: PackageCheck },
  { clave: 'login.benefit2', icono: CalendarClock },
  { clave: 'login.benefit3', icono: BarChart3 },
  { clave: 'login.benefit4', icono: ScanLine },
];

const CLAVE_EMAIL_RECORDADO = 'farmacia_email_recordado';

function leerEmailRecordado() {
  try {
    return localStorage.getItem(CLAVE_EMAIL_RECORDADO) ?? '';
  } catch {
    return '';
  }
}

const campoClase =
  'flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 h-11 transition-colors focus-within:border-brand-forest focus-within:ring-3 focus-within:ring-brand-forest/15';

// El sistema es de uso interno: solo entra el personal de la farmacia. Ya
// no hay registro publico ni portal de clientes (se quitaron a pedido).
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, idioma, cambiarIdioma } = useIdioma();
  const { esOscuro, alternarTema } = useTema();
  const mensajeInfo = location.state?.mensaje;

  const [email, setEmail] = useState(leerEmailRecordado);
  const [recordarEmail, setRecordarEmail] = useState(() => leerEmailRecordado() !== '');
  const [mayusculasActivas, setMayusculasActivas] = useState(false);
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar(accion, mensajeError) {
    setError('');
    setCargando(true);
    try {
      await accion();
      try {
        if (recordarEmail && email.trim()) localStorage.setItem(CLAVE_EMAIL_RECORDADO, email.trim());
        else localStorage.removeItem(CLAVE_EMAIL_RECORDADO);
      } catch {
        // sin localStorage (modo privado) simplemente no se recuerda
      }
      navigate('/panel/inicio', { replace: true });
    } catch (err) {
      // Sin respuesta = el backend no esta corriendo (el proxy da 502).
      const sinServidor = !err.response || err.response.status >= 502;
      setError(sinServidor ? t('login.errorServer') : err.response?.data?.mensaje || mensajeError);
    } finally {
      setCargando(false);
    }
  }

  function manejarSubmit(e) {
    e.preventDefault();
    entrar(() => authService.login(email.trim(), password), t('login.errorGeneric'));
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Panel de marca */}
      <aside className="relative hidden w-[46%] max-w-2xl flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div
          className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-brand-mint/15 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at top right, black 10%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-white p-1.5 shadow-lg">
            <img src={logoFarmacia} alt="" className="size-full object-contain" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold text-white">Farma Argel</span>
            <span className="block text-sm text-sidebar-text/60">{t('nav.subtitle')}</span>
          </span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">{t('login.title')}</h1>
          <p className="mt-3 max-w-md text-sidebar-text/75">{t('login.tagline')}</p>

          <ul className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {BENEFICIOS.map(({ clave, icono: Icono }) => (
              <li key={clave} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <Icono className="size-5 text-brand-mint" strokeWidth={2} />
                <p className="mt-3 text-sm font-medium leading-snug text-white">{t(clave)}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-text/45">{t('login.copyright', { anio: new Date().getFullYear() })}</p>
      </aside>

      {/* Formulario */}
      <main className="relative flex flex-1 items-center justify-center p-6 sm:p-10">
        {/* Idioma y tema se pueden elegir antes de entrar */}
        <div className="absolute top-4 right-4 flex items-center gap-1 sm:top-6 sm:right-6">
          <label className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-text-secondary hover:bg-muted">
            <Languages className="size-4" />
            <span className="sr-only">{t('config.language')}</span>
            <select
              value={idioma}
              onChange={(e) => cambiarIdioma(e.target.value)}
              className="cursor-pointer bg-transparent text-sm text-text outline-none"
            >
              {IDIOMAS_DISPONIBLES.map((op) => (
                <option key={op.codigo} value={op.codigo} className="bg-surface text-text">
                  {op.etiqueta}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={alternarTema}
            className="grid size-9 place-items-center rounded-lg text-text-secondary hover:bg-muted hover:text-text"
            aria-label={esOscuro ? t('common.lightTheme') : t('common.darkTheme')}
            title={esOscuro ? t('common.lightTheme') : t('common.darkTheme')}
          >
            {esOscuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>

        <div className="w-full max-w-sm">
          {/* En celular (sin el panel verde) va el logo; en pantalla grande,
              el avatar de "perfil sin foto" sobre el titulo. */}
          <div className="mb-6 flex justify-center lg:hidden">
            <span className="grid size-20 place-items-center rounded-2xl border border-border bg-white p-2 shadow-sm">
              <img src={logoFarmacia} alt="Farma Argel" className="size-full object-contain" />
            </span>
          </div>
          <div className="mb-6 hidden justify-center lg:flex">
            <span className="grid size-20 place-items-center rounded-full bg-brand-forest-light ring-8 ring-brand-forest-light/40">
              <UserRound className="size-10 text-brand-forest" strokeWidth={1.75} />
            </span>
          </div>

          <h2 className="text-center text-2xl font-semibold tracking-tight text-text">{t('login.heading')}</h2>
          <p className="mt-1.5 text-center text-sm text-text-secondary">{t('login.subheading')}</p>

          {mensajeInfo && (
            <p className="mt-6 flex items-start gap-2 rounded-lg border border-info/25 bg-info/10 px-3 py-2.5 text-sm text-text">
              <Info className="mt-0.5 size-4 shrink-0 text-info" />
              {mensajeInfo}
            </p>
          )}

          <form onSubmit={manejarSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text">
                {t('login.emailLabel')}
              </label>
              <div className={campoClase}>
                <Mail className="size-4 shrink-0 text-text-disabled" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus={!email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-text-disabled"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text">
                {t('login.passwordLabel')}
              </label>
              <div className={campoClase}>
                <Lock className="size-4 shrink-0 text-text-disabled" />
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  autoFocus={!!email}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => setMayusculasActivas(e.getModifierState?.('CapsLock') ?? false)}
                  onKeyUp={(e) => setMayusculasActivas(e.getModifierState?.('CapsLock') ?? false)}
                  onBlur={() => setMayusculasActivas(false)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-text-disabled"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="shrink-0 text-text-disabled transition-colors hover:text-text-secondary"
                  aria-label={mostrarPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {mayusculasActivas && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warning">
                  <ArrowBigUp className="size-3.5" />
                  {t('login.capsLock')}
                </p>
              )}
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={recordarEmail}
                onChange={(e) => setRecordarEmail(e.target.checked)}
                className="size-4 rounded border-border accent-brand-forest"
              />
              {t('login.rememberEmail')}
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-forest text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-forest-dark disabled:opacity-60"
            >
              {cargando && <Loader2 className="size-4 animate-spin" />}
              {cargando ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-text-disabled">{t('login.orDivider')}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex justify-center">
            <GoogleLoginButton
              oscuro={esOscuro}
              idioma={idioma}
              texto={t('login.googleButton')}
              onCredential={(idToken) => entrar(() => authService.loginGoogle(idToken), t('login.errorGoogleGeneric'))}
              onError={() => setError(t('login.errorGoogleGeneric'))}
            />
          </div>

          <p className="mt-8 text-center text-xs text-text-secondary">{t('login.forgotPassword')}</p>
        </div>
      </main>
    </div>
  );
}

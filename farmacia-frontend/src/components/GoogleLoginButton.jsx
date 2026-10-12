import { useEffect, useRef } from 'react';

// Envuelve el script de Google Identity Services (cargado en index.html)
// en un componente de React. Renderiza el boton oficial de Google dentro
// de "contenedorRef" y avisa al padre con onCredential(idToken) cuando la
// persona termina de autenticarse -- el padre decide que hacer con ese
// token (en LoginPage.jsx, mandarlo a authService.loginGoogle).
//
// Si VITE_GOOGLE_CLIENT_ID todavia no esta configurado (ver .env.example),
// no se rompe nada: simplemente no se renderiza ningun boton.

// google.accounts.id.initialize() debe llamarse UNA vez por carga de
// pagina (si no, Google avisa "initialize() is called multiple times").
// El callback real se lee de una referencia que siempre apunta al ultimo.
let inicializado = false;
let callbackActual = () => {};

// "oscuro" e "idioma" hacen que el boton combine con el tema y hable el
// mismo idioma que el resto de la pantalla (se vuelve a dibujar si cambian).
export default function GoogleLoginButton({ onCredential, onError, texto, oscuro = false, idioma = 'es' }) {
  const contenedorRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    callbackActual = (respuesta) => {
      if (respuesta?.credential) {
        onCredential(respuesta.credential);
      } else {
        onError?.();
      }
    };
  }, [onCredential, onError]);

  useEffect(() => {
    if (!clientId) return;

    let cancelado = false;

    function inicializar() {
      if (cancelado || !window.google?.accounts?.id || !contenedorRef.current) return;

      if (!inicializado) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (respuesta) => callbackActual(respuesta),
        });
        inicializado = true;
      }

      // Google acepta un ancho fijo en px (maximo 400): se usa el del
      // contenedor para que quede igual de ancho que el formulario.
      const ancho = Math.min(400, Math.max(200, contenedorRef.current.offsetWidth || 320));
      contenedorRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(contenedorRef.current, {
        type: 'standard',
        theme: oscuro ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'rectangular',
        width: ancho,
        text: 'continue_with',
        locale: idioma,
      });
    }

    // El script de Google (index.html) se carga con "async defer", asi
    // que puede que todavia no este listo cuando este componente monta.
    // Se reintenta cada 100ms hasta que "window.google" exista.
    if (window.google?.accounts?.id) {
      inicializar();
    } else {
      const intervalo = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(intervalo);
          inicializar();
        }
      }, 100);
      return () => {
        cancelado = true;
        clearInterval(intervalo);
      };
    }
  }, [clientId, oscuro, idioma]);

  if (!clientId) return null;

  return <div ref={contenedorRef} className="flex min-h-11 w-full justify-center" aria-label={texto} />;
}

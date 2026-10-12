import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useIdioma } from '../../context/LanguageContext';

// Reemplazo de window.confirm(): el del navegador se ve distinto en cada
// navegador, no respeta el modo oscuro y bloquea la pagina. Este se usa
// igual de facil, pero con await:
//
//   if (!(await confirmar({ titulo: '...', mensaje: '...', peligro: true }))) return;
//
// <DialogoConfirmacion /> se monta una sola vez en main.jsx.

let abrirDialogo = null;

export function confirmar(opciones) {
  if (!abrirDialogo) return Promise.resolve(window.confirm(opciones.mensaje ?? opciones.titulo));
  return new Promise((resolve) => abrirDialogo({ ...opciones, resolve }));
}

export function DialogoConfirmacion() {
  const { t } = useIdioma();
  const [actual, setActual] = useState(null);
  const botonConfirmarRef = useRef(null);

  useEffect(() => {
    abrirDialogo = setActual;
    return () => {
      abrirDialogo = null;
    };
  }, []);

  useEffect(() => {
    if (!actual) return;
    botonConfirmarRef.current?.focus();
    function alPresionar(e) {
      if (e.key === 'Escape') responder(false);
    }
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  });

  function responder(valor) {
    actual?.resolve(valor);
    setActual(null);
  }

  if (!actual) return null;
  const Icono = actual.peligro ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => responder(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmacion-titulo"
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="flex gap-4">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${
              actual.peligro ? 'bg-danger/10 text-danger' : 'bg-brand-forest-light text-brand-forest'
            }`}
          >
            <Icono className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="confirmacion-titulo" className="font-semibold text-text">
              {actual.titulo}
            </h2>
            {actual.mensaje && <p className="mt-1 text-sm text-text-secondary">{actual.mensaje}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => responder(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-muted transition-colors"
          >
            {actual.textoCancelar ?? t('common.cancel')}
          </button>
          <button
            ref={botonConfirmarRef}
            onClick={() => responder(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              actual.peligro ? 'bg-danger hover:bg-danger/90' : 'bg-brand-forest hover:bg-brand-forest-dark'
            }`}
          >
            {actual.textoConfirmar ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

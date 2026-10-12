import { createContext, useContext, useMemo, useState } from 'react';
import es from '../i18n/es';
import en from '../i18n/en';
import pt from '../i18n/pt';
import fr from '../i18n/fr';
import de from '../i18n/de';

const CLAVE_STORAGE = 'farmacia_idioma';
const IDIOMA_POR_DEFECTO = 'es';

// DICCIONARIOS: cada uno debe tener exactamente las mismas claves que
// es.js (el idioma fuente) -- ver el comentario al inicio de ese archivo.
const DICCIONARIOS = { es, en, pt, fr, de };

// Codigo de idioma -> locale de verdad (para Intl.NumberFormat/Date). Se
// usa en las pantallas que formatean fechas o moneda, para que tambien
// respeten el idioma elegido (separador de miles, nombre del mes, etc).
// La MONEDA se mantiene en pesos colombianos (COP) siempre, sin importar
// el idioma -- eso es un dato del negocio, no del idioma de la interfaz.
export const LOCALES = { es: 'es-CO', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' };

// Lista para el selector de idioma en Configuracion.
export const IDIOMAS_DISPONIBLES = [
  { codigo: 'es', etiqueta: 'Español' },
  { codigo: 'en', etiqueta: 'English' },
  { codigo: 'pt', etiqueta: 'Português' },
  { codigo: 'fr', etiqueta: 'Français' },
  { codigo: 'de', etiqueta: 'Deutsch' },
];

const LanguageContext = createContext(null);

// Busca "dashboard.greeting" dentro de { dashboard: { greeting: '...' } }.
function buscarPorRuta(objeto, ruta) {
  return ruta.split('.').reduce((actual, parte) => (actual ? actual[parte] : undefined), objeto);
}

// Reemplaza {{nombre}} por vars.nombre dentro del texto ya traducido.
function interpolar(texto, vars) {
  if (!vars) return texto;
  return texto.replace(/\{\{(\w+)\}\}/g, (coincidencia, clave) =>
    vars[clave] !== undefined ? String(vars[clave]) : coincidencia
  );
}

function obtenerIdiomaInicial() {
  const guardado = localStorage.getItem(CLAVE_STORAGE);
  return guardado && DICCIONARIOS[guardado] ? guardado : IDIOMA_POR_DEFECTO;
}

export function LanguageProvider({ children }) {
  const [idioma, setIdioma] = useState(obtenerIdiomaInicial);

  function cambiarIdioma(nuevoIdioma) {
    if (!DICCIONARIOS[nuevoIdioma]) return;
    setIdioma(nuevoIdioma);
    localStorage.setItem(CLAVE_STORAGE, nuevoIdioma);
  }

  // t('dashboard.greeting', { nombre: 'Marcos' }) -> "Hola, Marcos 👋"
  // Si la clave no existe en el idioma actual, cae al español. Si tampoco
  // existe en español (typo, o clave que aun no se agrego), devuelve la
  // clave tal cual -- para que sea obvio en pantalla que falta traducir,
  // en vez de que la app se rompa.
  const t = useMemo(() => {
    return (clave, vars) => {
      const texto =
        buscarPorRuta(DICCIONARIOS[idioma], clave) ?? buscarPorRuta(DICCIONARIOS[IDIOMA_POR_DEFECTO], clave);
      if (texto === undefined) return clave;
      return interpolar(texto, vars);
    };
  }, [idioma]);

  const valor = useMemo(
    () => ({ idioma, cambiarIdioma, t, locale: LOCALES[idioma] }),
    [idioma, t]
  );

  return <LanguageContext.Provider value={valor}>{children}</LanguageContext.Provider>;
}

export function useIdioma() {
  const contexto = useContext(LanguageContext);
  if (!contexto) {
    throw new Error('useIdioma debe usarse dentro de <LanguageProvider>');
  }
  return contexto;
}

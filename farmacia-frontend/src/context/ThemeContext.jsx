import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const CLAVE_STORAGE = 'farmacia_tema';

function obtenerTemaInicial() {
  // El script inline de index.html ya decidio si el <html> arranca con
  // la clase "dark" o no (para evitar el flash antes de que React monte).
  // Aqui solo se sincroniza el estado de React con lo que ya quedo en el DOM.
  return document.documentElement.classList.contains('dark') ? 'oscuro' : 'claro';
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(obtenerTemaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'oscuro');
    localStorage.setItem(CLAVE_STORAGE, tema);
  }, [tema]);

  function alternarTema() {
    setTema((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro'));
  }

  return (
    <ThemeContext.Provider value={{ tema, alternarTema, esOscuro: tema === 'oscuro' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTema() {
  const contexto = useContext(ThemeContext);
  if (!contexto) {
    throw new Error('useTema debe usarse dentro de <ThemeProvider>');
  }
  return contexto;
}

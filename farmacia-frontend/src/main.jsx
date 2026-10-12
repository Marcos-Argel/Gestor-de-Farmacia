import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'
import { ThemeProvider, useTema } from './context/ThemeContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { DialogoConfirmacion } from './components/ui/Confirmacion.jsx'

// Avisos flotantes (toast.success / toast.error) en vez de window.alert().
function Avisos() {
  const { esOscuro } = useTema()
  return <Toaster theme={esOscuro ? 'dark' : 'light'} position="top-right" richColors closeButton />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <App />
        <Avisos />
        <DialogoConfirmacion />
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>,
)

import axios from 'axios';

// En local, '/api' es una ruta relativa que el proxy de Vite (ver
// vite.config.js) redirige a localhost:8080 -- no hace falta configurar
// nada. En produccion (Render), frontend y backend quedan en dominios
// distintos, asi que ahi SI hace falta la URL completa del backend via
// VITE_API_URL (ver .env.example), definida como variable de entorno de
// build en el Static Site de Render.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Adjunta automaticamente el token JWT guardado (si existe) a cada
// peticion, para no tener que repetirlo en cada llamada.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('farmacia_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend responde 401 (token vencido o invalido), limpiamos la
// sesion y mandamos al usuario de vuelta al login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('farmacia_token');
      localStorage.removeItem('farmacia_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

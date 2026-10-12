import api from './api';

// El backend firma el JWT con un claim estandar "exp" (fecha de
// vencimiento, ver JwtUtil.java). Aqui NO se valida la firma -- eso lo
// sigue haciendo el backend en cada peticion -- solo se lee el claim
// "exp" del payload para saber si el token que quedo guardado en el
// navegador ya vencio, sin tener que esperar a que una peticion falle.
function decodificarPayload(token) {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('farmacia_token', data.token);
    localStorage.setItem('farmacia_usuario', JSON.stringify({
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      fotoUrl: data.fotoUrl,
    }));
    return data;
  },

  // "Iniciar sesion con Google". idToken es el "credential" que entrega
  // el boton de Google Identity Services (ver GoogleLoginButton.jsx). El
  // backend verifica ese token contra Google antes de confiar en el. Solo
  // entra si el email ya es de un empleado activo (ver AuthService.loginConGoogle).
  async loginGoogle(idToken) {
    const { data } = await api.post('/auth/google', { idToken });
    localStorage.setItem('farmacia_token', data.token);
    localStorage.setItem('farmacia_usuario', JSON.stringify({
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      fotoUrl: data.fotoUrl,
    }));
    return data;
  },

  logout() {
    localStorage.removeItem('farmacia_token');
    localStorage.removeItem('farmacia_usuario');
  },

  obtenerUsuarioActual() {
    const usuario = localStorage.getItem('farmacia_usuario');
    return usuario ? JSON.parse(usuario) : null;
  },

  // Antes solo revisaba si HABIA un token guardado, sin importar si ya
  // habia vencido -- eso dejaba entrar a las pantallas protegidas con
  // una sesion vieja hasta que la primera peticion al backend fallara
  // con 401. Ahora se rechaza de una vez si el token ya vencio (o esta
  // corrupto/no se puede leer), y se limpia esa sesion residual.
  estaAutenticado() {
    const token = localStorage.getItem('farmacia_token');
    if (!token) return false;

    const payload = decodificarPayload(token);
    if (!payload?.exp) {
      this.logout();
      return false;
    }

    const yaVencio = Date.now() >= payload.exp * 1000;
    if (yaVencio) {
      this.logout();
      return false;
    }

    return true;
  },
};

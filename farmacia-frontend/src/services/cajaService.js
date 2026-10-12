import api from './api';

export const cajaService = {
  async obtenerActual() {
    const { data, status } = await api.get('/caja/actual', {
      validateStatus: (s) => s === 200 || s === 204,
    });
    return status === 204 ? null : data;
  },

  async abrir(montoApertura) {
    const { data } = await api.post('/caja/abrir', { montoApertura });
    return data;
  },

  async registrarMovimiento(sesionId, movimiento) {
    const { data } = await api.post(`/caja/${sesionId}/movimientos`, movimiento);
    return data;
  },

  async cerrar(sesionId, cierre) {
    const { data } = await api.post(`/caja/${sesionId}/cerrar`, cierre);
    return data;
  },

  // Historial de todas las cajas (abiertas y cerradas, de cualquier
  // usuario) -- antes no quedaba registro visible de quien abrio/cerro
  // cada turno ni cuanto dio de diferencia.
  async listarHistorial() {
    const { data } = await api.get('/caja/historial');
    return data;
  },
};

import api from './api';

export const devolucionService = {
  async listar() {
    const { data } = await api.get('/devoluciones');
    return data;
  },

  async registrar(devolucion) {
    const { data } = await api.post('/devoluciones', devolucion);
    return data;
  },
};

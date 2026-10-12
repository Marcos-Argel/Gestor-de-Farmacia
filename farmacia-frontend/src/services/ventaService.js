import api from './api';

export const ventaService = {
  async listar() {
    const { data } = await api.get('/ventas');
    return data;
  },

  async crear(venta) {
    const { data } = await api.post('/ventas', venta);
    return data;
  },
};

import api from './api';

export const compraService = {
  async listar() {
    const { data } = await api.get('/compras');
    return data;
  },

  async crear(compra) {
    const { data } = await api.post('/compras', compra);
    return data;
  },
};

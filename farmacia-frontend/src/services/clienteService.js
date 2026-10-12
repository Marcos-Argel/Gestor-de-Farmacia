import api from './api';

export const clienteService = {
  async listar() {
    const { data } = await api.get('/clientes');
    return data;
  },

  async crear(cliente) {
    const { data } = await api.post('/clientes', cliente);
    return data;
  },

  async actualizar(id, cliente) {
    const { data } = await api.put(`/clientes/${id}`, cliente);
    return data;
  },

  async eliminar(id) {
    await api.delete(`/clientes/${id}`);
  },
};

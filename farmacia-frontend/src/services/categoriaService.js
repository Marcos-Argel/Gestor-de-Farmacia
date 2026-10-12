import api from './api';

export const categoriaService = {
  async listar() {
    const { data } = await api.get('/categorias');
    return data;
  },

  async crear(categoria) {
    const { data } = await api.post('/categorias', categoria);
    return data;
  },

  async actualizar(id, categoria) {
    const { data } = await api.put(`/categorias/${id}`, categoria);
    return data;
  },

  async eliminar(id) {
    await api.delete(`/categorias/${id}`);
  },
};

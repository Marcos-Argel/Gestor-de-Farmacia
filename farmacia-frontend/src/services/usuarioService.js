import api from './api';

export const usuarioService = {
  async listar() {
    const { data } = await api.get('/usuarios');
    return data;
  },

  async crear(usuario) {
    const { data } = await api.post('/usuarios', usuario);
    return data;
  },

  async actualizar(id, usuario) {
    const { data } = await api.put(`/usuarios/${id}`, usuario);
    return data;
  },

  async desactivar(id) {
    await api.delete(`/usuarios/${id}`);
  },
};

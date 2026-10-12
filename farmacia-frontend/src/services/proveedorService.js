import api from './api';

export const proveedorService = {
  async listar(buscar) {
    const { data } = await api.get('/proveedores', {
      params: buscar ? { buscar } : {},
    });
    return data;
  },

  async crear(proveedor) {
    const { data } = await api.post('/proveedores', proveedor);
    return data;
  },

  async actualizar(id, proveedor) {
    const { data } = await api.put(`/proveedores/${id}`, proveedor);
    return data;
  },

  async desactivar(id) {
    await api.delete(`/proveedores/${id}`);
  },
};

import api from './api';

export const configuracionService = {
  async listar() {
    const { data } = await api.get('/configuracion');
    return data;
  },

  // Nombre, NIT, direccion, telefono e IVA: lo que se imprime en la
  // factura. Lo puede leer cualquier empleado (el resto es solo ADMIN/GERENTE).
  async negocio() {
    const { data } = await api.get('/configuracion/negocio');
    return data;
  },

  async actualizar(clave, valor) {
    const { data } = await api.put(`/configuracion/${clave}`, { valor });
    return data;
  },
};

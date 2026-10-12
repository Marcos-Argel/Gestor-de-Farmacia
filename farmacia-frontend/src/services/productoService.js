import api from './api';

export const productoService = {
  async listar(nombre) {
    const { data } = await api.get('/productos', {
      params: nombre ? { nombre } : {},
    });
    return data;
  },

  async buscarPorId(id) {
    const { data } = await api.get(`/productos/${id}`);
    return data;
  },

  // Busqueda EXACTA por codigo de barras (para el escaner en Ventas).
  // encodeURIComponent porque algunos codigos traen guiones o letras.
  async buscarPorCodigoBarras(codigo) {
    const { data } = await api.get(`/productos/codigo-barras/${encodeURIComponent(codigo)}`);
    return data;
  },

  async crear(producto) {
    const { data } = await api.post('/productos', producto);
    return data;
  },

  async actualizar(id, producto) {
    const { data } = await api.put(`/productos/${id}`, producto);
    return data;
  },

  async desactivar(id) {
    await api.delete(`/productos/${id}`);
  },
};

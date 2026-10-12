import api from './api';

export const reporteService = {
  async stockBajo() {
    const { data } = await api.get('/reportes/stock-bajo');
    return data;
  },

  async proximosAVencer() {
    const { data } = await api.get('/reportes/proximos-a-vencer');
    return data;
  },

  // Lotes ya excluidos de la venta por vencimiento (ver
  // VencimientoScheduler.java en el backend) -- a diferencia de
  // proximosAVencer(), estos YA NO se pueden vender.
  async malEstado() {
    const { data } = await api.get('/reportes/mal-estado');
    return data;
  },
};

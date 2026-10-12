import api from './api';

export const auditoriaService = {
  async listar(pagina = 0, tamano = 20) {
    const { data } = await api.get('/auditoria', {
      params: { page: pagina, size: tamano },
    });
    return data; // Page<AuditoriaDTO> de Spring: { content, totalPages, number, ... }
  },
};

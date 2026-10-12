package com.farmacia.dto.reportes;

import com.farmacia.entity.enums.AccionAuditoria;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
@AllArgsConstructor
public class AuditoriaDTO {
    private Long id;
    private String usuarioNombre;
    private AccionAuditoria accion;
    private String tablaAfectada;
    private Long registroId;
    private String valoresAnteriores;
    private String valoresNuevos;
    private OffsetDateTime fecha;
}

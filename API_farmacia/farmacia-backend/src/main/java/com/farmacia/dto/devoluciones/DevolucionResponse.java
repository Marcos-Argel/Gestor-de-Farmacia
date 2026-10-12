package com.farmacia.dto.devoluciones;

import com.farmacia.entity.enums.TipoDevolucion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Builder
@AllArgsConstructor
public class DevolucionResponse {
    private Long id;
    private TipoDevolucion tipo;
    private Long ventaId;
    private Long compraId;
    private Long productoId;
    private String productoNombre;
    private Long loteId;
    private Integer cantidad;
    private String motivo;
    private BigDecimal montoReembolso;
    private String usuarioNombre;
    private OffsetDateTime fecha;
}

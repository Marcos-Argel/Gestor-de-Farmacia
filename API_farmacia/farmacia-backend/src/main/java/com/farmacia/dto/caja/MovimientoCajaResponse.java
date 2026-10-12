package com.farmacia.dto.caja;

import com.farmacia.entity.enums.TipoMovimientoCaja;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Builder
@AllArgsConstructor
public class MovimientoCajaResponse {
    private Long id;
    private TipoMovimientoCaja tipo;
    private BigDecimal monto;
    private String concepto;
    private Long ventaId;
    private OffsetDateTime fecha;
}

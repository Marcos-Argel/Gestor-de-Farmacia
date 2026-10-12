package com.farmacia.dto.caja;

import com.farmacia.entity.enums.TipoMovimientoCaja;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class MovimientoCajaRequest {
    @NotNull(message = "El tipo de movimiento es obligatorio")
    private TipoMovimientoCaja tipo; // usualmente INGRESO o EGRESO manual

    @NotNull @Positive(message = "El monto debe ser mayor a cero")
    private BigDecimal monto;

    private String concepto;
}

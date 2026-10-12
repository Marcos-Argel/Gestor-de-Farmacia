package com.farmacia.dto.caja;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class CerrarCajaRequest {
    @NotNull @PositiveOrZero(message = "El monto contado no puede ser negativo")
    private BigDecimal montoCierreReal;

    private String observaciones;
}

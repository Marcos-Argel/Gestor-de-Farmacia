package com.farmacia.dto.ventas;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DetalleVentaRequest {

    @NotNull(message = "El producto es obligatorio")
    private Long productoId;

    @NotNull @Positive(message = "La cantidad debe ser mayor a cero")
    private Integer cantidad;
}

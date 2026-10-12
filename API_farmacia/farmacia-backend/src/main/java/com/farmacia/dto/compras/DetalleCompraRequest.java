package com.farmacia.dto.compras;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class DetalleCompraRequest {

    @NotNull(message = "El producto es obligatorio")
    private Long productoId;

    @NotNull @Positive(message = "La cantidad debe ser mayor a cero")
    private Integer cantidad;

    @NotNull @PositiveOrZero(message = "El precio unitario no puede ser negativo")
    private BigDecimal precioUnitario;

    // Cada compra crea un lote nuevo -- por eso pedimos numero de lote
    // y vencimiento aqui mismo, no en una pantalla separada.
    @NotBlank(message = "El numero de lote es obligatorio")
    private String numeroLote;

    @NotNull(message = "La fecha de vencimiento es obligatoria")
    @Future(message = "La fecha de vencimiento debe ser futura")
    private LocalDate fechaVencimiento;
}

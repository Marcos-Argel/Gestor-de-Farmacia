package com.farmacia.dto.devoluciones;

import com.farmacia.entity.enums.TipoDevolucion;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class DevolucionRequest {

    @NotNull(message = "El tipo de devolucion es obligatorio")
    private TipoDevolucion tipo; // VENTA o COMPRA

    private Long ventaId;   // obligatorio si tipo = VENTA
    private Long compraId;  // obligatorio si tipo = COMPRA

    @NotNull(message = "El producto es obligatorio")
    private Long productoId;

    // El lote especifico del que salio (para devoluciones de venta) o
    // al que vuelve (para devoluciones de compra). Opcional: si no se
    // indica, se usa el lote mas reciente del producto.
    private Long loteId;

    @NotNull @Positive(message = "La cantidad debe ser mayor a cero")
    private Integer cantidad;

    @NotBlank(message = "El motivo es obligatorio")
    private String motivo;

    // Solo aplica a devoluciones de VENTA: si el producto vuelve en buen
    // estado se reingresa al inventario; si viene danado/abierto, NO debe
    // volver a venderse. Si no se envia, se asume que si vuelve.
    private Boolean reingresarStock;

    @PositiveOrZero(message = "El monto de reembolso no puede ser negativo")
    private BigDecimal montoReembolso;
}

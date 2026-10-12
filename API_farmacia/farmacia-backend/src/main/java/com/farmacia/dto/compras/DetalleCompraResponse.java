package com.farmacia.dto.compras;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
@AllArgsConstructor
public class DetalleCompraResponse {
    private Long productoId;
    private String productoNombre;
    private Long loteId;
    private String numeroLote;
    private Integer cantidad;
    private BigDecimal precioUnitario;
    private BigDecimal subtotal;
}

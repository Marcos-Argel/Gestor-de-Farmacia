package com.farmacia.dto.reportes;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ProductoStockBajoDTO {
    private Long productoId;
    private String productoNombre;
    private Integer stockActual;
    private Integer stockMinimo;
}

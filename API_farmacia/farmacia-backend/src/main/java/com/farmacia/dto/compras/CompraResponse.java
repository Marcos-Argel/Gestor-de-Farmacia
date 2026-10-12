package com.farmacia.dto.compras;

import com.farmacia.entity.enums.EstadoCompra;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class CompraResponse {
    private Long id;
    private Long proveedorId;
    private String proveedorEmpresa;
    private String usuarioNombre;
    private OffsetDateTime fecha;
    private String numeroFactura;
    private BigDecimal subtotal;
    private BigDecimal total;
    private EstadoCompra estado;
    private List<DetalleCompraResponse> detalles;
}

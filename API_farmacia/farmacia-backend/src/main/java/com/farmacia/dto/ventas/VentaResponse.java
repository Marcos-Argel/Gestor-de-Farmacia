package com.farmacia.dto.ventas;

import com.farmacia.entity.enums.EstadoVenta;
import com.farmacia.entity.enums.MetodoPago;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class VentaResponse {
    private Long id;
    private Long clienteId;
    private String clienteNombre;
    private String usuarioNombre;
    private OffsetDateTime fecha;
    private BigDecimal subtotal;
    private BigDecimal descuento;
    private BigDecimal impuesto;
    private BigDecimal total;
    private MetodoPago metodoPago;
    private EstadoVenta estado;
    private String numeroFormula;
    private String medicoNombre;
    private List<DetalleVentaResponse> detalles;
}

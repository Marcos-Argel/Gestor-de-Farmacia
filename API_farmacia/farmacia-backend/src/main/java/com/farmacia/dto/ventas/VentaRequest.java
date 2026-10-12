package com.farmacia.dto.ventas;

import com.farmacia.entity.enums.MetodoPago;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class VentaRequest {

    private Long clienteId; // opcional

    @NotNull(message = "El metodo de pago es obligatorio")
    private MetodoPago metodoPago;

    @PositiveOrZero(message = "El descuento no puede ser negativo")
    private BigDecimal descuento;

    // Obligatorios SOLO si algun producto de la venta requiere receta
    // (la validacion se hace en el servicio, no aqui, porque depende
    // de los productos incluidos).
    private String numeroFormula;
    private String medicoNombre;

    @NotEmpty(message = "La venta debe tener al menos un producto")
    @Valid
    private List<DetalleVentaRequest> detalles;
}

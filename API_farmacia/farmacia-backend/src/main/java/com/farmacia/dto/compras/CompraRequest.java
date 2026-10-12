package com.farmacia.dto.compras;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CompraRequest {

    @NotNull(message = "El proveedor es obligatorio")
    private Long proveedorId;

    private String numeroFactura;

    @NotEmpty(message = "La compra debe tener al menos un producto")
    @Valid
    private List<DetalleCompraRequest> detalles;
}

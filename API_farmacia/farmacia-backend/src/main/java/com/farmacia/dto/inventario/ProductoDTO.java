package com.farmacia.dto.inventario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ProductoDTO {
    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    private String descripcion;
    private Integer categoriaId;
    private String principioActivo;
    private String presentacion;
    private String unidadMedida;
    private String codigoBarras;

    @NotNull(message = "Debes indicar si requiere receta")
    private Boolean requiereReceta;

    // Opcional: si no se envia se toma como "no grava IVA".
    private Boolean gravaIva;

    private Long proveedorId;

    @NotNull @PositiveOrZero(message = "El precio de compra no puede ser negativo")
    private BigDecimal precioCompra;

    @NotNull @PositiveOrZero(message = "El precio de venta no puede ser negativo")
    private BigDecimal precioVenta;

    @PositiveOrZero
    private Integer stockMinimo;

    // Foto del producto en base64 (data URL). Opcional -- sin validaciones
    // de formato aca, el frontend ya se encarga de comprimir/redimensionar
    // antes de mandarla.
    private String imagenBase64;

    // Calculado, no editable directamente: suma de cantidad_actual de sus lotes.
    private Integer stockActual;
}

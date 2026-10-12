package com.farmacia.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "productos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nombre;

    @Column(length = 500)
    private String descripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @Column(name = "principio_activo", length = 200)
    private String principioActivo;

    @Column(length = 100)
    private String presentacion;

    @Column(name = "unidad_medida", length = 50)
    private String unidadMedida;

    @Column(name = "codigo_barras", unique = true, length = 100)
    private String codigoBarras;

    @Column(name = "requiere_receta", nullable = false)
    @Builder.Default
    private Boolean requiereReceta = false;

    // La mayoria de medicamentos estan excluidos de IVA en Colombia; otros
    // productos (cosmeticos, aseo...) si lo llevan. El precio de venta YA
    // incluye el IVA: la factura solo lo desglosa (ver VentaService).
    @Column(name = "grava_iva", nullable = false)
    @Builder.Default
    private Boolean gravaIva = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id")
    private Proveedor proveedor;

    @Column(name = "precio_compra", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal precioCompra = BigDecimal.ZERO;

    @Column(name = "precio_venta", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal precioVenta = BigDecimal.ZERO;

    @Column(name = "stock_minimo", nullable = false)
    @Builder.Default
    private Integer stockMinimo = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    // Foto del producto en base64 (data URL, ej. "data:image/jpeg;base64,...").
    // Llega ya comprimida/redimensionada desde el frontend, por eso TEXT
    // alcanza sin problema; no se usa almacenamiento de archivos aparte.
    @Column(name = "imagen_base64", columnDefinition = "TEXT")
    private String imagenBase64;

    @CreationTimestamp
    @Column(name = "creado_en", nullable = false, updatable = false)
    private OffsetDateTime creadoEn;

    @UpdateTimestamp
    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn;
}

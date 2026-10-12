package com.farmacia.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "lotes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Column(name = "numero_lote", nullable = false, length = 100)
    private String numeroLote;

    // Campo clave para la logica FEFO: se ordena ASC al buscar
    // stock disponible (el que vence primero, sale primero).
    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    @Column(name = "cantidad_inicial", nullable = false)
    private Integer cantidadInicial;

    @Column(name = "cantidad_actual", nullable = false)
    private Integer cantidadActual;

    @Column(name = "precio_compra_unit", nullable = false, precision = 12, scale = 2)
    private BigDecimal precioCompraUnit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id")
    private Proveedor proveedor;

    @CreationTimestamp
    @Column(name = "fecha_ingreso", nullable = false, updatable = false)
    private OffsetDateTime fechaIngreso;

    // true = el lote quedo excluido de la venta (ver
    // LoteRepository.buscarLotesDisponiblesFEFO). Lo marca en true
    // automaticamente VencimientoScheduler cuando ya vencio o le quedan
    // pocos dias (ver configuracion "dias_alerta_mal_estado"), o el staff
    // manualmente. No se borra el lote ni se pierde el stock -- solo deja
    // de ofrecerse para vender, hasta que alguien lo de de baja o lo
    // reactive desde Reportes > Productos en mal estado.
    @Column(name = "en_mal_estado", nullable = false)
    @Builder.Default
    private Boolean enMalEstado = false;
}

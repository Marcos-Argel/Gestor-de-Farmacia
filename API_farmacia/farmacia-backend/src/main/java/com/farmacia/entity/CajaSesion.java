package com.farmacia.entity;

import com.farmacia.entity.enums.EstadoCaja;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "caja_sesiones")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CajaSesion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @CreationTimestamp
    @Column(name = "fecha_apertura", nullable = false, updatable = false)
    private OffsetDateTime fechaApertura;

    @Column(name = "monto_apertura", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal montoApertura = BigDecimal.ZERO;

    @Column(name = "fecha_cierre")
    private OffsetDateTime fechaCierre;

    @Column(name = "monto_cierre_esperado", precision = 12, scale = 2)
    private BigDecimal montoCierreEsperado;

    @Column(name = "monto_cierre_real", precision = 12, scale = 2)
    private BigDecimal montoCierreReal;

    @Column(precision = 12, scale = 2)
    private BigDecimal diferencia;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false)
    @Builder.Default
    private EstadoCaja estado = EstadoCaja.ABIERTA;

    @Column(length = 500)
    private String observaciones;
}

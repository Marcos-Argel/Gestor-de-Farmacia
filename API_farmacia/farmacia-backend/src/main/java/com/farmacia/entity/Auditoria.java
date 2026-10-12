package com.farmacia.entity;

import com.farmacia.entity.enums.AccionAuditoria;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "auditoria")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nullable: si el backend no establece la variable de sesion
    // app.current_user_id, el trigger de PostgreSQL lo deja en NULL.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false)
    private AccionAuditoria accion;

    @Column(name = "tabla_afectada", nullable = false, length = 100)
    private String tablaAfectada;

    @Column(name = "registro_id", nullable = false)
    private Long registroId;

    // Mapeados como texto JSON crudo -- esta entidad es de solo lectura
    // en la practica (la llena el trigger de PostgreSQL, no el backend),
    // asi que no necesitamos deserializar a un objeto Java tipado.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "valores_anteriores", columnDefinition = "jsonb")
    private String valoresAnteriores;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "valores_nuevos", columnDefinition = "jsonb")
    private String valoresNuevos;

    @CreationTimestamp
    @Column(name = "fecha", nullable = false, updatable = false)
    private OffsetDateTime fecha;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;
}

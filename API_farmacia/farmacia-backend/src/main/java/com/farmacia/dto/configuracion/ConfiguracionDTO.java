package com.farmacia.dto.configuracion;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfiguracionDTO {
    private Integer id;
    private String clave;
    private String valor;
    private String descripcion;
    private OffsetDateTime actualizadoEn;
}

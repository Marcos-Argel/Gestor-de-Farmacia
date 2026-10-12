package com.farmacia.dto.configuracion;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ActualizarConfiguracionRequest {

    @NotBlank(message = "El valor es obligatorio")
    private String valor;
}

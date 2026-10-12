package com.farmacia.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GoogleLoginRequest {

    // El "credential" (ID token JWT) que devuelve el boton de Google
    // Identity Services en el frontend. El backend lo verifica contra
    // Google (firma, audiencia, vigencia) en AuthService.loginConGoogle
    // -- nunca se confia en el contenido sin verificar.
    @NotBlank(message = "El token de Google es obligatorio")
    private String idToken;
}

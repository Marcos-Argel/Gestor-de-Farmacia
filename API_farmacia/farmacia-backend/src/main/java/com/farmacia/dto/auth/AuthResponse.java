package com.farmacia.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String email;
    private String nombre;
    private String rol;
    // Foto de perfil (viene de Google si la cuenta es proveedor GOOGLE;
    // null para cuentas locales). El frontend la usa como avatar.
    private String fotoUrl;
}

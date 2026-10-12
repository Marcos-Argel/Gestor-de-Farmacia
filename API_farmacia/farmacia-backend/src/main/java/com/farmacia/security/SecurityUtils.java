package com.farmacia.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

// Utilidad para obtener el usuario autenticado actual desde cualquier
// servicio, sin tener que inyectar el SecurityContext en cada uno.
public class SecurityUtils {

    private SecurityUtils() {}

    public static Long obtenerUsuarioActualId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails userDetails)) {
            return null;
        }
        return userDetails.getId();
    }

    // Se necesita, por ejemplo, para la regla de negocio "un GERENTE puede
    // crear/editar usuarios pero NO puede asignar el rol ADMIN ni GERENTE
    // (eso solo lo puede hacer un ADMIN)".
    public static String obtenerRolActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails userDetails)) {
            return null;
        }
        return userDetails.getUsuario().getRol().getNombre();
    }
}
package com.farmacia;

import com.farmacia.entity.Rol;
import com.farmacia.entity.Usuario;
import com.farmacia.security.CustomUserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

// Utilidades compartidas por las pruebas: crear usuarios y simular quien
// esta autenticado (SecurityUtils lee el SecurityContext).
public final class TestSeguridad {

    private TestSeguridad() {}

    public static Usuario usuario(long id, String rol) {
        return Usuario.builder()
                .id(id)
                .nombre("Usuario " + id)
                .email("u" + id + "@test.com")
                .passwordHash("x")
                .rol(Rol.builder().id((int) id).nombre(rol).build())
                .activo(true)
                .build();
    }

    public static void autenticarComo(Usuario usuario) {
        CustomUserDetails detalles = new CustomUserDetails(usuario);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(detalles, null, detalles.getAuthorities()));
    }

    public static void limpiar() {
        SecurityContextHolder.clearContext();
    }
}

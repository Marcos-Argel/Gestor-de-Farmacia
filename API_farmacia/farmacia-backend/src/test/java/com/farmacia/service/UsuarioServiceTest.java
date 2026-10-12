package com.farmacia.service;

import com.farmacia.TestSeguridad;
import com.farmacia.dto.usuarios.UsuarioDTO;
import com.farmacia.entity.Rol;
import com.farmacia.entity.Usuario;
import com.farmacia.exception.ValidacionNegocioException;
import com.farmacia.repository.RolRepository;
import com.farmacia.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UsuarioServiceTest {

    @Mock UsuarioRepository usuarioRepository;
    @Mock RolRepository rolRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuditoriaSessionService auditoriaSessionService;

    @InjectMocks UsuarioService usuarioService;

    private final Usuario admin = TestSeguridad.usuario(1, "ADMIN");
    private final Usuario gerente = TestSeguridad.usuario(2, "GERENTE");
    private final Usuario vendedor = TestSeguridad.usuario(3, "VENDEDOR");

    @BeforeEach
    void preparar() {
        for (Usuario u : new Usuario[]{admin, gerente, vendedor}) {
            when(usuarioRepository.findById(u.getId())).thenReturn(Optional.of(u));
        }
        for (String rol : new String[]{"ADMIN", "GERENTE", "VENDEDOR", "CLIENTE"}) {
            when(rolRepository.findByNombre(rol)).thenReturn(Optional.of(Rol.builder().nombre(rol).build()));
        }
        when(usuarioRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
    }

    @AfterEach
    void limpiar() {
        TestSeguridad.limpiar();
    }

    private UsuarioDTO dto(Usuario u, String rol) {
        UsuarioDTO d = new UsuarioDTO();
        d.setNombre(u.getNombre());
        d.setEmail(u.getEmail());
        d.setRolNombre(rol);
        return d;
    }

    @Test
    void gerenteNoPuedeEditarAlAdmin() {
        TestSeguridad.autenticarComo(gerente);
        UsuarioDTO cambio = dto(admin, "ADMIN");
        cambio.setPassword("nueva123");
        assertThatThrownBy(() -> usuarioService.actualizar(1L, cambio))
                .isInstanceOf(ValidacionNegocioException.class);
    }

    @Test
    void gerentePuedeEditarSuPropioPerfil() {
        TestSeguridad.autenticarComo(gerente);
        UsuarioDTO cambio = dto(gerente, "GERENTE");
        cambio.setNombre("Gerente Nuevo");
        assertThat(usuarioService.actualizar(2L, cambio).getNombre()).isEqualTo("Gerente Nuevo");
    }

    @Test
    void gerenteNoPuedeAscenderAAdmin() {
        TestSeguridad.autenticarComo(gerente);
        assertThatThrownBy(() -> usuarioService.actualizar(3L, dto(vendedor, "ADMIN")))
                .isInstanceOf(ValidacionNegocioException.class);
    }

    @Test
    void nadieSeDesactivaASiMismo() {
        TestSeguridad.autenticarComo(admin);
        assertThatThrownBy(() -> usuarioService.desactivar(1L))
                .isInstanceOf(ValidacionNegocioException.class);
    }

    @Test
    void noSePuedeAsignarElRolCliente() {
        TestSeguridad.autenticarComo(admin);
        assertThatThrownBy(() -> usuarioService.actualizar(3L, dto(vendedor, "CLIENTE")))
                .isInstanceOf(ValidacionNegocioException.class);
    }
}

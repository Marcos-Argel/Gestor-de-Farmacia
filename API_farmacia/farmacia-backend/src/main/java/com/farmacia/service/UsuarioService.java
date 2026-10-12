package com.farmacia.service;

import com.farmacia.dto.usuarios.UsuarioDTO;
import com.farmacia.entity.Rol;
import com.farmacia.entity.Usuario;
import com.farmacia.exception.RecursoNoEncontradoException;
import com.farmacia.exception.RegistroDuplicadoException;
import com.farmacia.exception.ValidacionNegocioException;
import com.farmacia.repository.RolRepository;
import com.farmacia.repository.UsuarioRepository;
import com.farmacia.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaSessionService auditoriaSessionService;

    public List<UsuarioDTO> listarTodos() {
        return usuarioRepository.findAll().stream().map(this::aDTO).toList();
    }

    public UsuarioDTO buscarPorId(Long id) {
        return aDTO(obtenerEntidad(id));
    }

    @Transactional
    public UsuarioDTO crear(UsuarioDTO dto) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());

        if (usuarioRepository.existsByEmail(dto.getEmail())) {
            throw new RegistroDuplicadoException("Ya existe un usuario con ese email");
        }
        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            throw new ValidacionNegocioException("La contraseña es obligatoria para crear un usuario");
        }
        validarPermisoParaAsignarRol(dto.getRolNombre());
        Rol rol = rolRepository.findByNombre(dto.getRolNombre())
                .orElseThrow(() -> new RecursoNoEncontradoException("Rol no valido: " + dto.getRolNombre()));

        Usuario usuario = Usuario.builder()
                .nombre(dto.getNombre())
                .email(dto.getEmail())
                .passwordHash(passwordEncoder.encode(dto.getPassword()))
                .rol(rol)
                .activo(true)
                .build();

        return aDTO(usuarioRepository.save(usuario));
    }

    @Transactional
    public UsuarioDTO actualizar(Long id, UsuarioDTO dto) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());

        Usuario usuario = obtenerEntidad(id);
        validarPermisoSobreUsuario(usuario);
        // Antes esto no se validaba y si el email ya le pertenecia a otro
        // usuario, la restriccion UNIQUE de la base de datos rechazaba el
        // UPDATE con una excepcion generica -> el usuario solo veia
        // "Error interno del servidor" sin saber por que.
        if (usuarioRepository.existsByEmailAndIdNot(dto.getEmail(), id)) {
            throw new RegistroDuplicadoException("Ya existe otro usuario con ese email");
        }
        // Si el rol no cambia no hace falta validarlo -- sin esto un GERENTE
        // no podia ni editar su propio nombre (se le "reasignaba" GERENTE).
        if (!dto.getRolNombre().equalsIgnoreCase(usuario.getRol().getNombre())) {
            validarPermisoParaAsignarRol(dto.getRolNombre());
        }
        Rol rol = rolRepository.findByNombre(dto.getRolNombre())
                .orElseThrow(() -> new RecursoNoEncontradoException("Rol no valido: " + dto.getRolNombre()));

        usuario.setNombre(dto.getNombre());
        usuario.setEmail(dto.getEmail());
        usuario.setRol(rol);
        if (dto.getActivo() != null) {
            if (!dto.getActivo()) validarNoEsUnoMismo(usuario);
            usuario.setActivo(dto.getActivo());
        }

        // Solo se cambia la contrasena si se envia una nueva.
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            usuario.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        }

        return aDTO(usuarioRepository.save(usuario));
    }

    // Regla de negocio: un GERENTE tiene casi los mismos permisos que un
    // ADMIN (incluida la gestion de usuarios), PERO no puede crear ni
    // asignar el rol ADMIN ni el rol GERENTE -- eso solo lo puede hacer
    // alguien que YA es ADMIN. Si el usuario autenticado no es ADMIN,
    // rechazamos cualquier intento de asignar esos dos roles.
    private void validarPermisoParaAsignarRol(String rolNombreSolicitado) {
        // El sistema es solo para el personal: el portal de clientes se quito.
        if ("CLIENTE".equalsIgnoreCase(rolNombreSolicitado)) {
            throw new ValidacionNegocioException("El rol CLIENTE ya no se usa: el sistema es solo para el personal.");
        }
        boolean esRolSensible = "ADMIN".equalsIgnoreCase(rolNombreSolicitado)
                || "GERENTE".equalsIgnoreCase(rolNombreSolicitado);
        if (!esRolSensible) return;

        String rolActual = SecurityUtils.obtenerRolActual();
        if (!"ADMIN".equalsIgnoreCase(rolActual)) {
            throw new ValidacionNegocioException(
                    "Solo un ADMIN puede crear o asignar el rol ADMIN o GERENTE.");
        }
    }

    // Antes solo se validaba el rol que se ASIGNA, no el rol que ya TIENE
    // el usuario editado: un GERENTE podia editar a un ADMIN (cambiarle la
    // contrasena o el email) y luego iniciar sesion como el. Ahora un
    // GERENTE solo puede tocar cuentas de roles inferiores.
    private void validarPermisoSobreUsuario(Usuario objetivo) {
        String rolObjetivo = objetivo.getRol().getNombre();
        boolean objetivoSensible = "ADMIN".equalsIgnoreCase(rolObjetivo) || "GERENTE".equalsIgnoreCase(rolObjetivo);
        boolean esUnoMismo = objetivo.getId().equals(SecurityUtils.obtenerUsuarioActualId());
        if (objetivoSensible && !esUnoMismo && !"ADMIN".equalsIgnoreCase(SecurityUtils.obtenerRolActual())) {
            throw new ValidacionNegocioException("Solo un ADMIN puede modificar cuentas ADMIN o GERENTE.");
        }
    }

    // Evita que alguien se desactive a si mismo por error y quede fuera
    // del sistema (si era el unico ADMIN, nadie podria reactivarlo).
    private void validarNoEsUnoMismo(Usuario objetivo) {
        if (objetivo.getId().equals(SecurityUtils.obtenerUsuarioActualId())) {
            throw new ValidacionNegocioException("No puedes desactivar tu propia cuenta.");
        }
    }

    @Transactional
    public void desactivar(Long id) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());
        Usuario usuario = obtenerEntidad(id);
        validarPermisoSobreUsuario(usuario);
        validarNoEsUnoMismo(usuario);
        usuario.setActivo(false);
        usuarioRepository.save(usuario);
    }

    private Usuario obtenerEntidad(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado: " + id));
    }

    private UsuarioDTO aDTO(Usuario u) {
        UsuarioDTO dto = new UsuarioDTO();
        dto.setId(u.getId());
        dto.setNombre(u.getNombre());
        dto.setEmail(u.getEmail());
        dto.setRolNombre(u.getRol().getNombre());
        dto.setActivo(u.getActivo());
        // password nunca se devuelve
        return dto;
    }
}
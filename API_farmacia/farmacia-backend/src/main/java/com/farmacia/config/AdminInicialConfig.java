package com.farmacia.config;

import com.farmacia.entity.Usuario;
import com.farmacia.repository.RolRepository;
import com.farmacia.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

// En una base de datos nueva (Docker, Render) no existe ningun usuario, y
// no hay registro publico (el sistema es solo para el personal) -- no habia forma de
// entrar al panel sin insertar un ADMIN a mano en la BD. Si se definen
// ADMIN_EMAIL y ADMIN_PASSWORD y todavia no hay ningun ADMIN, se crea uno
// al arrancar. Si ya existe alguno, no hace nada.
@Component
@RequiredArgsConstructor
public class AdminInicialConfig implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminInicialConfig.class);

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminEmail.isBlank() || adminPassword.isBlank()) return;
        if (usuarioRepository.existsByRolNombre("ADMIN")) return;

        if (adminPassword.length() < 8) {
            log.warn("ADMIN_PASSWORD debe tener al menos 8 caracteres; no se creo el ADMIN inicial.");
            return;
        }

        rolRepository.findByNombre("ADMIN").ifPresent(rol -> {
            usuarioRepository.save(Usuario.builder()
                    .nombre("Administrador")
                    .email(adminEmail.trim().toLowerCase())
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .rol(rol)
                    .activo(true)
                    .build());
            log.info("Se creo el usuario ADMIN inicial: {}", adminEmail);
        });
    }
}

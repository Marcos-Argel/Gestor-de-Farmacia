package com.farmacia.repository;

import com.farmacia.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // JOIN FETCH trae el Rol en la misma consulta, ya cargado -- evita
    // LazyInitializationException cuando se lee fuera de una sesion de
    // Hibernate abierta (como dentro del JwtAuthenticationFilter, que se
    // ejecuta antes de que Spring abra la sesion para la peticion).
    @Query("SELECT u FROM Usuario u JOIN FETCH u.rol WHERE u.email = :email")
    Optional<Usuario> findByEmail(@Param("email") String email);

    boolean existsByEmail(String email);

    // Usado por AdminInicialConfig: saber si ya hay algun ADMIN creado.
    boolean existsByRolNombre(String nombreRol);

    // Para validar email duplicado AL EDITAR: se excluye el propio usuario
    // (si no, "guardar sin cambiar el email" siempre fallaria).
    boolean existsByEmailAndIdNot(String email, Long id);
}
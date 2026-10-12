package com.farmacia.dto.usuarios;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UsuarioDTO {
    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    @Pattern(
            regexp = "^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' ]{2,99}$",
            message = "El nombre debe contener solo letras y tener al menos 3 caracteres"
    )
    private String nombre;

    @NotBlank @Email(message = "El email no tiene un formato valido")
    private String email;

    @NotBlank(message = "El rol es obligatorio")
    private String rolNombre;

    private Boolean activo;

    // Solo se usa al crear un usuario nuevo desde el panel de admin, o para
    // cambiarla en edicion; nunca se devuelve en las respuestas. No lleva
    // @NotBlank porque en edicion se deja en blanco (null) para no
    // cambiarla -- pero si se envia un valor, debe cumplir el minimo.
    // La validacion de "obligatoria al CREAR" se hace en UsuarioService,
    // porque aqui no se puede distinguir creacion de edicion.
    @Size(min = 6, max = 100, message = "La contraseña debe tener al menos 6 caracteres")
    private String password;
}
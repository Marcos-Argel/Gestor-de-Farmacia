package com.farmacia.dto.inventario;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ClienteDTO {
    private Long id;

    @NotBlank(message = "El nombre es obligatorio")
    // Solo letras (con tildes/ñ) y espacios, minimo 3 caracteres. Evita que
    // se cree un cliente con nombre "1" o cualquier valor puramente numerico.
    @Pattern(
            regexp = "^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' ]{2,99}$",
            message = "El nombre debe contener solo letras y tener al menos 3 caracteres"
    )
    private String nombre;

    private String tipoDocumento;

    // Opcional, pero si se envia debe ser solo digitos (6 a 10, rango tipico
    // de cedula/TI en Colombia). Antes no tenia limite y aceptaba mas de 10.
    @Pattern(regexp = "^[0-9]{6,10}$", message = "El número de documento debe tener entre 6 y 10 dígitos")
    private String numeroDocumento;

    // Opcional, pero si se envia debe ser solo digitos (7 a 10, cubre fijo y
    // celular en Colombia). Antes no tenia limite de longitud.
    @Pattern(regexp = "^[0-9]{7,10}$", message = "El teléfono debe tener entre 7 y 10 dígitos")
    private String telefono;

    @Email(message = "El email no tiene un formato válido")
    private String email;

    private String direccion;
}
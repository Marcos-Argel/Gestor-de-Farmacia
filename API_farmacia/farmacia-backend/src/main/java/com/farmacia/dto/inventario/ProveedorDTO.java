package com.farmacia.dto.inventario;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProveedorDTO {
    private Long id;

    @NotBlank(message = "El nombre de contacto es obligatorio")
    @Pattern(
            regexp = "^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' ]{2,99}$",
            message = "El nombre de contacto debe contener solo letras y tener al menos 3 caracteres"
    )
    private String nombreContacto;

    @NotBlank(message = "La empresa es obligatoria")
    // Minimo 2 caracteres y al menos una letra (para no aceptar "1", pero
    // sigue permitiendo nombres como "3M" o "Laboratorios 7").
    @Pattern(
            regexp = "^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ]).{2,150}$",
            message = "La empresa debe tener al menos 2 caracteres e incluir al menos una letra"
    )
    private String empresa;

    // Antes era opcional; ahora se exige porque es el dato principal de
    // contacto con el proveedor.
    @NotBlank(message = "El teléfono es obligatorio")
    @Pattern(regexp = "^[0-9]{7,10}$", message = "El teléfono debe tener entre 7 y 10 dígitos")
    private String telefono;

    // Antes se dejaba crear un proveedor sin email; ahora es obligatorio.
    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El email no tiene un formato válido")
    private String email;

    private String direccion;
    private Boolean activo;
}
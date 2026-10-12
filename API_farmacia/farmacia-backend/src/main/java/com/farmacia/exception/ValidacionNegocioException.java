package com.farmacia.exception;

// Se usa para validaciones de reglas de negocio que dependen de mas de un
// campo o de datos externos (ej. "el numero de formula solo es obligatorio
// SI algun producto de la venta requiere receta"), y que por eso no se
// pueden expresar con anotaciones simples (@NotBlank, @Pattern) en el DTO.
// Se mapea a 400 Bad Request en el GlobalExceptionHandler.
public class ValidacionNegocioException extends RuntimeException {
    public ValidacionNegocioException(String mensaje) {
        super(mensaje);
    }
}
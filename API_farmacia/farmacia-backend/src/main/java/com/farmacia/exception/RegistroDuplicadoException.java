package com.farmacia.exception;

// Ej: email ya registrado, codigo de barras repetido, etc.
public class RegistroDuplicadoException extends RuntimeException {
    public RegistroDuplicadoException(String mensaje) {
        super(mensaje);
    }
}

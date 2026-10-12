package com.farmacia.exception;

// Se lanza ANTES de intentar el UPDATE en la base de datos, para dar un
// mensaje de negocio claro en vez de depender solo del CHECK constraint.
public class StockInsuficienteException extends RuntimeException {
    public StockInsuficienteException(String mensaje) {
        super(mensaje);
    }
}

package com.farmacia.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ErrorResponse> handleNoEncontrado(RecursoNoEncontradoException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }

    @ExceptionHandler(StockInsuficienteException.class)
    public ResponseEntity<ErrorResponse> handleStockInsuficiente(StockInsuficienteException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ErrorResponse> handleCredenciales(CredencialesInvalidasException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.UNAUTHORIZED, ex.getMessage(), req);
    }

    @ExceptionHandler(RegistroDuplicadoException.class)
    public ResponseEntity<ErrorResponse> handleDuplicado(RegistroDuplicadoException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    @ExceptionHandler(ValidacionNegocioException.class)
    public ResponseEntity<ErrorResponse> handleValidacionNegocio(ValidacionNegocioException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidacion(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errores.put(error.getField(), error.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(errores);
    }

    // JSON mal formado o un valor de enum que no existe (ej. metodoPago "BITCOIN").
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleJsonInvalido(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.BAD_REQUEST, "El cuerpo de la peticion no es valido", req);
    }

    // Ej. /api/ventas/abc cuando se espera un numero.
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTipoParametro(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.BAD_REQUEST, "Parametro invalido: " + ex.getName(), req);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleParametroFaltante(MissingServletRequestParameterException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.BAD_REQUEST, "Falta el parametro: " + ex.getParameterName(), req);
    }

    // Restricciones UNIQUE/FK de la base de datos que el servicio no valido
    // antes (ej. codigo de barras o documento repetido) -- antes era un 500.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleIntegridad(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Violacion de integridad en {} {}: {}", req.getMethod(), req.getRequestURI(),
                ex.getMostSpecificCause().getMessage());
        return construirRespuesta(HttpStatus.CONFLICT,
                "La operacion choca con un dato existente (registro duplicado o en uso)", req);
    }

    // Ruta que no existe: antes caia en el handler generico como 500.
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleRutaInexistente(NoResourceFoundException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.NOT_FOUND, "La ruta solicitada no existe", req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccesoDenegado(AccessDeniedException ex, HttpServletRequest req) {
        return construirRespuesta(HttpStatus.FORBIDDEN, "No tienes permiso para esta accion", req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenerico(Exception ex, HttpServletRequest req) {
        // Sin este log, un 500 no deja ningun rastro en la consola del
        // backend -- toca "adivinar" la causa real. Con esto, cualquier
        // error no manejado explicitamente queda registrado con su stack
        // trace completo.
        log.error("Error no controlado en {} {}", req.getMethod(), req.getRequestURI(), ex);
        return construirRespuesta(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor", req);
    }

    private ResponseEntity<ErrorResponse> construirRespuesta(HttpStatus status, String mensaje, HttpServletRequest req) {
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(OffsetDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .mensaje(mensaje)
                .path(req.getRequestURI())
                .build();
        return ResponseEntity.status(status).body(error);
    }
}
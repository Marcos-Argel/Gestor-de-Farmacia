package com.farmacia.controller;

import com.farmacia.dto.caja.*;
import com.farmacia.service.CajaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/caja")
@RequiredArgsConstructor
public class CajaController {

    private final CajaService cajaService;

    @PostMapping("/abrir")
    public ResponseEntity<CajaSesionResponse> abrir(@Valid @RequestBody AbrirCajaRequest request) {
        return ResponseEntity.ok(cajaService.abrirCaja(request));
    }

    @PostMapping("/{sesionId}/movimientos")
    public CajaSesionResponse registrarMovimiento(@PathVariable Long sesionId,
                                                    @Valid @RequestBody MovimientoCajaRequest request) {
        return cajaService.registrarMovimiento(sesionId, request);
    }

    @PostMapping("/{sesionId}/cerrar")
    public CajaSesionResponse cerrar(@PathVariable Long sesionId,
                                       @Valid @RequestBody CerrarCajaRequest request) {
        return cajaService.cerrarCaja(sesionId, request);
    }

    @GetMapping("/{sesionId}")
    public CajaSesionResponse buscar(@PathVariable Long sesionId) {
        return cajaService.buscarPorId(sesionId);
    }

    // Historial de todas las cajas (abiertas y cerradas) para que quede
    // registro de quien abrio/cerro cada turno y cuanto dio -- antes esa
    // informacion se "perdia" de la vista apenas se cerraba la caja.
    @GetMapping("/historial")
    public java.util.List<CajaSesionResponse> historial() {
        return cajaService.listarHistorial();
    }

    // Le permite al frontend saber, al entrar a la pantalla de Caja, si el
    // usuario ya tiene una sesion abierta -- sin esto no habria forma de
    // averiguarlo sin conocer de antemano el ID de la sesion.
    // 204 (sin cuerpo) si no hay ninguna abierta.
    @GetMapping("/actual")
    public ResponseEntity<CajaSesionResponse> sesionActual() {
        CajaSesionResponse sesion = cajaService.buscarSesionAbiertaDelUsuarioActual();
        return sesion != null ? ResponseEntity.ok(sesion) : ResponseEntity.noContent().build();
    }
}

package com.farmacia.controller;

import com.farmacia.dto.devoluciones.DevolucionRequest;
import com.farmacia.dto.devoluciones.DevolucionResponse;
import com.farmacia.service.DevolucionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/devoluciones")
@RequiredArgsConstructor
public class DevolucionController {

    private final DevolucionService devolucionService;

    @GetMapping
    public List<DevolucionResponse> listar() { return devolucionService.listarTodas(); }

    @PostMapping
    public ResponseEntity<DevolucionResponse> registrar(@Valid @RequestBody DevolucionRequest request) {
        return ResponseEntity.ok(devolucionService.registrarDevolucion(request));
    }
}

package com.farmacia.controller;

import com.farmacia.dto.ventas.VentaRequest;
import com.farmacia.dto.ventas.VentaResponse;
import com.farmacia.service.VentaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ventas")
@RequiredArgsConstructor
public class VentaController {

    private final VentaService ventaService;

    @GetMapping
    public List<VentaResponse> listar() {
        return ventaService.listarTodas();
    }

    @GetMapping("/{id}")
    public VentaResponse buscar(@PathVariable Long id) {
        return ventaService.buscarPorId(id);
    }

    @PostMapping
    public ResponseEntity<VentaResponse> registrar(@Valid @RequestBody VentaRequest request) {
        return ResponseEntity.ok(ventaService.registrarVenta(request));
    }
}

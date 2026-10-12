package com.farmacia.controller;

import com.farmacia.dto.compras.CompraRequest;
import com.farmacia.dto.compras.CompraResponse;
import com.farmacia.service.CompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/compras")
@RequiredArgsConstructor
public class CompraController {

    private final CompraService compraService;

    @GetMapping
    public List<CompraResponse> listar() { return compraService.listarTodas(); }

    @GetMapping("/{id}")
    public CompraResponse buscar(@PathVariable Long id) { return compraService.buscarPorId(id); }

    @PostMapping
    public ResponseEntity<CompraResponse> registrar(@Valid @RequestBody CompraRequest request) {
        return ResponseEntity.ok(compraService.registrarCompra(request));
    }
}

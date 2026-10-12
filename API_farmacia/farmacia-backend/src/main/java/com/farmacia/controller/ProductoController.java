package com.farmacia.controller;

import com.farmacia.dto.inventario.ProductoDTO;
import com.farmacia.service.ProductoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productos")
@RequiredArgsConstructor
public class ProductoController {

    private final ProductoService productoService;

    @GetMapping
    public List<ProductoDTO> listar(@RequestParam(required = false) String nombre) {
        return (nombre == null || nombre.isBlank())
                ? productoService.listarActivos()
                : productoService.buscarPorNombre(nombre);
    }

    @GetMapping("/{id}")
    public ProductoDTO buscar(@PathVariable Long id) { return productoService.buscarPorId(id); }

    // Ruta separada de "/{id}" (que espera un numero) para no chocar con
    // ella -- esta recibe el codigo de barras como texto. La usa el
    // escaner en Ventas para encontrar el producto exacto al vuelo.
    @GetMapping("/codigo-barras/{codigoBarras}")
    public ProductoDTO buscarPorCodigoBarras(@PathVariable String codigoBarras) {
        return productoService.buscarPorCodigoBarras(codigoBarras);
    }

    @PostMapping
    public ResponseEntity<ProductoDTO> crear(@Valid @RequestBody ProductoDTO dto) {
        return ResponseEntity.ok(productoService.crear(dto));
    }

    @PutMapping("/{id}")
    public ProductoDTO actualizar(@PathVariable Long id, @Valid @RequestBody ProductoDTO dto) {
        return productoService.actualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        productoService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}
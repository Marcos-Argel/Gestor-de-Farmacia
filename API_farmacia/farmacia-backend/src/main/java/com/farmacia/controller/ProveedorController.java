package com.farmacia.controller;

import com.farmacia.dto.inventario.ProveedorDTO;
import com.farmacia.service.ProveedorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/proveedores")
@RequiredArgsConstructor
public class ProveedorController {

    private final ProveedorService proveedorService;

    @GetMapping
    public List<ProveedorDTO> listar(@RequestParam(required = false) String buscar) {
        return (buscar == null || buscar.isBlank())
                ? proveedorService.listarActivos()
                : proveedorService.buscar(buscar);
    }

    @GetMapping("/{id}")
    public ProveedorDTO buscar(@PathVariable Long id) { return proveedorService.buscarPorId(id); }

    @PostMapping
    public ResponseEntity<ProveedorDTO> crear(@Valid @RequestBody ProveedorDTO dto) {
        return ResponseEntity.ok(proveedorService.crear(dto));
    }

    @PutMapping("/{id}")
    public ProveedorDTO actualizar(@PathVariable Long id, @Valid @RequestBody ProveedorDTO dto) {
        return proveedorService.actualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        proveedorService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}

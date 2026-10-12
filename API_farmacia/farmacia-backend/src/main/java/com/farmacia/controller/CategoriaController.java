package com.farmacia.controller;

import com.farmacia.dto.inventario.CategoriaDTO;
import com.farmacia.service.CategoriaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
public class CategoriaController {

    private final CategoriaService categoriaService;

    @GetMapping
    public List<CategoriaDTO> listar() { return categoriaService.listarTodas(); }

    @GetMapping("/{id}")
    public CategoriaDTO buscar(@PathVariable Integer id) { return categoriaService.buscarPorId(id); }

    @PostMapping
    public ResponseEntity<CategoriaDTO> crear(@Valid @RequestBody CategoriaDTO dto) {
        return ResponseEntity.ok(categoriaService.crear(dto));
    }

    @PutMapping("/{id}")
    public CategoriaDTO actualizar(@PathVariable Integer id, @Valid @RequestBody CategoriaDTO dto) {
        return categoriaService.actualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        categoriaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}

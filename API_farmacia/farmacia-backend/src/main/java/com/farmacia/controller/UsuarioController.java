package com.farmacia.controller;

import com.farmacia.dto.usuarios.UsuarioDTO;
import com.farmacia.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Todas las rutas de este controlador ya estan protegidas para el rol
// ADMIN a nivel global en SecurityConfig (.requestMatchers("/api/usuarios/**").hasRole("ADMIN")).
@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping
    public List<UsuarioDTO> listar() { return usuarioService.listarTodos(); }

    @GetMapping("/{id}")
    public UsuarioDTO buscar(@PathVariable Long id) { return usuarioService.buscarPorId(id); }

    @PostMapping
    public ResponseEntity<UsuarioDTO> crear(@Valid @RequestBody UsuarioDTO dto) {
        return ResponseEntity.ok(usuarioService.crear(dto));
    }

    @PutMapping("/{id}")
    public UsuarioDTO actualizar(@PathVariable Long id, @Valid @RequestBody UsuarioDTO dto) {
        return usuarioService.actualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        usuarioService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}

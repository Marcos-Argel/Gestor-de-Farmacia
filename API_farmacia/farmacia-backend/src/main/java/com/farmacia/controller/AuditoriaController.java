package com.farmacia.controller;

import com.farmacia.dto.reportes.AuditoriaDTO;
import com.farmacia.service.AuditoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Acceso restringido a ADMIN a nivel global en SecurityConfig
// (.requestMatchers("/api/auditoria/**").hasRole("ADMIN")).
//
// GET /api/auditoria?page=0&size=20  -> los cambios mas recientes primero.
@RestController
@RequestMapping("/api/auditoria")
@RequiredArgsConstructor
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    @GetMapping
    public Page<AuditoriaDTO> listar(@PageableDefault(size = 20) Pageable pageable) {
        return auditoriaService.listar(pageable);
    }
}

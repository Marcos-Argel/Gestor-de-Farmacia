package com.farmacia.controller;

import com.farmacia.dto.configuracion.ActualizarConfiguracionRequest;
import com.farmacia.dto.configuracion.ConfiguracionDTO;
import com.farmacia.service.ConfiguracionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Acceso restringido a ADMIN/GERENTE en SecurityConfig, salvo GET /negocio
// (datos de la factura), que puede leer cualquier empleado.
@RestController
@RequestMapping("/api/configuracion")
@RequiredArgsConstructor
public class ConfiguracionController {

    private final ConfiguracionService configuracionService;

    @GetMapping("/negocio")
    public Map<String, String> negocio() {
        return configuracionService.datosNegocio();
    }

    @GetMapping
    public List<ConfiguracionDTO> listar() {
        return configuracionService.listarTodas();
    }

    @PutMapping("/{clave}")
    public ConfiguracionDTO actualizar(
            @PathVariable String clave,
            @Valid @RequestBody ActualizarConfiguracionRequest request
    ) {
        return configuracionService.actualizar(clave, request);
    }
}

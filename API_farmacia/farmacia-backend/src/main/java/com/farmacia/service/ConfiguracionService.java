package com.farmacia.service;

import com.farmacia.dto.configuracion.ActualizarConfiguracionRequest;
import com.farmacia.dto.configuracion.ConfiguracionDTO;
import com.farmacia.entity.Configuracion;
import com.farmacia.exception.RecursoNoEncontradoException;
import com.farmacia.exception.ValidacionNegocioException;
import com.farmacia.scheduler.VencimientoScheduler;
import com.farmacia.repository.ConfiguracionRepository;
import com.farmacia.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ConfiguracionService {

    private final ConfiguracionRepository configuracionRepository;
    private final AuditoriaSessionService auditoriaSessionService;
    private final VencimientoScheduler vencimientoScheduler;

    // Datos que se imprimen en la factura. Los necesita cualquier empleado
    // que venda (no solo ADMIN/GERENTE), por eso tienen endpoint propio y
    // solo exponen estas claves, no toda la configuracion.
    public Map<String, String> datosNegocio() {
        Map<String, String> valores = new HashMap<>();
        for (String clave : List.of("nombre_farmacia", "nit", "direccion", "telefono", "iva_porcentaje")) {
            valores.put(clave, configuracionRepository.findByClave(clave).map(Configuracion::getValor).orElse(""));
        }
        return valores;
    }

    public List<ConfiguracionDTO> listarTodas() {
        return configuracionRepository.findAll().stream().map(this::aDTO).toList();
    }

    @Transactional
    public ConfiguracionDTO actualizar(String clave, ActualizarConfiguracionRequest request) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());

        Configuracion config = configuracionRepository.findByClave(clave)
                .orElseThrow(() -> new RecursoNoEncontradoException("Configuracion no encontrada: " + clave));
        String valor = request.getValor() == null ? "" : request.getValor().trim();

        // Las claves "dias_*" y el IVA se leen como numero. Antes se podia
        // guardar "abc" y eso rompia Reportes y la baja automatica de lotes.
        if (clave.startsWith("dias_") || clave.equals("iva_porcentaje")) {
            if (!valor.matches("^\\d{1,3}$")) {
                throw new ValidacionNegocioException("Este valor debe ser un numero entero entre 0 y 999");
            }
        }

        config.setValor(valor);
        ConfiguracionDTO dto = aDTO(configuracionRepository.save(config));

        // Si se cambio el margen de baja por vencimiento, se aplica ya
        // mismo en vez de esperar a la siguiente pasada del scheduler.
        if (clave.equals("dias_alerta_mal_estado")) {
            vencimientoScheduler.marcarLotesEnMalEstado();
        }
        return dto;
    }

    private ConfiguracionDTO aDTO(Configuracion c) {
        return ConfiguracionDTO.builder()
                .id(c.getId())
                .clave(c.getClave())
                .valor(c.getValor())
                .descripcion(c.getDescripcion())
                .actualizadoEn(c.getActualizadoEn())
                .build();
    }
}

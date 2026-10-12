package com.farmacia.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.farmacia.dto.reportes.AuditoriaDTO;
import com.farmacia.entity.Auditoria;
import com.farmacia.repository.AuditoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

// Solo lectura: la tabla `auditoria` la llena el trigger fn_auditoria() de
// PostgreSQL (ver farmacy_triggers.sql), no este servicio. Aqui solo se
// consulta y se traduce a DTO para exponerla por la API.
@Service
@RequiredArgsConstructor
public class AuditoriaService {

    // El trigger guarda la fila COMPLETA (to_jsonb), asi que en la tabla
    // usuarios eso incluye el hash de la contrasena. Nunca debe salir por
    // la API, aunque quien consulte sea ADMIN. Ver tambien
    // migracion_auditoria_sin_password.sql, que lo excluye desde la BD.
    private static final Set<String> CAMPOS_SENSIBLES = Set.of("password_hash");

    private final AuditoriaRepository auditoriaRepository;
    private final ObjectMapper objectMapper;

    public Page<AuditoriaDTO> listar(Pageable pageable) {
        return auditoriaRepository.findAllByOrderByFechaDesc(pageable).map(this::aDTO);
    }

    public List<AuditoriaDTO> historialDeRegistro(String tabla, Long registroId) {
        return auditoriaRepository.findByTablaAfectadaAndRegistroIdOrderByFechaDesc(tabla, registroId).stream()
                .map(this::aDTO)
                .toList();
    }

    private AuditoriaDTO aDTO(Auditoria a) {
        return AuditoriaDTO.builder()
                .id(a.getId())
                .usuarioNombre(a.getUsuario() != null ? a.getUsuario().getNombre() : "Sistema")
                .accion(a.getAccion())
                .tablaAfectada(a.getTablaAfectada())
                .registroId(a.getRegistroId())
                .valoresAnteriores(sinCamposSensibles(a.getValoresAnteriores()))
                .valoresNuevos(sinCamposSensibles(a.getValoresNuevos()))
                .fecha(a.getFecha())
                .build();
    }

    private String sinCamposSensibles(String json) {
        if (json == null) return null;
        try {
            JsonNode nodo = objectMapper.readTree(json);
            if (nodo instanceof ObjectNode objeto) {
                CAMPOS_SENSIBLES.forEach(objeto::remove);
                return objectMapper.writeValueAsString(objeto);
            }
            return json;
        } catch (Exception ex) {
            // Si no se puede leer, mejor no mostrar nada que filtrar un secreto.
            return null;
        }
    }
}

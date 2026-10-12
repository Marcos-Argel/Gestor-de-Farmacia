package com.farmacia.service;

import com.farmacia.dto.inventario.ClienteDTO;
import com.farmacia.entity.Cliente;
import com.farmacia.exception.RecursoNoEncontradoException;
import com.farmacia.repository.ClienteRepository;
import com.farmacia.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final AuditoriaSessionService auditoriaSessionService;

    public List<ClienteDTO> listarTodos() {
        return clienteRepository.findAll().stream().map(this::aDTO).toList();
    }

    public ClienteDTO buscarPorId(Long id) {
        return aDTO(obtenerEntidad(id));
    }

    @Transactional
    public ClienteDTO crear(ClienteDTO dto) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());

        Cliente cliente = Cliente.builder()
                .nombre(dto.getNombre())
                .tipoDocumento(dto.getTipoDocumento())
                .numeroDocumento(dto.getNumeroDocumento())
                .telefono(dto.getTelefono())
                .email(dto.getEmail())
                .direccion(dto.getDireccion())
                .build();
        return aDTO(clienteRepository.save(cliente));
    }

    @Transactional
    public ClienteDTO actualizar(Long id, ClienteDTO dto) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());

        Cliente cliente = obtenerEntidad(id);
        cliente.setNombre(dto.getNombre());
        cliente.setTipoDocumento(dto.getTipoDocumento());
        cliente.setNumeroDocumento(dto.getNumeroDocumento());
        cliente.setTelefono(dto.getTelefono());
        cliente.setEmail(dto.getEmail());
        cliente.setDireccion(dto.getDireccion());
        return aDTO(clienteRepository.save(cliente));
    }

    @Transactional
    public void eliminar(Long id) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());
        clienteRepository.delete(obtenerEntidad(id));
    }

    private Cliente obtenerEntidad(Long id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado: " + id));
    }

    private ClienteDTO aDTO(Cliente c) {
        ClienteDTO dto = new ClienteDTO();
        dto.setId(c.getId());
        dto.setNombre(c.getNombre());
        dto.setTipoDocumento(c.getTipoDocumento());
        dto.setNumeroDocumento(c.getNumeroDocumento());
        dto.setTelefono(c.getTelefono());
        dto.setEmail(c.getEmail());
        dto.setDireccion(c.getDireccion());
        return dto;
    }
}

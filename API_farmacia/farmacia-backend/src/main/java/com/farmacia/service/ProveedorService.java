package com.farmacia.service;

import com.farmacia.dto.inventario.ProveedorDTO;
import com.farmacia.entity.Proveedor;
import com.farmacia.exception.RecursoNoEncontradoException;
import com.farmacia.repository.ProveedorRepository;
import com.farmacia.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProveedorService {

    private final ProveedorRepository proveedorRepository;
    private final AuditoriaSessionService auditoriaSessionService;

    public List<ProveedorDTO> listarActivos() {
        return proveedorRepository.findByActivoTrue().stream().map(this::aDTO).toList();
    }

    public ProveedorDTO buscarPorId(Long id) {
        return aDTO(obtenerEntidad(id));
    }

    public List<ProveedorDTO> buscar(String texto) {
        return proveedorRepository
                .findByNombreContactoContainingIgnoreCaseOrEmpresaContainingIgnoreCase(texto, texto)
                .stream().map(this::aDTO).toList();
    }

    @Transactional
    public ProveedorDTO crear(ProveedorDTO dto) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());

        Proveedor proveedor = Proveedor.builder()
                .nombreContacto(dto.getNombreContacto())
                .empresa(dto.getEmpresa())
                .telefono(dto.getTelefono())
                .email(dto.getEmail())
                .direccion(dto.getDireccion())
                .activo(true)
                .build();
        return aDTO(proveedorRepository.save(proveedor));
    }

    @Transactional
    public ProveedorDTO actualizar(Long id, ProveedorDTO dto) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());

        Proveedor proveedor = obtenerEntidad(id);
        proveedor.setNombreContacto(dto.getNombreContacto());
        proveedor.setEmpresa(dto.getEmpresa());
        proveedor.setTelefono(dto.getTelefono());
        proveedor.setEmail(dto.getEmail());
        proveedor.setDireccion(dto.getDireccion());
        if (dto.getActivo() != null) proveedor.setActivo(dto.getActivo());
        return aDTO(proveedorRepository.save(proveedor));
    }

    @Transactional
    public void desactivar(Long id) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());
        Proveedor proveedor = obtenerEntidad(id);
        proveedor.setActivo(false);
        proveedorRepository.save(proveedor);
    }

    private Proveedor obtenerEntidad(Long id) {
        return proveedorRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor no encontrado: " + id));
    }

    private ProveedorDTO aDTO(Proveedor p) {
        ProveedorDTO dto = new ProveedorDTO();
        dto.setId(p.getId());
        dto.setNombreContacto(p.getNombreContacto());
        dto.setEmpresa(p.getEmpresa());
        dto.setTelefono(p.getTelefono());
        dto.setEmail(p.getEmail());
        dto.setDireccion(p.getDireccion());
        dto.setActivo(p.getActivo());
        return dto;
    }
}

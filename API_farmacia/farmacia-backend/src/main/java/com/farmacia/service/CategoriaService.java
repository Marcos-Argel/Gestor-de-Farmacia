package com.farmacia.service;

import com.farmacia.dto.inventario.CategoriaDTO;
import com.farmacia.entity.Categoria;
import com.farmacia.exception.RecursoNoEncontradoException;
import com.farmacia.repository.CategoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;

    public List<CategoriaDTO> listarTodas() {
        return categoriaRepository.findAll().stream().map(this::aDTO).toList();
    }

    public CategoriaDTO buscarPorId(Integer id) {
        return aDTO(obtenerEntidad(id));
    }

    @Transactional
    public CategoriaDTO crear(CategoriaDTO dto) {
        Categoria categoria = Categoria.builder()
                .nombre(dto.getNombre())
                .descripcion(dto.getDescripcion())
                .build();
        return aDTO(categoriaRepository.save(categoria));
    }

    @Transactional
    public CategoriaDTO actualizar(Integer id, CategoriaDTO dto) {
        Categoria categoria = obtenerEntidad(id);
        categoria.setNombre(dto.getNombre());
        categoria.setDescripcion(dto.getDescripcion());
        return aDTO(categoriaRepository.save(categoria));
    }

    @Transactional
    public void eliminar(Integer id) {
        categoriaRepository.delete(obtenerEntidad(id));
    }

    private Categoria obtenerEntidad(Integer id) {
        return categoriaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoria no encontrada: " + id));
    }

    private CategoriaDTO aDTO(Categoria c) {
        CategoriaDTO dto = new CategoriaDTO();
        dto.setId(c.getId());
        dto.setNombre(c.getNombre());
        dto.setDescripcion(c.getDescripcion());
        return dto;
    }
}

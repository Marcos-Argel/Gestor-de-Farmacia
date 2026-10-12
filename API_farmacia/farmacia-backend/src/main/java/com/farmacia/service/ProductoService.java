package com.farmacia.service;

import com.farmacia.dto.inventario.ProductoDTO;
import com.farmacia.entity.Categoria;
import com.farmacia.entity.Producto;
import com.farmacia.entity.Proveedor;
import com.farmacia.exception.RecursoNoEncontradoException;
import com.farmacia.repository.CategoriaRepository;
import com.farmacia.repository.LoteRepository;
import com.farmacia.repository.ProductoRepository;
import com.farmacia.repository.ProveedorRepository;
import com.farmacia.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final ProveedorRepository proveedorRepository;
    private final LoteRepository loteRepository;
    private final AuditoriaSessionService auditoriaSessionService;

    public List<ProductoDTO> listarActivos() {
        return productoRepository.findByActivoTrue().stream().map(this::aDTO).toList();
    }

    public List<ProductoDTO> buscarPorNombre(String nombre) {
        return productoRepository.findByNombreContainingIgnoreCase(nombre).stream().map(this::aDTO).toList();
    }

    public ProductoDTO buscarPorId(Long id) {
        return aDTO(obtenerEntidad(id));
    }

    // Usado por el escaner de codigo de barras en Ventas: busqueda EXACTA
    // (no "contiene" como buscarPorNombre), y solo entre productos activos
    // -- no tiene sentido vender algo que ya se dio de baja.
    public ProductoDTO buscarPorCodigoBarras(String codigoBarras) {
        Producto producto = productoRepository.findByCodigoBarras(codigoBarras)
                .filter(Producto::getActivo)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No se encontro ningun producto activo con el codigo de barras: " + codigoBarras));
        return aDTO(producto);
    }

    @Transactional
    public ProductoDTO crear(ProductoDTO dto) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());

        Producto producto = Producto.builder()
                .nombre(dto.getNombre())
                .descripcion(dto.getDescripcion())
                .categoria(resolverCategoria(dto.getCategoriaId()))
                .principioActivo(dto.getPrincipioActivo())
                .presentacion(dto.getPresentacion())
                .unidadMedida(dto.getUnidadMedida())
                .codigoBarras(dto.getCodigoBarras())
                .requiereReceta(dto.getRequiereReceta())
                .gravaIva(Boolean.TRUE.equals(dto.getGravaIva()))
                .proveedor(resolverProveedor(dto.getProveedorId()))
                .precioCompra(dto.getPrecioCompra())
                .precioVenta(dto.getPrecioVenta())
                .stockMinimo(dto.getStockMinimo() != null ? dto.getStockMinimo() : 0)
                .activo(true)
                .imagenBase64(dto.getImagenBase64())
                .build();

        return aDTO(productoRepository.save(producto));
    }

    @Transactional
    public ProductoDTO actualizar(Long id, ProductoDTO dto) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());

        Producto producto = obtenerEntidad(id);
        producto.setNombre(dto.getNombre());
        producto.setDescripcion(dto.getDescripcion());
        producto.setCategoria(resolverCategoria(dto.getCategoriaId()));
        producto.setPrincipioActivo(dto.getPrincipioActivo());
        producto.setPresentacion(dto.getPresentacion());
        producto.setUnidadMedida(dto.getUnidadMedida());
        producto.setCodigoBarras(dto.getCodigoBarras());
        producto.setRequiereReceta(dto.getRequiereReceta());
        producto.setGravaIva(Boolean.TRUE.equals(dto.getGravaIva()));
        producto.setProveedor(resolverProveedor(dto.getProveedorId()));
        producto.setPrecioCompra(dto.getPrecioCompra());
        producto.setPrecioVenta(dto.getPrecioVenta());
        if (dto.getStockMinimo() != null) producto.setStockMinimo(dto.getStockMinimo());
        producto.setImagenBase64(dto.getImagenBase64());

        return aDTO(productoRepository.save(producto));
    }

    @Transactional
    public void desactivar(Long id) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());
        Producto producto = obtenerEntidad(id);
        producto.setActivo(false);
        productoRepository.save(producto);
    }

    private Categoria resolverCategoria(Integer categoriaId) {
        if (categoriaId == null) return null;
        return categoriaRepository.findById(categoriaId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoria no encontrada: " + categoriaId));
    }

    private Proveedor resolverProveedor(Long proveedorId) {
        if (proveedorId == null) return null;
        return proveedorRepository.findById(proveedorId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor no encontrado: " + proveedorId));
    }

    private Producto obtenerEntidad(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado: " + id));
    }

    private ProductoDTO aDTO(Producto p) {
        ProductoDTO dto = new ProductoDTO();
        dto.setId(p.getId());
        dto.setNombre(p.getNombre());
        dto.setDescripcion(p.getDescripcion());
        dto.setCategoriaId(p.getCategoria() != null ? p.getCategoria().getId() : null);
        dto.setPrincipioActivo(p.getPrincipioActivo());
        dto.setPresentacion(p.getPresentacion());
        dto.setUnidadMedida(p.getUnidadMedida());
        dto.setCodigoBarras(p.getCodigoBarras());
        dto.setRequiereReceta(p.getRequiereReceta());
        dto.setGravaIva(p.getGravaIva());
        dto.setProveedorId(p.getProveedor() != null ? p.getProveedor().getId() : null);
        dto.setPrecioCompra(p.getPrecioCompra());
        dto.setPrecioVenta(p.getPrecioVenta());
        dto.setStockMinimo(p.getStockMinimo());
        dto.setImagenBase64(p.getImagenBase64());

        // Stock actual = solo lo vendible (sin lotes dados de baja por vencimiento).
        dto.setStockActual((int) loteRepository.sumarStockVendible(p.getId()));

        return dto;
    }
}
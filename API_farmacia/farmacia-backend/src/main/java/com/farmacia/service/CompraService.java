package com.farmacia.service;

import com.farmacia.dto.compras.*;
import com.farmacia.entity.*;
import com.farmacia.entity.enums.EstadoCompra;
import com.farmacia.exception.RecursoNoEncontradoException;
import com.farmacia.exception.ValidacionNegocioException;
import com.farmacia.scheduler.VencimientoScheduler;
import com.farmacia.repository.*;
import com.farmacia.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CompraService {

    private final CompraRepository compraRepository;
    private final DetalleCompraRepository detalleCompraRepository;
    private final ProductoRepository productoRepository;
    private final ProveedorRepository proveedorRepository;
    private final UsuarioRepository usuarioRepository;
    private final LoteRepository loteRepository;
    private final AuditoriaSessionService auditoriaSessionService;
    private final VencimientoScheduler vencimientoScheduler;

    // Registrar una compra RECIBIDA crea automaticamente los lotes
    // correspondientes -- asi el stock queda disponible de inmediato
    // para la venta, con su fecha de vencimiento correcta para FEFO.
    @Transactional
    public CompraResponse registrarCompra(CompraRequest request) {
        Long usuarioActualId = SecurityUtils.obtenerUsuarioActualId();
        auditoriaSessionService.establecerUsuarioActual(usuarioActualId);

        Usuario usuario = usuarioRepository.findById(usuarioActualId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario autenticado no encontrado"));

        Proveedor proveedor = proveedorRepository.findById(request.getProveedorId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor no encontrado: " + request.getProveedorId()));

        // Un lote que vence dentro del margen de baja quedaria dado de baja
        // apenas entra: se estaria pagando mercancia que no se puede vender.
        int diasBaja = vencimientoScheduler.diasAlertaMalEstado();
        LocalDate minimoVencimiento = LocalDate.now().plusDays(diasBaja);
        for (DetalleCompraRequest item : request.getDetalles()) {
            if (!item.getFechaVencimiento().isAfter(minimoVencimiento)) {
                throw new ValidacionNegocioException("El lote " + item.getNumeroLote() + " vence el "
                        + item.getFechaVencimiento() + ": debe vencer despues del " + minimoVencimiento
                        + " (los lotes con " + diasBaja + " dias o menos para vencer se dan de baja automaticamente)");
            }
        }

        Compra compra = Compra.builder()
                .proveedor(proveedor)
                .usuario(usuario)
                .numeroFactura(request.getNumeroFactura())
                .estado(EstadoCompra.RECIBIDA)
                .build();
        compra = compraRepository.save(compra);

        BigDecimal subtotalCompra = BigDecimal.ZERO;
        List<DetalleCompraResponse> detallesResponse = new ArrayList<>();

        for (DetalleCompraRequest item : request.getDetalles()) {
            Producto producto = productoRepository.findById(item.getProductoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado: " + item.getProductoId()));

            // Crear el lote nuevo con el stock que llega en esta compra.
            Lote lote = Lote.builder()
                    .producto(producto)
                    .numeroLote(item.getNumeroLote())
                    .fechaVencimiento(item.getFechaVencimiento())
                    .cantidadInicial(item.getCantidad())
                    .cantidadActual(item.getCantidad())
                    .precioCompraUnit(item.getPrecioUnitario())
                    .proveedor(proveedor)
                    .build();
            lote = loteRepository.save(lote);

            BigDecimal subtotalItem = item.getPrecioUnitario().multiply(BigDecimal.valueOf(item.getCantidad()));
            subtotalCompra = subtotalCompra.add(subtotalItem);

            DetalleCompra detalle = DetalleCompra.builder()
                    .compra(compra)
                    .producto(producto)
                    .lote(lote)
                    .cantidad(item.getCantidad())
                    .precioUnitario(item.getPrecioUnitario())
                    .subtotal(subtotalItem)
                    .build();
            detalleCompraRepository.save(detalle);

            detallesResponse.add(DetalleCompraResponse.builder()
                    .productoId(producto.getId())
                    .productoNombre(producto.getNombre())
                    .loteId(lote.getId())
                    .numeroLote(lote.getNumeroLote())
                    .cantidad(item.getCantidad())
                    .precioUnitario(item.getPrecioUnitario())
                    .subtotal(subtotalItem)
                    .build());
        }

        compra.setSubtotal(subtotalCompra);
        compra.setTotal(subtotalCompra); // sin impuestos/descuentos adicionales por ahora
        compra = compraRepository.save(compra);

        return construirResponse(compra, detallesResponse);
    }

    public CompraResponse buscarPorId(Long id) {
        Compra compra = compraRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Compra no encontrada: " + id));
        List<DetalleCompraResponse> detalles = detalleCompraRepository.findByCompraId(id).stream()
                .map(d -> DetalleCompraResponse.builder()
                        .productoId(d.getProducto().getId())
                        .productoNombre(d.getProducto().getNombre())
                        .loteId(d.getLote() != null ? d.getLote().getId() : null)
                        .numeroLote(d.getLote() != null ? d.getLote().getNumeroLote() : null)
                        .cantidad(d.getCantidad())
                        .precioUnitario(d.getPrecioUnitario())
                        .subtotal(d.getSubtotal())
                        .build())
                .toList();
        return construirResponse(compra, detalles);
    }

    public List<CompraResponse> listarTodas() {
        return compraRepository.findAllByOrderByFechaDesc().stream().map(c -> buscarPorId(c.getId())).toList();
    }

    private CompraResponse construirResponse(Compra compra, List<DetalleCompraResponse> detalles) {
        return CompraResponse.builder()
                .id(compra.getId())
                .proveedorId(compra.getProveedor().getId())
                .proveedorEmpresa(compra.getProveedor().getEmpresa())
                .usuarioNombre(compra.getUsuario().getNombre())
                .fecha(compra.getFecha())
                .numeroFactura(compra.getNumeroFactura())
                .subtotal(compra.getSubtotal())
                .total(compra.getTotal())
                .estado(compra.getEstado())
                .detalles(detalles)
                .build();
    }
}
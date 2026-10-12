package com.farmacia.service;

import com.farmacia.dto.devoluciones.DevolucionRequest;
import com.farmacia.dto.devoluciones.DevolucionResponse;
import com.farmacia.entity.*;
import com.farmacia.entity.enums.EstadoCaja;
import com.farmacia.entity.enums.TipoDevolucion;
import com.farmacia.entity.enums.TipoMovimientoCaja;
import com.farmacia.exception.RecursoNoEncontradoException;
import com.farmacia.exception.StockInsuficienteException;
import com.farmacia.exception.ValidacionNegocioException;
import com.farmacia.repository.*;
import com.farmacia.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class DevolucionService {

    private final DevolucionRepository devolucionRepository;
    private final VentaRepository ventaRepository;
    private final CompraRepository compraRepository;
    private final DetalleVentaRepository detalleVentaRepository;
    private final DetalleCompraRepository detalleCompraRepository;
    private final ProductoRepository productoRepository;
    private final LoteRepository loteRepository;
    private final UsuarioRepository usuarioRepository;
    private final CajaSesionRepository cajaSesionRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final AuditoriaSessionService auditoriaSessionService;

    // Antes no se comprobaba que el producto estuviera en la venta/compra
    // indicada, ni la cantidad, ni el reembolso: se podia "devolver" 1000
    // unidades de un producto que nunca se vendio (inflando el stock) y
    // pedir cualquier monto de reembolso. Ahora todo se valida contra el
    // detalle real de la venta o compra de origen.
    @Transactional
    public DevolucionResponse registrarDevolucion(DevolucionRequest request) {
        Long usuarioId = SecurityUtils.obtenerUsuarioActualId();
        auditoriaSessionService.establecerUsuarioActual(usuarioId);

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));

        Producto producto = productoRepository.findById(request.getProductoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado: " + request.getProductoId()));

        int cantidad = request.getCantidad();
        BigDecimal montoReembolso = request.getMontoReembolso() != null ? request.getMontoReembolso() : BigDecimal.ZERO;

        Venta venta = null;
        Compra compra = null;
        Lote lote;

        if (request.getTipo() == TipoDevolucion.VENTA) {
            if (request.getVentaId() == null) {
                throw new ValidacionNegocioException("Debes indicar la venta de origen para esta devolucion");
            }
            venta = ventaRepository.findById(request.getVentaId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Venta no encontrada: " + request.getVentaId()));

            List<DetalleVenta> detalles = detalleVentaRepository.findByVentaId(venta.getId()).stream()
                    .filter(d -> d.getProducto().getId().equals(producto.getId()))
                    .toList();
            if (detalles.isEmpty()) {
                throw new ValidacionNegocioException(
                        "El producto '" + producto.getNombre() + "' no hace parte de la venta #" + venta.getId());
            }

            int vendido = detalles.stream().mapToInt(DetalleVenta::getCantidad).sum();
            long yaDevuelto = devolucionRepository.sumarDevueltoDeVenta(venta.getId(), producto.getId());
            validarCantidadDisponible(cantidad, vendido - yaDevuelto, "vendidas");

            DetalleVenta detalle = elegirDetalle(detalles, request.getLoteId(), d -> d.getLote().getId());
            validarReembolso(montoReembolso, detalle.getPrecioUnitario(), cantidad);

            // Devolucion de venta: el stock REGRESA al lote del que salio,
            // salvo que el producto venga danado (antes volvia siempre, y un
            // producto danado quedaba otra vez a la venta).
            lote = detalle.getLote();
            if (!Boolean.FALSE.equals(request.getReingresarStock())) {
                lote.setCantidadActual(lote.getCantidadActual() + cantidad);
                loteRepository.save(lote);
            }

        } else {
            if (request.getCompraId() == null) {
                throw new ValidacionNegocioException("Debes indicar la compra de origen para esta devolucion");
            }
            compra = compraRepository.findById(request.getCompraId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Compra no encontrada: " + request.getCompraId()));

            List<DetalleCompra> detalles = detalleCompraRepository.findByCompraId(compra.getId()).stream()
                    .filter(d -> d.getProducto().getId().equals(producto.getId()) && d.getLote() != null)
                    .toList();
            if (detalles.isEmpty()) {
                throw new ValidacionNegocioException(
                        "El producto '" + producto.getNombre() + "' no hace parte de la compra #" + compra.getId());
            }

            int comprado = detalles.stream().mapToInt(DetalleCompra::getCantidad).sum();
            long yaDevuelto = devolucionRepository.sumarDevueltoDeCompra(compra.getId(), producto.getId());
            validarCantidadDisponible(cantidad, comprado - yaDevuelto, "compradas");

            DetalleCompra detalle = elegirDetalle(detalles, request.getLoteId(), d -> d.getLote().getId());
            validarReembolso(montoReembolso, detalle.getPrecioUnitario(), cantidad);

            // Devolucion de compra: el stock SALE del lote (vuelve al proveedor).
            lote = detalle.getLote();
            if (lote.getCantidadActual() < cantidad) {
                throw new StockInsuficienteException(
                        "No hay suficiente stock en el lote para devolver al proveedor. Disponible: " + lote.getCantidadActual());
            }
            lote.setCantidadActual(lote.getCantidadActual() - cantidad);
            loteRepository.save(lote);
        }

        Devolucion devolucion = Devolucion.builder()
                .tipo(request.getTipo())
                .venta(venta)
                .compra(compra)
                .producto(producto)
                .lote(lote)
                .cantidad(cantidad)
                .motivo(request.getMotivo().trim())
                .montoReembolso(montoReembolso)
                .usuario(usuario)
                .build();
        devolucion = devolucionRepository.save(devolucion);

        // El dinero que se le devuelve al cliente sale de la caja: si quien
        // registra la devolucion tiene una caja abierta, se anota el EGRESO
        // para que el cuadre de cierre no quede descuadrado.
        if (request.getTipo() == TipoDevolucion.VENTA && montoReembolso.signum() > 0) {
            String concepto = "Reembolso devolucion #" + devolucion.getId() + " (venta #" + request.getVentaId() + ")";
            cajaSesionRepository.findByUsuarioIdAndEstado(usuarioId, EstadoCaja.ABIERTA)
                    .ifPresent(sesion -> movimientoCajaRepository.save(MovimientoCaja.builder()
                            .cajaSesion(sesion)
                            .tipo(TipoMovimientoCaja.EGRESO)
                            .monto(montoReembolso)
                            .concepto(concepto)
                            .build()));
        }

        return construirResponse(devolucion);
    }

    public List<DevolucionResponse> listarTodas() {
        return devolucionRepository.findAllByOrderByFechaDesc().stream().map(this::construirResponse).toList();
    }

    private void validarCantidadDisponible(int solicitada, long disponible, String palabra) {
        if (solicitada > disponible) {
            throw new ValidacionNegocioException("Solo quedan " + Math.max(disponible, 0) + " unidades " + palabra
                    + " de este producto por devolver (ya se descontaron devoluciones anteriores)");
        }
    }

    private void validarReembolso(BigDecimal monto, BigDecimal precioUnitario, int cantidad) {
        BigDecimal maximo = precioUnitario.multiply(BigDecimal.valueOf(cantidad));
        if (monto.compareTo(maximo) > 0) {
            throw new ValidacionNegocioException("El reembolso no puede superar lo pagado por esas unidades (" + maximo + ")");
        }
    }

    // Si se indico un lote, debe ser uno de los lotes de esa venta/compra;
    // si no, se usa el primero (el lote real del que salio el producto, en
    // vez del "lote cualquiera del producto" que se usaba antes).
    private <T> T elegirDetalle(List<T> detalles, Long loteId, Function<T, Long> loteDe) {
        if (loteId == null) return detalles.get(0);
        return detalles.stream()
                .filter(d -> Objects.equals(loteDe.apply(d), loteId))
                .findFirst()
                .orElseThrow(() -> new ValidacionNegocioException(
                        "El lote indicado no corresponde a ese producto en el documento de origen"));
    }

    private DevolucionResponse construirResponse(Devolucion d) {
        return DevolucionResponse.builder()
                .id(d.getId())
                .tipo(d.getTipo())
                .ventaId(d.getVenta() != null ? d.getVenta().getId() : null)
                .compraId(d.getCompra() != null ? d.getCompra().getId() : null)
                .productoId(d.getProducto().getId())
                .productoNombre(d.getProducto().getNombre())
                .loteId(d.getLote() != null ? d.getLote().getId() : null)
                .cantidad(d.getCantidad())
                .motivo(d.getMotivo())
                .montoReembolso(d.getMontoReembolso())
                .usuarioNombre(d.getUsuario().getNombre())
                .fecha(d.getFecha())
                .build();
    }
}

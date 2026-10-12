package com.farmacia.service;

import com.farmacia.dto.ventas.*;
import com.farmacia.entity.*;
import com.farmacia.entity.enums.EstadoCaja;
import com.farmacia.entity.enums.EstadoVenta;
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
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VentaService {

    private final VentaRepository ventaRepository;
    private final DetalleVentaRepository detalleVentaRepository;
    private final ProductoRepository productoRepository;
    private final LoteRepository loteRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaSessionService auditoriaSessionService;
    private final CajaSesionRepository cajaSesionRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final ConfiguracionRepository configuracionRepository;

    // @Transactional es clave aqui: todo el metodo corre en una sola
    // transaccion. Los lotes se bloquean (PESSIMISTIC_WRITE, ver
    // LoteRepository) hasta que ESTA transaccion termine -- si dos
    // cajeros venden el mismo producto al mismo tiempo, el segundo
    // espera a que el primero termine antes de leer el stock.
    @Transactional
    public VentaResponse registrarVenta(VentaRequest request) {
        Long usuarioActualId = SecurityUtils.obtenerUsuarioActualId();
        auditoriaSessionService.establecerUsuarioActual(usuarioActualId);

        Usuario usuario = usuarioRepository.findById(usuarioActualId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario autenticado no encontrado"));

        Cliente cliente = null;
        if (request.getClienteId() != null) {
            cliente = clienteRepository.findById(request.getClienteId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado: " + request.getClienteId()));
        }

        // 1. Validar productos, stock, y si algun producto requiere receta.
        boolean requiereReceta = false;
        List<Producto> productosEnVenta = new ArrayList<>();

        for (DetalleVentaRequest item : request.getDetalles()) {
            Producto producto = productoRepository.findById(item.getProductoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado: " + item.getProductoId()));
            productosEnVenta.add(producto);
            if (Boolean.TRUE.equals(producto.getRequiereReceta())) {
                requiereReceta = true;
            }
        }

        if (requiereReceta) {
            String numeroFormula = request.getNumeroFormula() == null ? "" : request.getNumeroFormula().trim();
            String medicoNombre = request.getMedicoNombre() == null ? "" : request.getMedicoNombre().trim();

            // Antes solo se validaba que no estuviera vacio, por lo que "-1"
            // pasaba como numero de formula valido. Ahora exige un codigo
            // alfanumerico real (letras/digitos, sin empezar con signo).
            if (!numeroFormula.matches("^[A-Za-z0-9][A-Za-z0-9-]{2,29}$")) {
                throw new ValidacionNegocioException(
                        "El numero de formula medica no es valido. Debe tener al menos 3 caracteres alfanumericos.");
            }
            // Antes tambien aceptaba puros numeros como nombre del medico.
            // Ahora exige que sea texto (letras y espacios).
            if (!medicoNombre.matches("^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'. ]{2,99}$")) {
                throw new ValidacionNegocioException(
                        "El nombre del medico no es valido. Debe contener solo letras y tener al menos 3 caracteres.");
            }
        }

        // 2. Crear el encabezado de la venta (aun sin totales, se calculan abajo).
        Venta venta = Venta.builder()
                .cliente(cliente)
                .usuario(usuario)
                .metodoPago(request.getMetodoPago())
                .estado(EstadoVenta.COMPLETADA)
                .descuento(request.getDescuento() != null ? request.getDescuento() : BigDecimal.ZERO)
                .numeroFormula(requiereReceta ? request.getNumeroFormula().trim() : null)
                .medicoNombre(requiereReceta ? request.getMedicoNombre().trim() : null)
                .build();
        venta = ventaRepository.save(venta);

        // 3. Por cada item solicitado, descontar de los lotes siguiendo FEFO.
        BigDecimal subtotalVenta = BigDecimal.ZERO;
        BigDecimal subtotalGravado = BigDecimal.ZERO;
        List<DetalleVentaResponse> detallesResponse = new ArrayList<>();

        for (int i = 0; i < request.getDetalles().size(); i++) {
            DetalleVentaRequest item = request.getDetalles().get(i);
            Producto producto = productosEnVenta.get(i);

            List<Lote> lotesDisponibles = loteRepository.buscarLotesDisponiblesFEFO(producto.getId());

            int cantidadRestante = item.getCantidad();
            int stockTotalDisponible = lotesDisponibles.stream().mapToInt(Lote::getCantidadActual).sum();

            if (stockTotalDisponible < cantidadRestante) {
                throw new StockInsuficienteException(
                        "Stock insuficiente para '" + producto.getNombre() + "'. Disponible: " +
                                stockTotalDisponible + ", solicitado: " + cantidadRestante);
            }

            // Descuenta empezando por el lote que vence primero (FEFO),
            // y si no alcanza, sigue con el siguiente lote en la lista.
            for (Lote lote : lotesDisponibles) {
                if (cantidadRestante <= 0) break;

                int aDescontar = Math.min(cantidadRestante, lote.getCantidadActual());
                lote.setCantidadActual(lote.getCantidadActual() - aDescontar);
                loteRepository.save(lote);

                BigDecimal subtotalItem = producto.getPrecioVenta().multiply(BigDecimal.valueOf(aDescontar));
                subtotalVenta = subtotalVenta.add(subtotalItem);
                if (Boolean.TRUE.equals(producto.getGravaIva())) {
                    subtotalGravado = subtotalGravado.add(subtotalItem);
                }

                DetalleVenta detalle = DetalleVenta.builder()
                        .venta(venta)
                        .producto(producto)
                        .lote(lote)
                        .cantidad(aDescontar)
                        .precioUnitario(producto.getPrecioVenta())
                        .subtotal(subtotalItem)
                        .build();
                detalleVentaRepository.save(detalle);

                detallesResponse.add(DetalleVentaResponse.builder()
                        .productoId(producto.getId())
                        .productoNombre(producto.getNombre())
                        .loteId(lote.getId())
                        .numeroLote(lote.getNumeroLote())
                        .cantidad(aDescontar)
                        .precioUnitario(producto.getPrecioVenta())
                        .subtotal(subtotalItem)
                        .build());

                cantidadRestante -= aDescontar;
            }
        }

        // 4. Calcular totales finales y actualizar el encabezado de la venta.
        // El descuento no puede dejar la venta en negativo (antes un
        // descuento mayor al subtotal generaba un total < 0 y la caja
        // registraba una "venta" que restaba dinero).
        if (venta.getDescuento().compareTo(subtotalVenta) > 0) {
            throw new ValidacionNegocioException("El descuento no puede ser mayor al subtotal de la venta");
        }
        // El precio de venta ya INCLUYE el IVA (asi se exhibe al publico),
        // por eso el total no cambia: el impuesto se calcula solo para
        // desglosarlo en la factura ("IVA incluido"). Antes nunca se
        // calculaba aunque existiera la configuracion iva_porcentaje.
        BigDecimal total = subtotalVenta.subtract(venta.getDescuento());
        venta.setImpuesto(calcularIvaIncluido(subtotalGravado, subtotalVenta, venta.getDescuento()));
        venta.setSubtotal(subtotalVenta);
        venta.setTotal(total);
        venta = ventaRepository.save(venta);

        // Si el usuario tiene una caja abierta, registrar el ingreso
        // automaticamente para que el cuadre de caja sea exacto sin
        // que el cajero tenga que anotarlo aparte.
        Optional<CajaSesion> sesionAbierta = cajaSesionRepository.findByUsuarioIdAndEstado(usuarioActualId, EstadoCaja.ABIERTA);
        if (sesionAbierta.isPresent()) {
            MovimientoCaja movimiento = MovimientoCaja.builder()
                    .cajaSesion(sesionAbierta.get())
                    .tipo(TipoMovimientoCaja.VENTA)
                    .monto(total)
                    .concepto("Venta #" + venta.getId())
                    .venta(venta)
                    .build();
            movimientoCajaRepository.save(movimiento);
        }

        return construirResponse(venta, detallesResponse);
    }

    // La mas reciente primero (antes salian en orden de insercion, y
    // Devoluciones tomaba "las primeras 30" = las 30 mas VIEJAS).
    public List<VentaResponse> listarTodas() {
        return ventaRepository.findAllByOrderByFechaDesc().stream()
                .map(v -> construirResponse(v, detallesDe(v.getId())))
                .toList();
    }

    public VentaResponse buscarPorId(Long id) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Venta no encontrada: " + id));
        return construirResponse(venta, detallesDe(id));
    }

    private List<DetalleVentaResponse> detallesDe(Long ventaId) {
        return detalleVentaRepository.findByVentaId(ventaId).stream()
                .map(d -> DetalleVentaResponse.builder()
                        .productoId(d.getProducto().getId())
                        .productoNombre(d.getProducto().getNombre())
                        .loteId(d.getLote().getId())
                        .numeroLote(d.getLote().getNumeroLote())
                        .cantidad(d.getCantidad())
                        .precioUnitario(d.getPrecioUnitario())
                        .subtotal(d.getSubtotal())
                        .build())
                .toList();
    }

    private VentaResponse construirResponse(Venta venta, List<DetalleVentaResponse> detalles) {
        return VentaResponse.builder()
                .id(venta.getId())
                .clienteId(venta.getCliente() != null ? venta.getCliente().getId() : null)
                .clienteNombre(venta.getCliente() != null ? venta.getCliente().getNombre() : "Consumidor final")
                .usuarioNombre(venta.getUsuario().getNombre())
                .fecha(venta.getFecha())
                .subtotal(venta.getSubtotal())
                .descuento(venta.getDescuento())
                .impuesto(venta.getImpuesto())
                .total(venta.getTotal())
                .metodoPago(venta.getMetodoPago())
                .estado(venta.getEstado())
                .numeroFormula(venta.getNumeroFormula())
                .medicoNombre(venta.getMedicoNombre())
                .detalles(detalles)
                .build();
    }

    // IVA contenido en las lineas gravadas. El descuento se reparte en
    // proporcion: si se desconto el 10% de la venta, la base gravada
    // tambien baja 10%. IVA incluido = base * tasa / (100 + tasa).
    private BigDecimal calcularIvaIncluido(BigDecimal subtotalGravado, BigDecimal subtotal, BigDecimal descuento) {
        if (subtotalGravado.signum() == 0 || subtotal.signum() == 0) return BigDecimal.ZERO;

        BigDecimal tasa = configuracionRepository.findByClave("iva_porcentaje")
                .map(c -> {
                    try {
                        return new BigDecimal(c.getValor().trim());
                    } catch (NumberFormatException ex) {
                        return BigDecimal.ZERO;
                    }
                })
                .orElse(BigDecimal.ZERO);
        if (tasa.signum() <= 0) return BigDecimal.ZERO;

        BigDecimal factorDescuento = BigDecimal.ONE.subtract(descuento.divide(subtotal, 10, RoundingMode.HALF_UP));
        BigDecimal baseConIva = subtotalGravado.multiply(factorDescuento);
        return baseConIva.multiply(tasa)
                .divide(tasa.add(BigDecimal.valueOf(100)), 2, RoundingMode.HALF_UP);
    }
}

package com.farmacia.service;

import com.farmacia.TestSeguridad;
import com.farmacia.dto.devoluciones.DevolucionRequest;
import com.farmacia.entity.*;
import com.farmacia.entity.enums.TipoDevolucion;
import com.farmacia.exception.ValidacionNegocioException;
import com.farmacia.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DevolucionServiceTest {

    @Mock DevolucionRepository devolucionRepository;
    @Mock VentaRepository ventaRepository;
    @Mock CompraRepository compraRepository;
    @Mock DetalleVentaRepository detalleVentaRepository;
    @Mock DetalleCompraRepository detalleCompraRepository;
    @Mock ProductoRepository productoRepository;
    @Mock LoteRepository loteRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock CajaSesionRepository cajaSesionRepository;
    @Mock MovimientoCajaRepository movimientoCajaRepository;
    @Mock AuditoriaSessionService auditoriaSessionService;

    @InjectMocks DevolucionService devolucionService;

    private Producto vendido;
    private Producto otro;
    private Lote lote;

    @BeforeEach
    void preparar() {
        Usuario vendedor = TestSeguridad.usuario(5, "VENDEDOR");
        TestSeguridad.autenticarComo(vendedor);
        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(vendedor));

        vendido = Producto.builder().id(1L).nombre("Acetaminofen").build();
        otro = Producto.builder().id(2L).nombre("Ibuprofeno").build();
        when(productoRepository.findById(1L)).thenReturn(Optional.of(vendido));
        when(productoRepository.findById(2L)).thenReturn(Optional.of(otro));

        // Venta #100: 2 unidades de Acetaminofen a 1000 c/u.
        Venta venta = Venta.builder().id(100L).build();
        lote = Lote.builder().id(10L).producto(vendido).cantidadActual(5).build();
        DetalleVenta detalle = DetalleVenta.builder().venta(venta).producto(vendido).lote(lote)
                .cantidad(2).precioUnitario(new BigDecimal("1000")).subtotal(new BigDecimal("2000")).build();
        when(ventaRepository.findById(100L)).thenReturn(Optional.of(venta));
        when(detalleVentaRepository.findByVentaId(100L)).thenReturn(List.of(detalle));
        when(devolucionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(cajaSesionRepository.findByUsuarioIdAndEstado(anyLong(), any())).thenReturn(Optional.empty());
    }

    @AfterEach
    void limpiar() {
        TestSeguridad.limpiar();
    }

    private DevolucionRequest devolucion(long productoId, int cantidad, String reembolso) {
        DevolucionRequest r = new DevolucionRequest();
        r.setTipo(TipoDevolucion.VENTA);
        r.setVentaId(100L);
        r.setProductoId(productoId);
        r.setCantidad(cantidad);
        r.setMotivo("Prueba");
        r.setMontoReembolso(reembolso == null ? null : new BigDecimal(reembolso));
        return r;
    }

    @Test
    void devolucionValidaReingresaElStock() {
        devolucionService.registrarDevolucion(devolucion(1, 2, "2000"));
        assertThat(lote.getCantidadActual()).isEqualTo(7);
    }

    @Test
    void productoDanadoNoVuelveAlInventario() {
        DevolucionRequest r = devolucion(1, 1, null);
        r.setReingresarStock(false);
        devolucionService.registrarDevolucion(r);
        assertThat(lote.getCantidadActual()).isEqualTo(5);
    }

    @Test
    void rechazaProductoQueNoEstabaEnLaVenta() {
        assertThatThrownBy(() -> devolucionService.registrarDevolucion(devolucion(2, 1, null)))
                .isInstanceOf(ValidacionNegocioException.class)
                .hasMessageContaining("no hace parte");
    }

    @Test
    void rechazaDevolverMasDeLoVendido() {
        assertThatThrownBy(() -> devolucionService.registrarDevolucion(devolucion(1, 3, null)))
                .isInstanceOf(ValidacionNegocioException.class);
    }

    @Test
    void tieneEnCuentaLoYaDevuelto() {
        when(devolucionRepository.sumarDevueltoDeVenta(100L, 1L)).thenReturn(2L);
        assertThatThrownBy(() -> devolucionService.registrarDevolucion(devolucion(1, 1, null)))
                .isInstanceOf(ValidacionNegocioException.class);
    }

    @Test
    void rechazaReembolsoMayorALoPagado() {
        assertThatThrownBy(() -> devolucionService.registrarDevolucion(devolucion(1, 1, "5000")))
                .isInstanceOf(ValidacionNegocioException.class);
    }
}

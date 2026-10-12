package com.farmacia.service;

import com.farmacia.TestSeguridad;
import com.farmacia.dto.ventas.DetalleVentaRequest;
import com.farmacia.dto.ventas.VentaRequest;
import com.farmacia.dto.ventas.VentaResponse;
import com.farmacia.entity.Configuracion;
import com.farmacia.entity.Lote;
import com.farmacia.entity.Producto;
import com.farmacia.entity.Usuario;
import com.farmacia.entity.enums.MetodoPago;
import com.farmacia.exception.StockInsuficienteException;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VentaServiceTest {

    @Mock VentaRepository ventaRepository;
    @Mock DetalleVentaRepository detalleVentaRepository;
    @Mock ProductoRepository productoRepository;
    @Mock LoteRepository loteRepository;
    @Mock ClienteRepository clienteRepository;
    @Mock UsuarioRepository usuarioRepository;
    @Mock AuditoriaSessionService auditoriaSessionService;
    @Mock CajaSesionRepository cajaSesionRepository;
    @Mock MovimientoCajaRepository movimientoCajaRepository;
    @Mock ConfiguracionRepository configuracionRepository;

    @InjectMocks VentaService ventaService;

    private Lote lote;

    @BeforeEach
    void preparar() {
        Usuario vendedor = TestSeguridad.usuario(5, "VENDEDOR");
        TestSeguridad.autenticarComo(vendedor);
        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(vendedor));
        when(ventaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(cajaSesionRepository.findByUsuarioIdAndEstado(anyLong(), any())).thenReturn(Optional.empty());
        when(configuracionRepository.findByClave("iva_porcentaje"))
                .thenReturn(Optional.of(Configuracion.builder().clave("iva_porcentaje").valor("19").build()));
    }

    @AfterEach
    void limpiar() {
        TestSeguridad.limpiar();
    }

    private Producto producto(long id, String precio, boolean gravaIva) {
        Producto p = Producto.builder().id(id).nombre("Producto " + id)
                .precioVenta(new BigDecimal(precio)).requiereReceta(false).gravaIva(gravaIva).build();
        when(productoRepository.findById(id)).thenReturn(Optional.of(p));
        lote = Lote.builder().id(id * 10).producto(p).numeroLote("L" + id)
                .fechaVencimiento(LocalDate.now().plusYears(1)).cantidadActual(10).build();
        when(loteRepository.buscarLotesDisponiblesFEFO(id)).thenReturn(List.of(lote));
        return p;
    }

    private VentaRequest venta(long productoId, int cantidad, String descuento) {
        DetalleVentaRequest d = new DetalleVentaRequest();
        d.setProductoId(productoId);
        d.setCantidad(cantidad);
        VentaRequest r = new VentaRequest();
        r.setMetodoPago(MetodoPago.EFECTIVO);
        r.setDescuento(descuento == null ? null : new BigDecimal(descuento));
        r.setDetalles(List.of(d));
        return r;
    }

    @Test
    void descuentaStockDelLote() {
        producto(1, "1000", false);
        VentaResponse r = ventaService.registrarVenta(venta(1, 3, null));
        assertThat(lote.getCantidadActual()).isEqualTo(7);
        assertThat(r.getTotal()).isEqualByComparingTo("3000");
    }

    @Test
    void rechazaVentaSinStockSuficiente() {
        producto(1, "1000", false);
        assertThatThrownBy(() -> ventaService.registrarVenta(venta(1, 50, null)))
                .isInstanceOf(StockInsuficienteException.class);
    }

    @Test
    void rechazaDescuentoMayorAlSubtotal() {
        producto(1, "1000", false);
        assertThatThrownBy(() -> ventaService.registrarVenta(venta(1, 1, "5000")))
                .isInstanceOf(ValidacionNegocioException.class);
    }

    @Test
    void productoSinIvaNoGeneraImpuesto() {
        producto(1, "1190", false);
        VentaResponse r = ventaService.registrarVenta(venta(1, 1, null));
        assertThat(r.getImpuesto()).isEqualByComparingTo("0");
    }

    @Test
    void ivaIncluidoSeDesglosaSinCambiarElTotal() {
        // 1190 con IVA del 19% incluido = 1000 base + 190 de IVA.
        producto(1, "1190", true);
        VentaResponse r = ventaService.registrarVenta(venta(1, 1, null));
        assertThat(r.getTotal()).isEqualByComparingTo("1190");
        assertThat(r.getImpuesto()).isEqualByComparingTo("190");
    }

    @Test
    void elDescuentoReduceElIvaEnProporcion() {
        // 2380 - 10% (238) = 2142 pagados; IVA incluido = 2142 * 19 / 119 = 342.
        producto(1, "1190", true);
        VentaResponse r = ventaService.registrarVenta(venta(1, 2, "238"));
        assertThat(r.getTotal()).isEqualByComparingTo("2142");
        assertThat(r.getImpuesto()).isEqualByComparingTo("342");
    }
}

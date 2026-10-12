package com.farmacia.service;

import com.farmacia.dto.reportes.AuditoriaDTO;
import com.farmacia.dto.reportes.ProductoProximoVencerDTO;
import com.farmacia.dto.reportes.ProductoStockBajoDTO;
import com.farmacia.entity.Lote;
import com.farmacia.entity.Producto;
import com.farmacia.repository.ConfiguracionRepository;
import com.farmacia.repository.LoteRepository;
import com.farmacia.repository.ProductoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReporteService {

    private final LoteRepository loteRepository;
    private final ProductoRepository productoRepository;
    private final ConfiguracionRepository configuracionRepository;
    private final AuditoriaService auditoriaService;

    // Usa la configuracion "dias_alerta_vencimiento" cargada en el
    // esquema inicial (farmacy_schema.sql), con 30 como valor por defecto.
    public List<ProductoProximoVencerDTO> productosProximosAVencer() {
        int diasAlerta = configuracionRepository.findByClave("dias_alerta_vencimiento")
                .map(c -> Integer.parseInt(c.getValor()))
                .orElse(30);

        LocalDate fechaLimite = LocalDate.now().plusDays(diasAlerta);

        return loteRepository.buscarProximosAVencer(fechaLimite).stream()
                .map(lote -> ProductoProximoVencerDTO.builder()
                        .loteId(lote.getId())
                        .numeroLote(lote.getNumeroLote())
                        .productoId(lote.getProducto().getId())
                        .productoNombre(lote.getProducto().getNombre())
                        .cantidadActual(lote.getCantidadActual())
                        .fechaVencimiento(lote.getFechaVencimiento())
                        .diasParaVencer(ChronoUnit.DAYS.between(LocalDate.now(), lote.getFechaVencimiento()))
                        .build())
                .toList();
    }

    // Lotes que VencimientoScheduler ya marco como "en mal estado"
    // (excluidos de la venta, ver LoteRepository.buscarLotesDisponiblesFEFO).
    // A diferencia de productosProximosAVencer() (que es solo una alerta
    // informativa), esta lista es la de lotes que YA dejaron de venderse
    // y estan esperando que el staff los revise (dar de baja, devolver al
    // proveedor, etc).
    public List<ProductoProximoVencerDTO> productosEnMalEstado() {
        return loteRepository.buscarEnMalEstado().stream()
                .map(lote -> ProductoProximoVencerDTO.builder()
                        .loteId(lote.getId())
                        .numeroLote(lote.getNumeroLote())
                        .productoId(lote.getProducto().getId())
                        .productoNombre(lote.getProducto().getNombre())
                        .cantidadActual(lote.getCantidadActual())
                        .fechaVencimiento(lote.getFechaVencimiento())
                        .diasParaVencer(ChronoUnit.DAYS.between(LocalDate.now(), lote.getFechaVencimiento()))
                        .build())
                .toList();
    }

    public List<ProductoStockBajoDTO> productosConStockBajo() {
        return productoRepository.findByActivoTrue().stream()
                .map(producto -> {
                    int stockActual = (int) loteRepository.sumarStockVendible(producto.getId());
                    return new Object[]{producto, stockActual};
                })
                .filter(arr -> (int) arr[1] <= ((Producto) arr[0]).getStockMinimo())
                .map(arr -> {
                    Producto p = (Producto) arr[0];
                    return ProductoStockBajoDTO.builder()
                            .productoId(p.getId())
                            .productoNombre(p.getNombre())
                            .stockActual((int) arr[1])
                            .stockMinimo(p.getStockMinimo())
                            .build();
                })
                .toList();
    }

    // Delegado a AuditoriaService para que el filtrado de campos sensibles
    // (password_hash) se haga en un solo lugar.
    public List<AuditoriaDTO> historialDeRegistro(String tabla, Long registroId) {
        return auditoriaService.historialDeRegistro(tabla, registroId);
    }
}

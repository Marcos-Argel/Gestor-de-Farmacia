package com.farmacia.controller;

import com.farmacia.dto.reportes.AuditoriaDTO;
import com.farmacia.dto.reportes.ProductoProximoVencerDTO;
import com.farmacia.dto.reportes.ProductoStockBajoDTO;
import com.farmacia.service.ReporteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reportes")
@RequiredArgsConstructor
public class ReporteController {

    private final ReporteService reporteService;

    @GetMapping("/proximos-a-vencer")
    public List<ProductoProximoVencerDTO> proximosAVencer() {
        return reporteService.productosProximosAVencer();
    }

    // Lotes ya excluidos de la venta por vencimiento (ver
    // VencimientoScheduler.java) -- a diferencia de /proximos-a-vencer,
    // esta lista es de lotes que YA NO se pueden vender.
    @GetMapping("/mal-estado")
    public List<ProductoProximoVencerDTO> malEstado() {
        return reporteService.productosEnMalEstado();
    }

    @GetMapping("/stock-bajo")
    public List<ProductoStockBajoDTO> stockBajo() {
        return reporteService.productosConStockBajo();
    }

    @GetMapping("/auditoria")
    public List<AuditoriaDTO> auditoria(@RequestParam String tabla, @RequestParam Long registroId) {
        return reporteService.historialDeRegistro(tabla, registroId);
    }
}

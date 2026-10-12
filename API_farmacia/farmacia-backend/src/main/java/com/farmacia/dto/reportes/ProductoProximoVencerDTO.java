package com.farmacia.dto.reportes;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
@AllArgsConstructor
public class ProductoProximoVencerDTO {
    private Long loteId;
    private String numeroLote;
    private Long productoId;
    private String productoNombre;
    private Integer cantidadActual;
    private LocalDate fechaVencimiento;
    private Long diasParaVencer;
}

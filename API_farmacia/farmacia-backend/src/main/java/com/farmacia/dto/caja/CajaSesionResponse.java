package com.farmacia.dto.caja;

import com.farmacia.entity.enums.EstadoCaja;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class CajaSesionResponse {
    private Long id;
    private String usuarioNombre;
    private OffsetDateTime fechaApertura;
    private BigDecimal montoApertura;
    private OffsetDateTime fechaCierre;
    private BigDecimal montoCierreEsperado;
    private BigDecimal montoCierreReal;
    private BigDecimal diferencia;
    private EstadoCaja estado;
    private String observaciones;
    private List<MovimientoCajaResponse> movimientos;
}

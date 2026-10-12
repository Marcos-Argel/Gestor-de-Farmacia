package com.farmacia.service;

import com.farmacia.dto.caja.*;
import com.farmacia.entity.CajaSesion;
import com.farmacia.entity.MovimientoCaja;
import com.farmacia.entity.Usuario;
import com.farmacia.entity.enums.EstadoCaja;
import com.farmacia.entity.enums.TipoMovimientoCaja;
import com.farmacia.exception.RecursoNoEncontradoException;
import com.farmacia.exception.ValidacionNegocioException;
import com.farmacia.repository.CajaSesionRepository;
import com.farmacia.repository.MovimientoCajaRepository;
import com.farmacia.repository.UsuarioRepository;
import com.farmacia.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CajaService {

    private final CajaSesionRepository cajaSesionRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaSessionService auditoriaSessionService;

    @Transactional
    public CajaSesionResponse abrirCaja(AbrirCajaRequest request) {
        Long usuarioId = SecurityUtils.obtenerUsuarioActualId();
        auditoriaSessionService.establecerUsuarioActual(usuarioId);

        // No permitir abrir una segunda caja si el usuario ya tiene una abierta.
        cajaSesionRepository.findByUsuarioIdAndEstado(usuarioId, EstadoCaja.ABIERTA)
                .ifPresent(c -> { throw new ValidacionNegocioException("Ya tienes una caja abierta (sesion #" + c.getId() + "). Ciérrala antes de abrir otra."); });

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));

        CajaSesion sesion = CajaSesion.builder()
                .usuario(usuario)
                .montoApertura(request.getMontoApertura())
                .estado(EstadoCaja.ABIERTA)
                .build();
        sesion = cajaSesionRepository.save(sesion);

        // Registrar el movimiento inicial de apertura para el historial.
        MovimientoCaja apertura = MovimientoCaja.builder()
                .cajaSesion(sesion)
                .tipo(TipoMovimientoCaja.APERTURA)
                .monto(request.getMontoApertura())
                .concepto("Apertura de caja")
                .build();
        movimientoCajaRepository.save(apertura);

        return construirResponse(sesion);
    }

    @Transactional
    public CajaSesionResponse registrarMovimiento(Long sesionId, MovimientoCajaRequest request) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());
        CajaSesion sesion = obtenerSesionAbiertaPropia(sesionId);

        // APERTURA, VENTA y CIERRE los registra el sistema solo. Si se
        // aceptaran a mano, alguien podria inventar una "VENTA" para
        // cuadrar la caja.
        if (request.getTipo() != TipoMovimientoCaja.INGRESO && request.getTipo() != TipoMovimientoCaja.EGRESO) {
            throw new ValidacionNegocioException("Solo se pueden registrar movimientos manuales de INGRESO o EGRESO");
        }

        MovimientoCaja movimiento = MovimientoCaja.builder()
                .cajaSesion(sesion)
                .tipo(request.getTipo())
                .monto(request.getMonto())
                .concepto(request.getConcepto())
                .build();
        movimientoCajaRepository.save(movimiento);

        return construirResponse(sesion);
    }

    @Transactional
    public CajaSesionResponse cerrarCaja(Long sesionId, CerrarCajaRequest request) {
        auditoriaSessionService.establecerUsuarioActual(SecurityUtils.obtenerUsuarioActualId());
        CajaSesion sesion = obtenerSesionAbiertaPropia(sesionId);

        BigDecimal montoEsperado = calcularMontoEsperado(sesion);

        sesion.setMontoCierreEsperado(montoEsperado);
        sesion.setMontoCierreReal(request.getMontoCierreReal());
        sesion.setDiferencia(request.getMontoCierreReal().subtract(montoEsperado));
        sesion.setObservaciones(request.getObservaciones());
        sesion.setEstado(EstadoCaja.CERRADA);
        sesion.setFechaCierre(java.time.OffsetDateTime.now());
        sesion = cajaSesionRepository.save(sesion);

        MovimientoCaja cierre = MovimientoCaja.builder()
                .cajaSesion(sesion)
                .tipo(TipoMovimientoCaja.CIERRE)
                .monto(request.getMontoCierreReal())
                .concepto("Cierre de caja")
                .build();
        movimientoCajaRepository.save(cierre);

        return construirResponse(sesion);
    }

    public CajaSesionResponse buscarPorId(Long id) {
        return construirResponse(obtenerSesion(id));
    }

    // Le permite al frontend preguntar "¿tengo una caja abierta ahora
    // mismo?" sin conocer de antemano el ID de sesion. Devuelve null si
    // no hay ninguna abierta para el usuario autenticado.
    public CajaSesionResponse buscarSesionAbiertaDelUsuarioActual() {
        Long usuarioId = SecurityUtils.obtenerUsuarioActualId();
        return cajaSesionRepository.findByUsuarioIdAndEstado(usuarioId, EstadoCaja.ABIERTA)
                .map(this::construirResponse)
                .orElse(null);
    }

    // Historial de TODAS las cajas (abiertas y cerradas, de cualquier
    // usuario) -- antes no habia forma de ver quien abrio/cerro cada
    // turno ni cuanto dio de diferencia; quedaba "perdido" apenas se
    // cerraba la caja.
    public List<CajaSesionResponse> listarHistorial() {
        return cajaSesionRepository.findAllByOrderByFechaAperturaDesc()
                .stream()
                .map(this::construirResponse)
                .toList();
    }

    private BigDecimal calcularMontoEsperado(CajaSesion sesion) {
        List<MovimientoCaja> movimientos = movimientoCajaRepository.findByCajaSesionId(sesion.getId());
        BigDecimal total = sesion.getMontoApertura();
        for (MovimientoCaja m : movimientos) {
            switch (m.getTipo()) {
                case INGRESO, VENTA -> total = total.add(m.getMonto());
                case EGRESO -> total = total.subtract(m.getMonto());
                default -> { /* APERTURA y CIERRE no afectan el calculo aqui */ }
            }
        }
        return total;
    }

    // Antes cualquier VENDEDOR podia registrar movimientos o cerrar la caja
    // de OTRO usuario con solo conocer el id de la sesion. Ahora solo el
    // dueno de la caja, o un ADMIN/GERENTE (para cerrar una caja olvidada).
    private CajaSesion obtenerSesionAbiertaPropia(Long id) {
        CajaSesion sesion = obtenerSesion(id);
        if (sesion.getEstado() != EstadoCaja.ABIERTA) {
            throw new ValidacionNegocioException("Esta sesion de caja ya esta cerrada");
        }
        String rol = SecurityUtils.obtenerRolActual();
        boolean esSupervisor = "ADMIN".equals(rol) || "GERENTE".equals(rol);
        if (!esSupervisor && !sesion.getUsuario().getId().equals(SecurityUtils.obtenerUsuarioActualId())) {
            throw new ValidacionNegocioException("Esta caja pertenece a otro usuario");
        }
        return sesion;
    }

    private CajaSesion obtenerSesion(Long id) {
        return cajaSesionRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sesion de caja no encontrada: " + id));
    }

    private CajaSesionResponse construirResponse(CajaSesion sesion) {
        List<MovimientoCajaResponse> movimientos = movimientoCajaRepository.findByCajaSesionId(sesion.getId())
                .stream()
                .map(m -> MovimientoCajaResponse.builder()
                        .id(m.getId())
                        .tipo(m.getTipo())
                        .monto(m.getMonto())
                        .concepto(m.getConcepto())
                        .ventaId(m.getVenta() != null ? m.getVenta().getId() : null)
                        .fecha(m.getFecha())
                        .build())
                .toList();

        return CajaSesionResponse.builder()
                .id(sesion.getId())
                .usuarioNombre(sesion.getUsuario().getNombre())
                .fechaApertura(sesion.getFechaApertura())
                .montoApertura(sesion.getMontoApertura())
                .fechaCierre(sesion.getFechaCierre())
                .montoCierreEsperado(sesion.getMontoCierreEsperado())
                .montoCierreReal(sesion.getMontoCierreReal())
                .diferencia(sesion.getDiferencia())
                .estado(sesion.getEstado())
                .observaciones(sesion.getObservaciones())
                .movimientos(movimientos)
                .build();
    }
}

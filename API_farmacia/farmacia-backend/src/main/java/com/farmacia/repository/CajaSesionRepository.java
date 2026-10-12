package com.farmacia.repository;

import com.farmacia.entity.CajaSesion;
import com.farmacia.entity.enums.EstadoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CajaSesionRepository extends JpaRepository<CajaSesion, Long> {
    // Util para validar que un usuario no abra dos cajas a la vez.
    Optional<CajaSesion> findByUsuarioIdAndEstado(Long usuarioId, EstadoCaja estado);

    // Historial completo (todas las cajas, de todos los usuarios), la mas
    // reciente primero -- para el listado que faltaba en la pantalla de Caja.
    java.util.List<CajaSesion> findAllByOrderByFechaAperturaDesc();
}

package com.farmacia.repository;

import com.farmacia.entity.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;

public interface VentaRepository extends JpaRepository<Venta, Long> {
    List<Venta> findAllByOrderByFechaDesc();
    List<Venta> findByFechaBetween(OffsetDateTime desde, OffsetDateTime hasta);
    List<Venta> findByClienteId(Long clienteId);
    List<Venta> findByUsuarioId(Long usuarioId);
}

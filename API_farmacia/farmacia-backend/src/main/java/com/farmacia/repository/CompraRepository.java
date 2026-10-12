package com.farmacia.repository;

import com.farmacia.entity.Compra;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CompraRepository extends JpaRepository<Compra, Long> {
    List<Compra> findByProveedorId(Long proveedorId);

    // Antes se usaba findAll() (orden de insercion / ID ascendente), por lo
    // que la compra mas nueva quedaba siempre al final de la lista y era
    // dificil ubicar una fecha especifica. Ahora se trae ya ordenada por
    // fecha descendente (la mas reciente primero).
    List<Compra> findAllByOrderByFechaDesc();
}
package com.farmacia.repository;

import com.farmacia.entity.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByActivoTrue();
    Optional<Producto> findByCodigoBarras(String codigoBarras);
    List<Producto> findByNombreContainingIgnoreCase(String nombre);
}

package com.farmacia.repository;

import com.farmacia.entity.Devolucion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DevolucionRepository extends JpaRepository<Devolucion, Long> {

    // Antes se usaba findAll() (orden de insercion), lo que dejaba la
    // devolucion mas nueva al final de la lista. Ahora se ordena por fecha
    // descendente (la mas reciente primero) para que sea mas facil de leer.
    List<Devolucion> findAllByOrderByFechaDesc();

    // Cuanto de un producto ya se devolvio contra una venta/compra -- para
    // no permitir devolver mas de lo que realmente se vendio/compro.
    @Query("SELECT COALESCE(SUM(d.cantidad), 0) FROM Devolucion d WHERE d.venta.id = :ventaId AND d.producto.id = :productoId")
    long sumarDevueltoDeVenta(@Param("ventaId") Long ventaId, @Param("productoId") Long productoId);

    @Query("SELECT COALESCE(SUM(d.cantidad), 0) FROM Devolucion d WHERE d.compra.id = :compraId AND d.producto.id = :productoId")
    long sumarDevueltoDeCompra(@Param("compraId") Long compraId, @Param("productoId") Long productoId);
}

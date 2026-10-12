package com.farmacia.repository;

import com.farmacia.entity.Lote;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface LoteRepository extends JpaRepository<Lote, Long> {

    // Consulta clave para FEFO: trae los lotes con stock disponible de un
    // producto, ordenados por fecha de vencimiento ascendente (el que
    // vence primero, primero en la lista). PESSIMISTIC_WRITE bloquea esas
    // filas hasta que termine la transaccion que las use, evitando que dos
    // ventas simultaneas descuenten el mismo stock (condicion de carrera).
    // "en_mal_estado = false" es lo que impide vender lotes vencidos o a
    // punto de vencer (ver VencimientoScheduler, que es quien marca esa
    // columna) -- antes de esto, la consulta no filtraba por vencimiento
    // en absoluto.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM Lote l WHERE l.producto.id = :productoId AND l.cantidadActual > 0 " +
           "AND l.enMalEstado = false ORDER BY l.fechaVencimiento ASC")
    List<Lote> buscarLotesDisponiblesFEFO(@Param("productoId") Long productoId);

    // Stock que de verdad se puede vender: excluye los lotes dados de baja
    // por vencimiento. Antes el stock mostrado sumaba TODOS los lotes, asi
    // que un producto con todo vencido aparecia "con stock" en Ventas.
    @Query("SELECT COALESCE(SUM(l.cantidadActual), 0) FROM Lote l WHERE l.producto.id = :productoId " +
           "AND l.cantidadActual > 0 AND l.enMalEstado = false")
    long sumarStockVendible(@Param("productoId") Long productoId);

    // Para el modulo de Reportes: lotes proximos a vencer (alerta configurable).
    // Solo los que todavia se venden -- los ya dados de baja van en
    // buscarEnMalEstado(), antes salian mezclados aqui con dias negativos.
    @Query("SELECT l FROM Lote l WHERE l.cantidadActual > 0 AND l.enMalEstado = false " +
           "AND l.fechaVencimiento <= :fechaLimite ORDER BY l.fechaVencimiento ASC")
    List<Lote> buscarProximosAVencer(@Param("fechaLimite") LocalDate fechaLimite);

    // Para "Reportes > Productos en mal estado": lotes ya marcados, que
    // todavia tienen stock sin dar de baja formalmente.
    @Query("SELECT l FROM Lote l WHERE l.enMalEstado = true AND l.cantidadActual > 0 " +
           "ORDER BY l.fechaVencimiento ASC")
    List<Lote> buscarEnMalEstado();

    // Usado por VencimientoScheduler para marcar en mal estado los lotes
    // que llegaron a la fecha limite y todavia no estaban marcados.
    @Query("SELECT l FROM Lote l WHERE l.cantidadActual > 0 AND l.enMalEstado = false " +
           "AND l.fechaVencimiento <= :fechaLimite")
    List<Lote> buscarParaMarcarEnMalEstado(@Param("fechaLimite") LocalDate fechaLimite);

    List<Lote> findByProductoIdAndCantidadActualGreaterThan(Long productoId, Integer cantidad);
}

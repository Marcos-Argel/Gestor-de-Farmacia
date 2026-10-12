package com.farmacia.repository;

import com.farmacia.entity.Auditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface AuditoriaRepository extends JpaRepository<Auditoria, Long> {
    List<Auditoria> findByTablaAfectadaAndRegistroIdOrderByFechaDesc(String tablaAfectada, Long registroId);

    // Trae la auditoria completa paginada, mas reciente primero -- el listado
    // general para la pantalla de Auditoria del frontend. LEFT JOIN FETCH
    // (no INNER) porque `usuario` puede ser null cuando el trigger no tuvo
    // un usuario de sesion asociado al cambio. Se hace explicito con @Query
    // en vez de confiar en OSIV, para no repetir el mismo bug de
    // LazyInitializationException que tuvimos con Usuario.rol.
    @Query(
        value = "SELECT a FROM Auditoria a LEFT JOIN FETCH a.usuario ORDER BY a.fecha DESC",
        countQuery = "SELECT COUNT(a) FROM Auditoria a"
    )
    Page<Auditoria> findAllByOrderByFechaDesc(Pageable pageable);
}

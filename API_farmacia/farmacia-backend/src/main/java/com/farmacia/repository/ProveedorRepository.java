package com.farmacia.repository;

import com.farmacia.entity.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {
    List<Proveedor> findByActivoTrue();
    List<Proveedor> findByNombreContactoContainingIgnoreCaseOrEmpresaContainingIgnoreCase(String nombre, String empresa);
}

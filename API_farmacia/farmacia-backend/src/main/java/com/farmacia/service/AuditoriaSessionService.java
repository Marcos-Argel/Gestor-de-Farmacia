package com.farmacia.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;

// Le dice a PostgreSQL "esta transaccion la esta haciendo este usuario",
// para que el trigger fn_auditoria() (definido en farmacy_triggers.sql)
// pueda registrar quien hizo cada cambio en productos/lotes.
//
// IMPORTANTE: debe llamarse DENTRO de un metodo @Transactional, porque
// SET LOCAL solo dura mientras dure esa transaccion especifica.
@Service
public class AuditoriaSessionService {

    @PersistenceContext
    private EntityManager entityManager;

    public void establecerUsuarioActual(Long usuarioId) {
        entityManager.createNativeQuery("SELECT set_config('app.current_user_id', :usuarioId, true)")
                .setParameter("usuarioId", String.valueOf(usuarioId))
                .getSingleResult();
    }
}

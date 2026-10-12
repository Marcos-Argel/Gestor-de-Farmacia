package com.farmacia.scheduler;

import com.farmacia.entity.Lote;
import com.farmacia.repository.ConfiguracionRepository;
import com.farmacia.repository.LoteRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

// Encargado de que un producto que esta por vencerse (o ya vencio) deje
// de venderse solo, sin que nadie tenga que acordarse de revisarlo a
// mano. Antes de esto, el sistema no tenia ningun control: un lote
// vencido se seguia vendiendo igual que uno nuevo.
//
// Regla: cuando a un lote le quedan "dias_alerta_mal_estado" dias o menos
// para vencer (15 por defecto, configurable en Configuracion), se marca
// Lote.enMalEstado = true. Eso lo saca de
// LoteRepository.buscarLotesDisponiblesFEFO (no se puede vender mas) y lo
// hace aparecer en Reportes > Productos en mal estado, para que el staff
// decida si lo da de baja formalmente (Devoluciones) o lo retira.
//
// Corre cada hora (antes solo a medianoche: un lote podia pasar casi un
// dia entero vendiendose despues de cumplir la regla), al arrancar la app
// (@PostConstruct) y apenas se cambia "dias_alerta_mal_estado" en
// Configuracion (ver ConfiguracionService).
@Slf4j
@Component
@RequiredArgsConstructor
public class VencimientoScheduler {

    public static final int DIAS_POR_DEFECTO = 15;

    private final LoteRepository loteRepository;
    private final ConfiguracionRepository configuracionRepository;

    @PostConstruct
    public void alArrancar() {
        marcarLotesEnMalEstado();
    }

    @Scheduled(cron = "0 0 * * * *")
    public void tareaPorHora() {
        marcarLotesEnMalEstado();
    }

    @Transactional
    public void marcarLotesEnMalEstado() {
        int diasAlerta = diasAlertaMalEstado();
        LocalDate fechaLimite = LocalDate.now().plusDays(diasAlerta);

        List<Lote> lotes = loteRepository.buscarParaMarcarEnMalEstado(fechaLimite);
        if (lotes.isEmpty()) {
            return;
        }

        lotes.forEach(lote -> lote.setEnMalEstado(true));
        loteRepository.saveAll(lotes);

        log.info("VencimientoScheduler: {} lote(s) marcados en mal estado (vencen en {} dias o menos, o ya vencidos)",
                lotes.size(), diasAlerta);
    }

    // Tambien lo usa CompraService para no aceptar lotes que llegarian ya
    // dentro del margen de baja.
    public int diasAlertaMalEstado() {
        return configuracionRepository.findByClave("dias_alerta_mal_estado")
                .map(c -> {
                    try {
                        return Integer.parseInt(c.getValor().trim());
                    } catch (NumberFormatException ex) {
                        return DIAS_POR_DEFECTO;
                    }
                })
                .orElse(DIAS_POR_DEFECTO);
    }
}

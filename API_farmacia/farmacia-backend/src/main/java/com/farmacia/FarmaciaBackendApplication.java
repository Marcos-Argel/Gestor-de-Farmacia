package com.farmacia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling habilita los @Scheduled de VencimientoScheduler
// (marca automaticamente los lotes vencidos/proximos a vencer como "en
// mal estado" para que dejen de venderse).
@SpringBootApplication
@EnableScheduling
public class FarmaciaBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(FarmaciaBackendApplication.class, args);
    }

}

package com.farmacia.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Collections;

@Configuration
public class GoogleAuthConfig {

    // Client ID de OAuth 2.0 (Google Cloud Console). Ver
    // application.properties.example -- debe coincidir con
    // VITE_GOOGLE_CLIENT_ID del frontend.
    @Value("${app.google.client-id}")
    private String googleClientId;

    // GoogleIdTokenVerifier valida que el token que manda el frontend:
    // 1) este firmado de verdad por Google (no inventado), 2) no haya
    // vencido, y 3) haya sido emitido PARA ESTA app (audience = nuestro
    // Client ID) y no para otra app cualquiera. Se usa en
    // AuthService.loginConGoogle.
    @Bean
    public GoogleIdTokenVerifier googleIdTokenVerifier() {
        return new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }
}

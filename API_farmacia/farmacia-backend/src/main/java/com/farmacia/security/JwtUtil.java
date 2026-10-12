package com.farmacia.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    // Falla al arrancar (con un mensaje claro) si no se configuro una clave
    // valida, en vez de arrancar y explotar en el primer login -- o peor,
    // arrancar en produccion con la clave de ejemplo que esta en el repo.
    @PostConstruct
    void validarSecreto() {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "Falta JWT_SECRET (app.jwt.secret) o tiene menos de 32 caracteres. Configuralo como variable de entorno.");
        }
        if (secret.startsWith("CAMBIA_ESTO")) {
            log.warn("Se esta usando la clave JWT de ejemplo. Define JWT_SECRET antes de desplegar a produccion.");
        }
    }

    private SecretKey getKey() {
        // La clave debe tener al menos 256 bits (32 caracteres) para HS256.
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generarToken(CustomUserDetails userDetails) {
        Date ahora = new Date();
        Date expiracion = new Date(ahora.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("usuarioId", userDetails.getId())
                .claim("rol", userDetails.getUsuario().getRol().getNombre())
                .issuedAt(ahora)
                .expiration(expiracion)
                .signWith(getKey())
                .compact();
    }

    public String extraerEmail(String token) {
        return extraerClaim(token, Claims::getSubject);
    }

    public Long extraerUsuarioId(String token) {
        Claims claims = extraerTodosLosClaims(token);
        return claims.get("usuarioId", Long.class);
    }

    public boolean esTokenValido(String token, CustomUserDetails userDetails) {
        String email = extraerEmail(token);
        return email.equals(userDetails.getUsername()) && !haExpirado(token);
    }

    private boolean haExpirado(String token) {
        return extraerClaim(token, Claims::getExpiration).before(new Date());
    }

    private <T> T extraerClaim(String token, Function<Claims, T> resolver) {
        Claims claims = extraerTodosLosClaims(token);
        return resolver.apply(claims);
    }

    private Claims extraerTodosLosClaims(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}

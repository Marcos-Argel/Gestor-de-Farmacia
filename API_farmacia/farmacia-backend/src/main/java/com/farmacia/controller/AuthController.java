package com.farmacia.controller;

import com.farmacia.dto.auth.AuthResponse;
import com.farmacia.dto.auth.GoogleLoginRequest;
import com.farmacia.dto.auth.LoginRequest;
import com.farmacia.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// El sistema es de uso interno: ya no hay registro publico (/register).
// Las cuentas del personal se crean desde la pantalla Usuarios.
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // "Iniciar sesion con Google": solo para empleados que ya tienen cuenta.
    @PostMapping("/google")
    public ResponseEntity<AuthResponse> loginConGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(authService.loginConGoogle(request));
    }
}

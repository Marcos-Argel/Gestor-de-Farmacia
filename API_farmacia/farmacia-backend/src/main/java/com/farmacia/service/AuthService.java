package com.farmacia.service;

import com.farmacia.dto.auth.AuthResponse;
import com.farmacia.dto.auth.GoogleLoginRequest;
import com.farmacia.dto.auth.LoginRequest;
import com.farmacia.entity.Usuario;
import com.farmacia.exception.CredencialesInvalidasException;
import com.farmacia.repository.UsuarioRepository;
import com.farmacia.security.CustomUserDetails;
import com.farmacia.security.JwtUtil;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;

// El sistema es de uso interno: solo inicia sesion el personal de la
// farmacia. Ya no hay registro publico ni rol CLIENTE con portal propio;
// las cuentas se crean desde la pantalla Usuarios (ADMIN/GERENTE).
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String MENSAJE_INACTIVO = "Tu usuario esta desactivado. Contacta a un administrador.";
    private static final String MENSAJE_SIN_ACCESO = "Esta cuenta no tiene acceso al sistema.";

    private final UsuarioRepository usuarioRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (DisabledException ex) {
            // Antes un usuario desactivado caia en el handler generico y
            // veia "Error interno del servidor" (500) en vez de un mensaje claro.
            throw new CredencialesInvalidasException(MENSAJE_INACTIVO);
        } catch (AuthenticationException ex) {
            throw new CredencialesInvalidasException("Email o contrasena incorrectos");
        }

        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new CredencialesInvalidasException("Email o contrasena incorrectos"));
        validarEsPersonal(usuario);

        return construirRespuesta(usuario);
    }

    // "Iniciar sesion con Google". Recibe el ID token que genera el boton
    // de Google Identity Services y lo verifica contra Google (firma,
    // vigencia y que sea para nuestro Client ID) antes de confiar en el.
    //
    // Antes, si el email no existia se creaba una cuenta CLIENTE
    // automaticamente. Ahora solo entra quien ya es empleado: el email de
    // Google debe coincidir con el de un usuario creado en Usuarios.
    @Transactional
    public AuthResponse loginConGoogle(GoogleLoginRequest request) {
        GoogleIdToken.Payload payload = verificarTokenGoogle(request.getIdToken());

        String email = payload.getEmail();
        if (email == null || Boolean.FALSE.equals(payload.getEmailVerified())) {
            throw new CredencialesInvalidasException("La cuenta de Google no tiene un email verificado");
        }

        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new CredencialesInvalidasException(
                        "El correo " + email + " no esta registrado como empleado. Pide a un administrador que te cree el usuario."));

        if (!Boolean.TRUE.equals(usuario.getActivo())) {
            throw new CredencialesInvalidasException(MENSAJE_INACTIVO);
        }
        validarEsPersonal(usuario);

        // Si la cuenta todavia no tenia foto, se completa con la de Google.
        String foto = (String) payload.get("picture");
        if (usuario.getFotoUrl() == null && foto != null) {
            usuario.setFotoUrl(foto);
            usuario = usuarioRepository.save(usuario);
        }

        return construirRespuesta(usuario);
    }

    // Cuentas CLIENTE creadas antes (con el registro publico que ya no
    // existe) no tienen nada que hacer en el panel interno.
    private void validarEsPersonal(Usuario usuario) {
        if ("CLIENTE".equals(usuario.getRol().getNombre())) {
            throw new CredencialesInvalidasException(MENSAJE_SIN_ACCESO);
        }
    }

    private AuthResponse construirRespuesta(Usuario usuario) {
        String token = jwtUtil.generarToken(new CustomUserDetails(usuario));
        return AuthResponse.builder()
                .token(token)
                .email(usuario.getEmail())
                .nombre(usuario.getNombre())
                .rol(usuario.getRol().getNombre())
                .fotoUrl(usuario.getFotoUrl())
                .build();
    }

    private GoogleIdToken.Payload verificarTokenGoogle(String idTokenStr) {
        try {
            GoogleIdToken idToken = googleIdTokenVerifier.verify(idTokenStr);
            if (idToken == null) {
                throw new CredencialesInvalidasException("Token de Google invalido o vencido");
            }
            return idToken.getPayload();
        } catch (GeneralSecurityException | IOException | IllegalArgumentException ex) {
            throw new CredencialesInvalidasException("No se pudo verificar el token de Google");
        }
    }
}

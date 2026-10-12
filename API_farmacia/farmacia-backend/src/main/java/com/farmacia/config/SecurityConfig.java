package com.farmacia.config;

import com.farmacia.security.CustomUserDetailsService;
import com.farmacia.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Sin token (o con uno vencido/invalido, o de un usuario
                // desactivado) Spring respondia 403, y el frontend solo cierra
                // la sesion ante un 401 -- el usuario quedaba "pegado" en
                // pantallas que fallaban. 401 = "no se quien eres"; 403 queda
                // para "se quien eres pero no tienes permiso".
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        // /error es a donde Spring reenvia internamente los errores
                        // (ej. un 403). Si no es publico, ese reenvio se trata como
                        // anonimo y TODO error terminaba convertido en 401.
                        .requestMatchers("/error").permitAll()
                        // Datos de la farmacia para imprimir facturas: los lee cualquier empleado.
                        .requestMatchers(HttpMethod.GET, "/api/configuracion/negocio")
                        .hasAnyRole("ADMIN", "GERENTE", "VENDEDOR", "INVENTARIO")
                        // ADMIN y GERENTE: gestion de usuarios, configuracion global y auditoria.
                        // (GERENTE puede crear/editar usuarios, pero la restriccion de que NO
                        // pueda asignar rol ADMIN/GERENTE se valida en UsuarioService, no aqui,
                        // porque a nivel de endpoint ambos roles SI pueden entrar al modulo).
                        // /api/reportes/auditoria tambien: es el historial de cambios de un
                        // registro (incluida la tabla usuarios) -- antes caia en la regla
                        // general de /api/reportes/** y lo podia ver un VENDEDOR.
                        .requestMatchers("/api/usuarios/**", "/api/configuracion/**", "/api/auditoria/**",
                                "/api/reportes/auditoria/**")
                        .hasAnyRole("ADMIN", "GERENTE")
                        // IMPORTANTE: leer productos (buscar/escanear para vender) lo necesita
                        // tambien VENDEDOR, no solo quien administra inventario -- si no, no
                        // podria ni siquiera armar una venta. Por eso el GET va aparte, mas
                        // permisivo, y las escrituras (crear/editar/borrar producto) quedan
                        // reservadas solo para quien gestiona inventario.
                        .requestMatchers(HttpMethod.GET, "/api/productos/**")
                        .hasAnyRole("ADMIN", "GERENTE", "VENDEDOR", "INVENTARIO")
                        // Categorias tambien se necesitan en modo lectura desde Ventas/Inventario
                        // por igual (para mostrar el nombre de la categoria de cada producto).
                        .requestMatchers(HttpMethod.GET, "/api/categorias/**")
                        .hasAnyRole("ADMIN", "GERENTE", "VENDEDOR", "INVENTARIO")
                        // Inventario: crear/editar productos, categorias, proveedores y compras (crea lotes).
                        .requestMatchers("/api/productos/**", "/api/categorias/**", "/api/proveedores/**", "/api/compras/**")
                        .hasAnyRole("ADMIN", "GERENTE", "INVENTARIO")
                        // Caja: antes era del rol CAJERO, pero se elimino ese rol porque hacia lo
                        // mismo que VENDEDOR (ver migracion de roles) -- ahora VENDEDOR cubre caja.
                        .requestMatchers("/api/caja/**").hasAnyRole("ADMIN", "GERENTE", "VENDEDOR")
                        // Ventas y clientes: rol operativo VENDEDOR (incluye lo que antes hacia CAJERO).
                        .requestMatchers("/api/ventas/**", "/api/clientes/**").hasAnyRole("ADMIN", "GERENTE", "VENDEDOR")
                        // Devoluciones: pueden originarse en una venta o en una compra a proveedor,
                        // asi que se deja abierto a los roles operativos.
                        .requestMatchers("/api/devoluciones/**").hasAnyRole("ADMIN", "GERENTE", "VENDEDOR", "INVENTARIO")
                        // Reportes: son de solo lectura, pero son informacion del negocio
                        // (ventas, finanzas) -- no se abren a "cualquier autenticado" porque
                        // eso incluiria cualquier rol nuevo que se cree a futuro.
                        .requestMatchers("/api/reportes/**").hasAnyRole("ADMIN", "GERENTE", "VENDEDOR", "INVENTARIO")
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Lista de origenes permitidos separada por comas, configurable via la
    // variable de entorno CORS_ALLOWED_ORIGINS -- asi no hay que tocar
    // codigo ni recompilar cuando el frontend se despliegue a su dominio
    // final (ej. Render). En local, si no se define la variable, cae en
    // los valores de siempre (Vite en :5173, CRA en :3000).
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String corsAllowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origenes = Arrays.stream(corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(o -> !o.isBlank())
                .toList();
        config.setAllowedOrigins(origenes);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
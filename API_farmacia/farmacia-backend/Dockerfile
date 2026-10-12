# ============================================================
# ETAPA 1: BUILD -- compila el proyecto con Maven
# ============================================================
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copiamos primero solo el pom.xml para aprovechar el cache de Docker:
# si no cambian las dependencias, no se vuelven a descargar en cada build.
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Ahora copiamos el codigo fuente y compilamos
COPY src ./src

# El archivo real application.properties (con la contrasena local del
# desarrollador) esta excluido de la imagen via .dockerignore, por
# seguridad. En su lugar usamos la plantilla segura (solo placeholders,
# sin secretos) para que el .jar SI tenga un application.properties
# valido -- los valores reales los inyecta docker-compose via variables
# de entorno (DATABASE_URL, DATABASE_PASSWORD, JWT_SECRET, etc.).
COPY src/main/resources/application.properties.example src/main/resources/application.properties

RUN mvn clean package -DskipTests -B
# ============================================================
# ETAPA 2: RUNTIME -- imagen final, liviana, solo con el .jar
# ============================================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copiamos unicamente el .jar generado en la etapa anterior
COPY --from=build /app/target/*.jar app.jar

# Render asigna el puerto dinamicamente via la variable de entorno PORT.
# application.properties ya esta configurado para leerla (server.port=${PORT:8080}).
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

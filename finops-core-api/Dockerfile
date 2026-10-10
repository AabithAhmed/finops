# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app
COPY pom.xml .
COPY src ./src

# Download deps and build the fat jar (skip tests — they run in CI, not here)
RUN apk add --no-cache maven && \
    mvn -B package -DskipTests --no-transfer-progress

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app

# Copy only the jar — keeps image small
COPY --from=builder /app/target/*.jar app.jar

# Render injects PORT automatically; we expose it here for documentation
EXPOSE 8080

# JVM flags: container-aware heap sizing, exit cleanly on OOM
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-jar", "app.jar"]

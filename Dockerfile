# 1. Build the Vue frontend
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Build the Quarkus app, including frontend assets as static resources
FROM eclipse-temurin:21-jdk AS backend
WORKDIR /src
COPY backend/ ./
COPY --from=frontend /fe/dist/ ./src/main/resources/META-INF/resources/
RUN ./gradlew --no-daemon build -x test

# 3. Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /src/build/quarkus-app/ ./
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]

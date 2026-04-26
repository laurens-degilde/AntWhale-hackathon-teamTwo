# 1. Build the React/Vite frontend
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 2. Build the Spring Boot jar, embedding frontend assets as static resources
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /src
COPY backend/pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY backend/ ./
COPY --from=frontend /fe/dist/ ./src/main/resources/static/
RUN mvn -B -q -DskipTests package

# 3. Slim runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /src/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
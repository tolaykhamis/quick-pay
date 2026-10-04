# Production image: Angular is built and copied into the Spring Boot jar, so one container serves both on 8080.
# Build context is the repo root. The "m2local" named context is supplied by docker-compose.yml
# (additional_contexts) and points at ~/.m2/repository/com/progressoft/training, because file-parser-core
# is not on Maven Central.

# Stage 1: build the Angular app into static files.
FROM node:24 AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npx ng build

# Stage 2: build the Spring Boot jar with the Angular output inside it.
FROM maven:3.9-eclipse-temurin-25 AS backend-build
WORKDIR /build
COPY --from=m2local . /root/.m2/repository/com/progressoft/training/
COPY payments/ payments/
# Spring Boot serves classpath:/static/ at "/", so the jar needs no pom change.
COPY --from=frontend-build /frontend/dist/quickpay-frontend/browser/ payments/application/src/main/resources/static/
RUN mvn -B -f payments/pom.xml -pl application -am -DskipTests package

# Stage 3: runtime image with only the jar.
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=backend-build /build/payments/application/target/application-1.0.0-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

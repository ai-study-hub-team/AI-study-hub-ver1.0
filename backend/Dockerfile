FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /workspace

COPY pom.xml .
COPY src ./src

RUN mvn -B clean package -DskipTests

RUN JAR_FILE=$(find target -maxdepth 1 -type f -name "*.jar" ! -name "*.original" ! -name "*-plain.jar" | head -n 1) \
    && test -n "$JAR_FILE" \
    && cp "$JAR_FILE" /workspace/app.jar


FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /workspace/app.jar /app/app.jar

ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar /app/app.jar"]

package com.zut.librarynet;


import com.zut.librarynet.handlers.LibraryHandlers;
import com.zut.librarynet.services.LibraryService;
import io.javalin.Javalin;
import io.javalin.http.HttpStatus;
import io.javalin.json.JavalinJackson;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

public class Main {
    public static void main(String[] args) {
        // Initialize service and handlers
        LibraryService service = new LibraryService();
        LibraryHandlers handlers = new LibraryHandlers(service);

        // Configure Jackson for Java 8 time support
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Create Javalin app with configuration
        Javalin app = Javalin.create(config -> {
            // JSON mapper configuration
            config.jsonMapper(new JavalinJackson(objectMapper));

            // CORS configuration for React frontend
            config.plugins.enableCors(cors -> {
                cors.add(it -> {
                    it.allowHost("http://localhost:5173");
                    it.allowHost("http://localhost:3000");
                    it.allowHost("http://127.0.0.1:5173");
                    it.allowCredentials(true);
                    it.allowAllMethods = true;
                    it.allowAllHeaders = true;
                });
            });

            // Enable request logging for debugging
            config.requestLogger.http((ctx, ms) -> {
                System.out.printf("[%s] %s %s (%d ms)%n",
                        ctx.method(), ctx.path(), ctx.status(), ms);
            });

            // Enable error handling
            config.http.defaultContentType = "application/json";
        }).start(7070);

        // HEALTH CHECK ENDPOINT
        app.get("/health", ctx -> {
            ctx.status(HttpStatus.OK);
            ctx.json(java.util.Map.of(
                    "status", "OK",
                    "message", "ZUT LibraryNet API is running",
                    "timestamp", java.time.LocalDateTime.now().toString()
            ));
        });

        // STATISTICS ENDPOINT
        app.get("/api/statistics", handlers::getStatistics);

        // MEMBER ENDPOINTS
        app.post("/api/members/register", handlers::registerMember);
        app.get("/api/members/{id}", handlers::getMember);
        app.get("/api/members", handlers::getAllMembers);

        // RESOURCE ENDPOINTS
        app.post("/api/resources/add", handlers::addResource);
        app.get("/api/resources/{id}", handlers::getResource);
        app.get("/api/resources", handlers::getAllResources);

        // LOAN ENDPOINTS
        app.post("/api/loans/borrow", handlers::borrowResource);
        app.post("/api/loans/{id}/return", handlers::returnResource);
        app.get("/api/members/{id}/loans", handlers::getMemberLoans);

        // FINE ENDPOINTS
        app.get("/api/members/{id}/fines", handlers::getMemberFines);
        app.post("/api/members/{id}/fines/{fineId}/pay", handlers::payFine);

        // RESERVATION ENDPOINTS
        app.post("/api/reservations", handlers::createReservation);
        app.get("/api/members/{id}/reservations", handlers::getMemberReservations);
        app.delete("/api/reservations/{id}", handlers::cancelReservation);

        // UTILITY ENDPOINTS
        app.get("/api/resources/available", handlers::getAvailableResources);
        app.get("/api/resources/type/{type}", handlers::getResourcesByType);

        System.out.println("╔══════════════════════════════════════════════════════════╗");
        System.out.println("║     ZUT LibraryNet API - Running on http://localhost:7070    ║");
        System.out.println("║                                                            ║");
        System.out.println("║  Endpoints:                                                ║");
        System.out.println("║    GET  /health              - Health check                ║");
        System.out.println("║    POST /api/members/register - Register member            ║");
        System.out.println("║    POST /api/resources/add    - Add resource               ║");
        System.out.println("║    POST /api/loans/borrow     - Borrow resource            ║");
        System.out.println("║    POST /api/loans/{id}/return - Return resource           ║");
        System.out.println("║    GET  /api/members/{id}/loans - Get member loans         ║");
        System.out.println("║    GET  /api/members/{id}/fines - Get member fines         ║");
        System.out.println("║    POST /api/reservations      - Create reservation        ║");
        System.out.println("║    GET  /api/resources/available - Available resources     ║");
        System.out.println("║    GET  /api/resources/search?q= - Search (Cherry 3)       ║");
        System.out.println("║    GET  /api/reports/overdue   - Overdue report (Cherry 2) ║");
        System.out.println("╚══════════════════════════════════════════════════════════╝");
    }
}



package com.zut.librarynet;

import com.google.firebase.auth.FirebaseToken;
import com.zut.librarynet.config.FirebaseConfig;
import com.zut.librarynet.handlers.LibraryHandlers;
import com.zut.librarynet.handlers.AuthHandlers;
import com.zut.librarynet.handlers.AdminHandlers;
import com.zut.librarynet.services.LibraryService;
import com.zut.librarynet.services.AuthService;
import io.javalin.Javalin;
import io.javalin.http.HttpStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

public class Main {
    public static void main(String[] args) {

        // Initialize Firebase FIRST
        FirebaseConfig.initialize();
        // Initialize services and handlers
        LibraryService libraryService = new LibraryService();
        LibraryHandlers libraryHandlers = new LibraryHandlers(libraryService);
        AuthHandlers authHandlers = new AuthHandlers();
        AdminHandlers adminHandlers = new AdminHandlers();

        // Share LibraryService with AdminHandlers so admin-created resources sync to members
        AdminHandlers.setLibraryService(libraryService);

        // Share LibraryService with AuthHandlers so member registration enables borrowing
        AuthHandlers.setLibraryService(libraryService);

        // Configure Jackson
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Create Javalin app
        Javalin app = Javalin.create(config -> {
            config.http.defaultContentType = "application/json";
            config.requestLogger.http((ctx, ms) -> {
                System.out.printf("[%s] %s %s (%.2f ms)%n",
                        ctx.method(), ctx.path(), ctx.status(), ms);
            });
        }).start(7070);

        // CORS
        app.before(ctx -> {
            ctx.header("Access-Control-Allow-Origin", "*");
            ctx.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            ctx.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        });

        // AUTHENTICATION MIDDLEWARE — Firebase ID Token Verification
        app.before(ctx -> {
            String path = ctx.path();
            String method = ctx.req().getMethod();

            // OPTIONS and public endpoints bypass auth
            if (method.equals("OPTIONS") || AuthService.isPublicEndpoint(path)) {
                return;
            }

            // Check Authorization header
            String authorization = ctx.header("Authorization");
            if (authorization == null) {
                ctx.status(401).json(java.util.Map.of(
                    "error", true,
                    "code", 401,
                    "message", "Authorization required"
                ));
                ctx.skipRemainingHandlers();
                return;
            }

            // Verify Firebase ID token
            FirebaseToken decodedToken = AuthService.verifyIdToken(authorization);
            if (decodedToken == null) {
                ctx.status(401).json(java.util.Map.of(
                    "error", true,
                    "code", 401,
                    "message", "Invalid or expired Firebase ID token"
                ));
                ctx.skipRemainingHandlers();
                return;
            }

            // Store UID and role in context
            String uid = decodedToken.getUid();
            String role = AuthService.getRole(authorization);
            ctx.attribute("uid", uid);
            ctx.attribute("userRole", role);
            System.out.printf("[Auth] Verified UID=%s, role=%s for %s %s%n", uid, role, method, path);
        });

        app.options("/*", ctx -> ctx.status(200));

        // ============================================
        // PUBLIC ENDPOINTS
        // ============================================

        app.get("/health", ctx -> {
            ctx.status(HttpStatus.OK).json(java.util.Map.of(
                "status", "OK",
                "message", "ZUT LibraryNet API",
                "timestamp", java.time.LocalDateTime.now().toString()
            ));
        });

        // Statistics (public for demo)
        app.get("/api/statistics", libraryHandlers::getStatistics);

        // ============================================
        // AUTH ENDPOINTS (public — token verification happens inside)
        // ============================================

        app.post("/api/auth/verify", authHandlers::verifyToken);
        app.post("/api/auth/register-profile", authHandlers::registerProfile);
        // Legacy endpoints — redirect to new flow
        app.post("/api/auth/login", authHandlers::verifyToken);
        app.post("/api/auth/register/member", authHandlers::registerProfile);
        app.post("/api/auth/register/admin", authHandlers::registerAdminProfile);
        app.post("/api/auth/logout", authHandlers::logout);

        // ============================================
        // RESOURCE ENDPOINTS
        // ============================================

        app.post("/api/resources", libraryHandlers::addResource);
        app.get("/api/resources/{id}", libraryHandlers::getResource);
        app.get("/api/resources", libraryHandlers::getAllResources);
        app.get("/api/resources/available", libraryHandlers::getAvailableResources);
        app.get("/api/resources/type/{type}", libraryHandlers::getResourcesByType);
        app.get("/api/resources/search", libraryHandlers::searchResources);

        // ============================================
        // LOAN ENDPOINTS
        // ============================================

        app.post("/api/loans/borrow", libraryHandlers::borrowResource);
        app.post("/api/loans/{id}/return", libraryHandlers::returnResource);
        app.post("/api/loans/{id}/extend", libraryHandlers::extendLoan);
        app.get("/api/loans/{id}", libraryHandlers::getLoan);

        // ============================================
        // MEMBER ENDPOINTS
        // ============================================

        app.get("/api/members/{id}", libraryHandlers::getMember);
        app.get("/api/members/{id}/loans", libraryHandlers::getMemberLoans);
        app.get("/api/members/{id}/fines", libraryHandlers::getMemberFines);
        app.post("/api/members/{id}/fines/{fineId}/pay", libraryHandlers::payFine);
        app.get("/api/members/{id}/reservations", libraryHandlers::getMemberReservations);
        app.get("/api/members", libraryHandlers::getAllMembers);

        // ============================================
        // RESERVATION ENDPOINTS
        // ============================================

        app.post("/api/reservations", libraryHandlers::createReservation);
        app.delete("/api/reservations/{id}", libraryHandlers::cancelReservation);
        app.get("/api/reservations/{id}/queue-position", libraryHandlers::getReservationQueuePosition);
        app.get("/api/resources/{id}/next-waiting", libraryHandlers::getNextWaitingMember);

        // ============================================
        // ADMIN ENDPOINTS (ADMIN role required)
        // ============================================

        // Resources CRUD
        app.get("/api/admin/resources", adminHandlers::getAllResources);
        app.post("/api/admin/resources", adminHandlers::createResource);
        app.put("/api/admin/resources/{id}", adminHandlers::updateResource);
        app.delete("/api/admin/resources/{id}", adminHandlers::deleteResource);

        // Users management
        app.get("/api/admin/users", adminHandlers::getAllUsers);
        app.put("/api/admin/users/{id}", adminHandlers::updateUser);

        // Loans
        app.get("/api/admin/loans", adminHandlers::getAllLoans);

        // Reservations
        app.get("/api/admin/reservations", adminHandlers::getAllReservations);

        // Statistics
        app.get("/api/admin/stats", adminHandlers::getStats);

        // Reports
        app.get("/api/reports/overdue", libraryHandlers::getOverdueReport);

        System.out.println();
        System.out.println("╔══════════════════════════════════════════════════════════╗");
        System.out.println("║     ZUT LibraryNet API - Running on :7070                ║");
        System.out.println("╠══════════════════════════════════════════════════════════╣");
        System.out.println("║  AUTH (Firebase):                                        ║");
        System.out.println("║    POST /api/auth/verify             - Verify ID Token   ║");
        System.out.println("║    POST /api/auth/register-profile  - Register Profile   ║");
        System.out.println("╠══════════════════════════════════════════════════════════╣");
        System.out.println("║  ADMIN (requires ADMIN role):                            ║");
        System.out.println("║    GET/POST    /api/admin/resources                      ║");
        System.out.println("║    PUT/DELETE /api/admin/resources/{id}                  ║");
        System.out.println("║    GET        /api/admin/users                           ║");
        System.out.println("║    PUT        /api/admin/users/{id}                      ║");
        System.out.println("║    GET        /api/admin/loans                           ║");
        System.out.println("║    GET        /api/admin/reservations                    ║");
        System.out.println("║    GET        /api/admin/stats                           ║");
        System.out.println("╚══════════════════════════════════════════════════════════╝");
    }
}

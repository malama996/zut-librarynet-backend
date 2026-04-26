package com.zut.librarynet.handlers;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.zut.librarynet.services.FirestoreAdminService;
import com.zut.librarynet.services.LibraryService;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AdminHandlers {
    private final Gson gson;
    private final FirestoreAdminService firestore;
    private static LibraryService libraryService;

    public AdminHandlers() {
        this.gson = new GsonBuilder().create();
        this.firestore = FirestoreAdminService.getInstance();
    }

    public static void setLibraryService(LibraryService service) {
        libraryService = service;
    }

    private boolean isAdmin(Context ctx) {
        String role = ctx.attribute("userRole");
        return "ADMIN".equals(role);
    }

    private void requireAdmin(Context ctx) {
        if (!isAdmin(ctx)) {
            sendError(ctx, HttpStatus.FORBIDDEN, "Admin access required");
            ctx.skipRemainingHandlers();
        }
    }

    public void getAllResources(Context ctx) {
        requireAdmin(ctx);
        try {
            List<Map<String, Object>> resources = firestore.getAllResources();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", resources);
            response.put("count", resources.size());
            ctx.status(HttpStatus.OK).json(response);
        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch resources: " + e.getMessage());
        }
    }

    public void createResource(Context ctx) {
        requireAdmin(ctx);
        try {
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            if (data == null) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Request body is required");
                return;
            }

            String type = (String) data.getOrDefault("type", "Book");

            // ── Per-type field normalization ─────────────────────────────────────
            // Ensure "title" and "publisher" are always set (required by LibraryResource base)
            switch (type.toLowerCase()) {
                case "journal": {
                    // Frontend may send "journalTitle" — normalize to "title"
                    if (!data.containsKey("title") && data.containsKey("journalTitle")) {
                        data.put("title", data.get("journalTitle"));
                    }
                    // Validate required fields
                    if (data.get("title") == null || data.get("title").toString().isBlank()) {
                        sendError(ctx, HttpStatus.BAD_REQUEST, "Journal Title is required");
                        return;
                    }
                    data.putIfAbsent("publisher", "Unknown Publisher");
                    data.putIfAbsent("issn", "0000-0000");
                    break;
                }
                case "digital": {
                    // Frontend sends "resourceTitle" and "provider" — normalize
                    if (!data.containsKey("title") && data.containsKey("resourceTitle")) {
                        data.put("title", data.get("resourceTitle"));
                    }
                    if (!data.containsKey("publisher") && data.containsKey("provider")) {
                        data.put("publisher", data.get("provider"));
                    }
                    // Frontend sends "accessUrl" — also alias to "url"
                    if (!data.containsKey("url") && data.containsKey("accessUrl")) {
                        data.put("url", data.get("accessUrl"));
                    }
                    if (data.get("title") == null || data.get("title").toString().isBlank()) {
                        sendError(ctx, HttpStatus.BAD_REQUEST, "Resource Title is required");
                        return;
                    }
                    data.putIfAbsent("publisher", "Unknown Provider");
                    data.putIfAbsent("url", "https://example.com");
                    break;
                }
                default: { // "book"
                    if (data.get("title") == null || data.get("title").toString().isBlank()) {
                        sendError(ctx, HttpStatus.BAD_REQUEST, "Book Title is required");
                        return;
                    }
                    data.putIfAbsent("publisher", "Unknown Publisher");
                    data.putIfAbsent("isbn", "UNKNOWN-ISBN");
                    data.putIfAbsent("author", "Unknown Author");
                    data.putIfAbsent("edition", "1st");
                    break;
                }
            }

            // ── Save to Firestore (full map — nothing dropped) ──────────────────
            Map<String, Object> resource = firestore.createResource(data);

            // ── Optionally sync to in-memory LibraryService cache ──────────────
            if (libraryService != null) {
                try {
                    libraryService.addResource(type, data);
                } catch (Exception e) {
                    // Non-fatal: Firestore is source of truth
                    System.err.println("[AdminHandlers] LibraryService sync skipped: " + e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Resource created successfully");
            response.put("data", resource);
            ctx.status(HttpStatus.CREATED).json(response);

        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create resource: " + e.getMessage());
        }
    }

    public void updateResource(Context ctx) {
        requireAdmin(ctx);
        try {
            String id = ctx.pathParam("id");
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            if (data == null || data.isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "No fields to update");
                return;
            }

            Map<String, Object> updated = firestore.updateResource(id, data);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Resource updated successfully");
            response.put("data", updated);
            ctx.status(HttpStatus.OK).json(response);
        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update resource: " + e.getMessage());
        }
    }

    public void deleteResource(Context ctx) {
        requireAdmin(ctx);
        try {
            String id = ctx.pathParam("id");
            firestore.deleteResource(id);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Resource deleted successfully");
            ctx.status(HttpStatus.OK).json(response);
        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete resource: " + e.getMessage());
        }
    }

    public void getAllUsers(Context ctx) {
        requireAdmin(ctx);
        try {
            List<Map<String, Object>> users = firestore.getAllUsers();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", users);
            response.put("count", users.size());
            ctx.status(HttpStatus.OK).json(response);
        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch users: " + e.getMessage());
        }
    }

    public void updateUser(Context ctx) {
        requireAdmin(ctx);
        try {
            String id = ctx.pathParam("id");
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            if (data == null || data.isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "No fields to update");
                return;
            }

            Map<String, Object> updated = firestore.updateUser(id, data);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User updated successfully");
            response.put("data", updated);
            ctx.status(HttpStatus.OK).json(response);
        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update user: " + e.getMessage());
        }
    }

    public void getAllLoans(Context ctx) {
        requireAdmin(ctx);
        try {
            List<Map<String, Object>> loans = firestore.getAllLoans();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", loans);
            response.put("count", loans.size());
            ctx.status(HttpStatus.OK).json(response);
        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch loans: " + e.getMessage());
        }
    }

    public void getAllReservations(Context ctx) {
        requireAdmin(ctx);
        try {
            List<Map<String, Object>> reservations = new ArrayList<>();
            if (libraryService != null) {
                reservations = libraryService.getAllReservations().stream()
                    .map(r -> {
                        Map<String, Object> resMap = new HashMap<>();
                        resMap.put("id", r.getId());
                        resMap.put("memberId", r.getMember().getId());
                        resMap.put("memberName", r.getMember().getName());
                        resMap.put("resourceId", r.getResource().getId());
                        resMap.put("resourceTitle", r.getResource().getTitle());
                        resMap.put("reservationDate", r.getReservationDate().toString());
                        resMap.put("status", r.getStatus());
                        return resMap;
                    })
                    .toList();
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", reservations);
            response.put("count", reservations.size());
            ctx.status(HttpStatus.OK).json(response);
        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch reservations: " + e.getMessage());
        }
    }

    public void getDashboard(Context ctx) {
        requireAdmin(ctx);
        try {
            if (libraryService == null) {
                sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Library service not initialized");
                return;
            }
            Map<String, Object> metrics = libraryService.getDashboardMetrics();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", metrics);
            ctx.status(HttpStatus.OK).json(response);
        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch dashboard metrics: " + e.getMessage());
        }
    }

    public void getStats(Context ctx) {
        requireAdmin(ctx);
        try {

            Map<String, Object> stats = firestore.getStatistics();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", stats);
            ctx.status(HttpStatus.OK).json(response);
        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch stats: " + e.getMessage());
        }
    }

    private void sendError(Context ctx, HttpStatus status, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", true);
        error.put("code", status.getCode());
        error.put("message", message);
        error.put("timestamp", LocalDateTime.now().toString());
        ctx.status(status).json(error);
    }
}

package com.zut.librarynet.handlers;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.zut.librarynet.config.FirestoreClient;
import com.zut.librarynet.models.User;
import com.zut.librarynet.services.AuthService;
import com.zut.librarynet.services.LibraryService;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import com.google.cloud.firestore.QueryDocumentSnapshot;

/**
 * Authentication handlers for registration and login.
 */
public class AuthHandlers {
    private static LibraryService libraryService;

    private final Gson gson = new GsonBuilder().create();

    public static void setLibraryService(LibraryService service) {
        libraryService = service;
    }

    /**
     * POST /api/auth/login
     */
    public void login(Context ctx) {
        try {
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            String email = (String) data.get("email");
            String password = (String) data.get("password");

            if (email == null || password == null) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Email and password required");
                return;
            }

            User user = AuthService.login(email, password);
            if (user == null) {
                sendError(ctx, HttpStatus.UNAUTHORIZED, "Invalid email or password");
                return;
            }

            String token = AuthService.generateToken(user.getId(), user.getRole());

            // Also create member in LibraryService if not exists (for borrowing)
            if (libraryService != null && libraryService.getMember(user.getId()) == null) {
                try {
                    Map<String, Object> memberData = new HashMap<>();
                    memberData.put("name", user.getName());
                    memberData.put("email", user.getEmail());
                    memberData.put("phone", "Not provided");
                    libraryService.registerMember("StudentMember", memberData);
                } catch (Exception e) {
                    System.err.println("[AuthHandlers] Error creating member: " + e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", Map.of(
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "role", user.getRole()
            ));
            response.put("token", "Bearer " + token);
            response.put("memberId", user.getId());

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    /**
     * POST /api/auth/register/member
     */
    public void registerMember(Context ctx) {
        try {
            String body = ctx.body();
            if (body == null || body.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Request body required");
                return;
            }

            Map<String, Object> data = gson.fromJson(body, Map.class);

            String name = (String) data.get("name");
            String email = (String) data.get("email");
            String password = (String) data.get("password");
            String phone = (String) data.get("phone");
            String memberType = (String) data.get("type");
            String idSecret = (String) data.get("idSecret");

            if (name == null || name.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Name required");
                return;
            }
            if (email == null || email.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Email required");
                return;
            }
            if (password == null || password.isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Password required");
                return;
            }
            if (memberType == null || memberType.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Member type required");
                return;
            }
            if (idSecret == null || idSecret.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "ID secret required (studentId/employeeId/researcherId)");
                return;
            }

            String upperType = memberType.trim().toUpperCase();

            User user;
            try {
                user = AuthService.registerMember(
                        name.trim(), email.trim(), password, memberType.trim(), idSecret.trim());
            } catch (IllegalArgumentException e) {
                sendError(ctx, HttpStatus.BAD_REQUEST, e.getMessage());
                return;
            }

            // Also create member in LibraryService so borrowing works
            if (libraryService != null) {
                try {
                    Map<String, Object> memberData = new HashMap<>();
                    memberData.put("name", name.trim());
                    memberData.put("email", email.trim().toLowerCase());
                    memberData.put("phone", phone != null ? phone.trim() : "Not provided");

                    String libType = switch (upperType) {
                        case "STUDENT" -> "StudentMember";
                        case "LECTURER" -> "LecturerMember";
                        case "RESEARCHER" -> "ResearcherMember";
                        default -> "StudentMember";
                    };

                    if (upperType.equals("STUDENT")) {
                        memberData.put("studentId", idSecret);
                        memberData.put("programme", "General");
                        memberData.put("yearOfStudy", 1);
                    } else if (upperType.equals("LECTURER")) {
                        memberData.put("employeeId", idSecret);
                        memberData.put("department", "General");
                    } else if (upperType.equals("RESEARCHER")) {
                        memberData.put("researcherId", idSecret);
                        memberData.put("institution", "ZUT");
                    }

                    libraryService.registerMember(libType, memberData);
                    System.out.println("[AuthHandlers] Created member in LibraryService: " + user.getId());
                } catch (Exception me) {
                    System.err.println("[AuthHandlers] Failed to create member in LibraryService: " + me.getMessage());
                }
            }

            // Sync to Firebase for persistence
            try {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", user.getId());
                userData.put("name", user.getName());
                userData.put("email", user.getEmail());
                userData.put("role", user.getRole());
                userData.put("memberType", upperType);
                userData.put("passwordHash", user.getPasswordHash());
                userData.put("createdAt", LocalDateTime.now().toString());
                FirestoreClient.setDocument("users", user.getId(), userData);
                System.out.println("[AuthHandlers] User synced to Firebase: " + user.getEmail());
            } catch (Exception fe) {
                System.err.println("[AuthHandlers] Firebase sync failed: " + fe.getMessage());
            }

            String token = AuthService.generateToken(user.getId(), user.getRole());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", Map.of(
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "role", user.getRole(),
                    "memberType", upperType
            ));
            response.put("token", "Bearer " + token);
            response.put("memberId", user.getId());
            response.put("memberType", upperType);
            response.put("message", upperType + " registered successfully");

            ctx.status(HttpStatus.CREATED).json(response);

        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    /**
     * POST /api/auth/register/admin
     */
    public void registerAdmin(Context ctx) {
        try {
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);

            String name = (String) data.get("name");
            String email = (String) data.get("email");
            String password = (String) data.get("password");
            String adminSecret = (String) data.get("adminSecret");

            if (name == null || email == null || password == null || adminSecret == null) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "All fields required");
                return;
            }

            User user;
            try {
                user = AuthService.registerAdmin(name.trim(), email.trim(), password, adminSecret);
            } catch (IllegalArgumentException e) {
                sendError(ctx, HttpStatus.BAD_REQUEST, e.getMessage());
                return;
            }

            String token = AuthService.generateToken(user.getId(), user.getRole());

            // Sync admin to Firebase
            try {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", user.getId());
                userData.put("name", user.getName());
                userData.put("email", user.getEmail());
                userData.put("role", user.getRole());
                userData.put("passwordHash", user.getPasswordHash());
                userData.put("createdAt", LocalDateTime.now().toString());
                FirestoreClient.setDocument("users", user.getId(), userData);
            } catch (Exception fe) {
                System.err.println("[AuthHandlers] Firebase sync failed: " + fe.getMessage());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", Map.of(
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "role", user.getRole()
            ));
            response.put("token", "Bearer " + token);
            response.put("message", "Admin registered successfully");

            ctx.status(HttpStatus.CREATED).json(response);

        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    /**
     * POST /api/auth/logout
     */
    public void logout(Context ctx) {
        String auth = ctx.header("Authorization");
        if (auth != null) {
            AuthService.revokeToken(auth);
        }
        ctx.status(HttpStatus.OK).json(Map.of("success", true, "message", "Logged out"));
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

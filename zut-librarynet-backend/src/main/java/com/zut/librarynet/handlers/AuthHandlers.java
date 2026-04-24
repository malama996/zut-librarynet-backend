package com.zut.librarynet.handlers;

import com.google.firebase.auth.FirebaseToken;
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

/**
 * Authentication handlers for Firebase Auth integration.
 *
 * All authentication is handled by Firebase Auth.
 * These endpoints verify Firebase ID tokens and manage user profiles.
 */
public class AuthHandlers {
    private static LibraryService libraryService;

    private final Gson gson = new GsonBuilder().create();

    public static void setLibraryService(LibraryService service) {
        libraryService = service;
    }

    /**
     * POST /api/auth/verify
     * Verifies a Firebase ID token and returns user profile.
     */
    public void verifyToken(Context ctx) {
        try {
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            String idToken = (String) data.get("idToken");

            if (idToken == null || idToken.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "idToken required");
                return;
            }

            FirebaseToken decodedToken = AuthService.verifyIdToken(idToken);
            if (decodedToken == null) {
                sendError(ctx, HttpStatus.UNAUTHORIZED, "Invalid or expired token");
                return;
            }

            String uid = decodedToken.getUid();
            String role = AuthService.getRole(idToken);

            // Fetch user profile from Firestore
            User user = AuthService.fetchUserFromFirestore(uid);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("uid", uid);
            response.put("email", decodedToken.getEmail());
            response.put("role", role);

            if (user != null) {
                response.put("name", user.getName());
                response.put("memberType", user.getMemberType());
            }

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    /**
     * POST /api/auth/register-profile
     * Creates a LibraryService member after Firebase Auth registration.
     * Called after frontend creates user in Firebase Auth + Firestore.
     */
    public void registerProfile(Context ctx) {
        try {
            String body = ctx.body();
            if (body == null || body.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Request body required");
                return;
            }

            Map<String, Object> data = gson.fromJson(body, Map.class);

            // Get idToken from request (to verify caller is authenticated)
            String idToken = (String) data.get("idToken");
            if (idToken == null || idToken.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "idToken required");
                return;
            }

            FirebaseToken decodedToken = AuthService.verifyIdToken(idToken);
            if (decodedToken == null) {
                sendError(ctx, HttpStatus.UNAUTHORIZED, "Invalid token");
                return;
            }

            String uid = decodedToken.getUid();
            String name = (String) data.get("name");
            String email = (String) data.get("email");
            String phone = (String) data.getOrDefault("phone", "Not provided");
            String memberType = (String) data.get("type");
            String idSecret = (String) data.get("idSecret");

            if (name == null || name.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Name required");
                return;
            }
            if (memberType == null || memberType.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "Member type required");
                return;
            }

            String upperType = memberType.trim().toUpperCase();

            // Create member in LibraryService using Firebase UID
            boolean memberCreated = false;
            if (libraryService != null) {
                try {
                    Map<String, Object> memberData = new HashMap<>();
                    memberData.put("name", name.trim());
                    memberData.put("email", email != null ? email.trim().toLowerCase() : decodedToken.getEmail());
                    memberData.put("phone", phone);

                    String libType;
                    if (upperType.equals("STUDENT")) {
                        libType = "StudentMember";
                        memberData.put("studentId", idSecret != null ? idSecret : "STU" + System.currentTimeMillis());
                        memberData.put("programme", data.getOrDefault("programme", "General"));
                        memberData.put("yearOfStudy", data.getOrDefault("yearOfStudy", 1));
                    } else if (upperType.equals("LECTURER")) {
                        libType = "LecturerMember";
                        memberData.put("employeeId", idSecret != null ? idSecret : "EMP" + System.currentTimeMillis());
                        memberData.put("department", data.getOrDefault("department", "General"));
                        memberData.put("yearsOfService", data.getOrDefault("yearsOfService", 0));
                    } else if (upperType.equals("RESEARCHER")) {
                        libType = "ResearcherMember";
                        memberData.put("researcherId", idSecret != null ? idSecret : "RES" + System.currentTimeMillis());
                        memberData.put("institution", data.getOrDefault("institution", "ZUT"));
                        memberData.put("researchArea", data.getOrDefault("researchArea", "General"));
                    } else {
                        sendError(ctx, HttpStatus.BAD_REQUEST, "Invalid member type: " + memberType);
                        return;
                    }

                    libraryService.registerMemberWithUid(uid, libType, memberData);
                    memberCreated = true;
                    System.out.println("[AuthHandlers] Created member in LibraryService: " + uid);
                } catch (Exception me) {
                    System.err.println("[AuthHandlers] Failed to create member: " + me.getMessage());
                }
            }

            // Also ensure Firestore user profile exists
            try {
                Map<String, Object> userData = new HashMap<>();
                userData.put("uid", uid);
                userData.put("name", name.trim());
                userData.put("email", email != null ? email : decodedToken.getEmail());
                userData.put("role", "MEMBER");
                userData.put("memberType", upperType);
                userData.put("status", "active");
                userData.put("createdAt", LocalDateTime.now().toString());
                FirestoreClient.setDocument("users", uid, userData);
            } catch (Exception fe) {
                System.err.println("[AuthHandlers] Firestore sync failed: " + fe.getMessage());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("uid", uid);
            response.put("memberCreated", memberCreated);
            response.put("message", upperType + " profile registered successfully");

            ctx.status(HttpStatus.CREATED).json(response);

        } catch (Exception e) {
            sendError(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    /**
     * POST /api/auth/register/admin
     * Admin registration — sets role to ADMIN in Firestore.
     */
    public void registerAdminProfile(Context ctx) {
        try {
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            String idToken = (String) data.get("idToken");

            if (idToken == null || idToken.trim().isEmpty()) {
                sendError(ctx, HttpStatus.BAD_REQUEST, "idToken required");
                return;
            }

            FirebaseToken decodedToken = AuthService.verifyIdToken(idToken);
            if (decodedToken == null) {
                sendError(ctx, HttpStatus.UNAUTHORIZED, "Invalid token");
                return;
            }

            String uid = decodedToken.getUid();
            String name = (String) data.get("name");
            String email = decodedToken.getEmail();

            // Create admin profile in Firestore
            try {
                Map<String, Object> userData = new HashMap<>();
                userData.put("uid", uid);
                userData.put("name", name != null ? name.trim() : "Admin");
                userData.put("email", email);
                userData.put("role", "ADMIN");
                userData.put("status", "active");
                userData.put("createdAt", LocalDateTime.now().toString());
                FirestoreClient.setDocument("users", uid, userData);
            } catch (Exception fe) {
                System.err.println("[AuthHandlers] Firestore sync failed: " + fe.getMessage());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("uid", uid);
            response.put("role", "ADMIN");
            response.put("message", "Admin profile registered successfully");

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

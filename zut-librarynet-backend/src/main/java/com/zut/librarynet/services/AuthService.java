package com.zut.librarynet.services;

import com.zut.librarynet.models.User;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authentication service with proper login/logout and role-based access control.
 *
 * Login Flow:
 * 1. POST /auth/login with email + password
 * 2. Returns user info + token
 *
 * Registration Flows:
 * - POST /auth/register/member - Member registration
 * - POST /auth/register/admin - Admin registration (requires secret)
 */
public class AuthService {
    // User storage: email -> User
    private static final Map<String, User> users = new ConcurrentHashMap<>();

    // Token storage: token -> userId
    private static final Map<String, String> tokens = new ConcurrentHashMap<>();
    // Token -> role
    private static final Map<String, String> tokenRoles = new ConcurrentHashMap<>();

    // Role constants
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_MEMBER = "MEMBER";

    // Admin registration secret (from environment or default for demo)
    private static String ADMIN_SECRET = System.getenv("ADMIN_REGISTRATION_SECRET");
    static {
        if (ADMIN_SECRET == null || ADMIN_SECRET.isEmpty()) {
            ADMIN_SECRET = "ZUT-ADMIN-2026"; // Demo secret - change in production
        }
    }

    // Member-type verification secrets (from environment or defaults for demo)
    private static String STUDENT_SECRET     = System.getenv("STUDENT_REGISTRATION_SECRET");
    private static String LECTURER_SECRET    = System.getenv("LECTURER_REGISTRATION_SECRET");
    private static String RESEARCHER_SECRET  = System.getenv("RESEARCHER_REGISTRATION_SECRET");
    static {
        if (STUDENT_SECRET == null || STUDENT_SECRET.isEmpty())
            STUDENT_SECRET    = "ZUT-STUDENT-2026";
        if (LECTURER_SECRET == null || LECTURER_SECRET.isEmpty())
            LECTURER_SECRET   = "ZUT-LECTURER-2026";
        if (RESEARCHER_SECRET == null || RESEARCHER_SECRET.isEmpty())
            RESEARCHER_SECRET = "ZUT-RESEARCHER-2026";
    }

    /**
     * Register a member (Student / Lecturer / Researcher) with type-specific ID format verification.
     *
     * Format rules (validated by prefix + digit count):
     *   - STUDENT     → e.g. "STU1234567"  → prefix must be STU, followed by exactly 7 digits
     *   - LECTURER    → e.g. "EMP001"      → prefix must be EMP, followed by at least 1 digit
     *   - RESEARCHER  → e.g. "RES0001"     → prefix must be RES, followed by at least 1 digit
     *
     * Invalid-format IDs are rejected. Valid-format IDs from any ZUT member are accepted.
     */
    public static User registerMember(String name, String email, String password,
                                      String memberType, String idSecret) {
        if (name == null || email == null || password == null || memberType == null || idSecret == null) {
            throw new IllegalArgumentException("All fields required");
        }

        email = email.toLowerCase().trim();
        String upperType = memberType.toUpperCase();
        String id = idSecret.trim().toUpperCase();

        // ── Type-specific ID format validation ────────────────────────────
        switch (upperType) {
            case "STUDENT" -> {
                // Must be STU prefix + at least 4 digits (e.g. STU1234, STU1234567)
                if (!id.matches("^STU\\d{4,}$")) {
                    throw new IllegalArgumentException(
                        "Invalid Student ID '" + idSecret + "'. Must be STU + 4+ digits (e.g. STU1234).");
                }
            }
            case "LECTURER" -> {
                // Must be EMP prefix + at least 2 digits (e.g. EMP01, EMP111, EMP123456)
                if (!id.matches("^EMP\\d{2,}$")) {
                    throw new IllegalArgumentException(
                        "Invalid Employee ID '" + idSecret + "'. Must be EMP + 2+ digits (e.g. EMP01).");
                }
            }
            case "RESEARCHER" -> {
                // Must be RES prefix + at least 2 digits (e.g. RES01, RES0001)
                if (!id.matches("^RES\\d{2,}$")) {
                    throw new IllegalArgumentException(
                        "Invalid Researcher ID '" + idSecret + "'. Must be RES + 2+ digits (e.g. RES01).");
                }
            }
            default -> throw new IllegalArgumentException("Invalid member type: " + memberType);
        }

        if (users.containsKey(email)) {
            throw new IllegalArgumentException("Email already registered");
        }

        String passwordHash = hashPassword(password);
        User user = new User(name, email, passwordHash, ROLE_MEMBER, upperType);
        users.put(email, user);

        System.out.printf("[AUTH] Registered %s: %s (%s) with ID=%s%n", upperType, name, email, id);
        return user;
    }

    /**
     * Register a new user (member or admin)
     */
    public static User register(String name, String email, String password, String role) {
        if (name == null || email == null || password == null || role == null) {
            throw new IllegalArgumentException("All fields required");
        }

        email = email.toLowerCase().trim();

        if (users.containsKey(email)) {
            throw new IllegalArgumentException("Email already registered");
        }

        if (!role.equals(ROLE_ADMIN) && !role.equals(ROLE_MEMBER)) {
            throw new IllegalArgumentException("Invalid role");
        }

        String passwordHash = hashPassword(password);
        User user = new User(name, email, passwordHash, role);
        users.put(email, user);

        return user;
    }

    /**
     * Register admin with secret verification
     */
    public static User registerAdmin(String name, String email, String password, String secret) {
        if (!ADMIN_SECRET.equals(secret)) {
            throw new IllegalArgumentException("Invalid admin secret");
        }
        return register(name, email, password, ROLE_ADMIN);
    }

    /**
     * Login user with email and password
     * Returns User if successful, null otherwise
     */
    public static User login(String email, String password) {
        if (email == null || password == null) {
            return null;
        }

        email = email.toLowerCase().trim();
        User user = users.get(email);

        if (user == null) {
            return null;
        }

        String passwordHash = hashPassword(password);
        if (!passwordHash.equals(user.getPasswordHash())) {
            return null;
        }

        return user;
    }

    /**
     * Generate token for user
     */
    public static String generateToken(String userId, String role) {
        String token = userId + ":" + System.currentTimeMillis() + ":" + UUID.randomUUID().toString();
        tokens.put(token, userId);
        tokenRoles.put(token, role);
        return token;
    }

    /**
     * Get all registered users (for admin dashboard)
     */
    public static List<User> getAllUsers() {
        return new ArrayList<>(users.values());
    }

    /**
     * Validate token and get user ID
     */
    public static String validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }

        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        return tokens.get(token);
    }

    /**
     * Get user from token
     */
    public static User getUserFromToken(String token) {
        String userId = validateToken(token);
        if (userId == null) {
            return null;
        }

        return users.values().stream()
                .filter(u -> u.getId().equals(userId))
                .findFirst()
                .orElse(null);
    }

    /**
     * Get role from token
     */
    public static String getRole(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }

        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        return tokenRoles.getOrDefault(token, null);
    }

    /**
     * Check if user is admin
     */
    public static boolean isAdmin(String token) {
        return ROLE_ADMIN.equals(getRole(token));
    }

    /**
     * Revoke token (logout)
     */
    public static void revokeToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        if (token != null) {
            tokens.remove(token);
            tokenRoles.remove(token);
        }
    }

    /**

    /**
     * Find user by ID
     */
    public static User findById(String id) {
        return users.values().stream()
                .filter(u -> u.getId().equals(id))
                .findFirst()
                .orElse(null);
    }

    /**
     * Simple password hashing (use bcrypt in production)
     */
    private static String hashPassword(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Hashing error", e);
        }
    }

    /**
     * Check if endpoint is public
     */
    public static boolean isPublicEndpoint(String path) {
        return path.equals("/health") ||
               path.equals("/api/auth/login") ||
               path.equals("/api/auth/register/member") ||
               path.equals("/api/auth/register/admin");
    }

    /**
     * Clear all data (for testing)
     */
    public static void clearAll() {
        users.clear();
        tokens.clear();
        tokenRoles.clear();
    }
}

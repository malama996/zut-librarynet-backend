package com.zut.librarynet.services;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.zut.librarynet.config.FirestoreClient;
import com.zut.librarynet.models.User;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authentication service using Firebase Auth ONLY.
 *
 * All authentication is handled by Firebase Authentication.
 * This service verifies Firebase ID tokens and fetches user profiles from Firestore.
 *
 * Flow:
 * 1. Frontend calls signInWithEmailAndPassword (Firebase Auth SDK)
 * 2. Frontend gets Firebase ID token
 * 3. Frontend sends ID token in Authorization header
 * 4. Backend verifies token with Firebase Admin SDK
 * 5. Backend extracts UID and fetches role from Firestore users/{uid}
 */
public class AuthService {

    // Role constants
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_MEMBER = "MEMBER";

    // In-memory cache of verified tokens: token -> {uid, role}
    // This is just for performance; tokens are always verified with Firebase first
    private static final Map<String, TokenInfo> tokenCache = new ConcurrentHashMap<>();

    private static class TokenInfo {
        final String uid;
        final String role;
        final long verifiedAt;

        TokenInfo(String uid, String role) {
            this.uid = uid;
            this.role = role;
            this.verifiedAt = System.currentTimeMillis();
        }

        boolean isExpired() {
            // Cache for 55 minutes (Firebase ID tokens expire after 1 hour)
            return System.currentTimeMillis() - verifiedAt > 55 * 60 * 1000;
        }
    }

    /**
     * Verify a Firebase ID token and return the decoded token.
     * This is the ONLY authentication validation method.
     */
    public static FirebaseToken verifyIdToken(String idToken) {
        if (idToken == null || idToken.trim().isEmpty()) {
            return null;
        }

        // Strip "Bearer " prefix if present
        String token = idToken;
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        // Check cache first
        TokenInfo cached = tokenCache.get(token);
        if (cached != null && !cached.isExpired()) {
            // Return a lightweight decoded token representation
            // We can't reconstruct FirebaseToken, so we still verify with Firebase
            // but we know it's valid. For simplicity, we verify every time.
        }

        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
            String uid = decodedToken.getUid();

            // Fetch user role from Firestore
            String role = fetchUserRoleFromFirestore(uid);

            // Cache the result
            tokenCache.put(token, new TokenInfo(uid, role));

            return decodedToken;
        } catch (FirebaseAuthException e) {
            System.err.println("[AuthService] Firebase token verification failed: " + e.getMessage());
            return null;
        } catch (Exception e) {
            System.err.println("[AuthService] Unexpected error verifying token: " + e.getMessage());
            return null;
        }
    }

    /**
     * Extract UID from a Firebase ID token.
     */
    public static String getUidFromToken(String idToken) {
        FirebaseToken decoded = verifyIdToken(idToken);
        return decoded != null ? decoded.getUid() : null;
    }

    /**
     * Get role from token (uses cached verification).
     */
    public static String getRole(String idToken) {
        if (idToken == null || idToken.trim().isEmpty()) {
            return null;
        }

        String token = idToken;
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        TokenInfo cached = tokenCache.get(token);
        if (cached != null && !cached.isExpired()) {
            return cached.role;
        }

        // Verify and cache
        FirebaseToken decoded = verifyIdToken(idToken);
        if (decoded != null) {
            TokenInfo info = tokenCache.get(token);
            return info != null ? info.role : null;
        }
        return null;
    }

    /**
     * Check if user is admin.
     */
    public static boolean isAdmin(String idToken) {
        return ROLE_ADMIN.equals(getRole(idToken));
    }

    /**
     * Fetch user role from Firestore users/{uid} document.
     * CRITICAL FIX: Falls back to memberType if role field is missing.
     */
    private static String fetchUserRoleFromFirestore(String uid) {
        try {
            com.google.cloud.firestore.DocumentSnapshot doc = FirestoreClient.getDocument("users", uid);
            if (doc.exists()) {
                String role = doc.getString("role");
                if (role != null && !role.trim().isEmpty()) {
                    return role.toUpperCase();
                }
                // CRITICAL FIX: Fallback to memberType if role is missing
                String memberType = doc.getString("memberType");
                if (memberType != null && !memberType.trim().isEmpty()) {
                    return memberType.toUpperCase();
                }
            }
        } catch (Exception e) {
            System.err.println("[AuthService] Failed to fetch user role from Firestore: " + e.getMessage());
        }
        // Default to MEMBER if not found
        return ROLE_MEMBER;
    }

    /**
     * Fetch full user profile from Firestore.
     * CRITICAL FIX: Uses memberType as role fallback.
     */
    public static User fetchUserFromFirestore(String uid) {
        try {
            com.google.cloud.firestore.DocumentSnapshot doc = FirestoreClient.getDocument("users", uid);
            if (doc.exists()) {
                String name = doc.getString("name");
                String email = doc.getString("email");
                String role = doc.getString("role");
                String memberType = doc.getString("memberType");

                // CRITICAL FIX: Use memberType as role fallback
                String effectiveRole = role;
                if (effectiveRole == null || effectiveRole.trim().isEmpty()) {
                    effectiveRole = memberType;
                }

                User user = new User(uid, name, email, "", effectiveRole != null ? effectiveRole.toUpperCase() : ROLE_MEMBER);
                user.setMemberType(memberType);
                return user;
            }
        } catch (Exception e) {
            System.err.println("[AuthService] Failed to fetch user from Firestore: " + e.getMessage());
        }
        return null;
    }

    /**
     * Revoke token from cache (logout).
     */
    public static void revokeToken(String idToken) {
        if (idToken != null && idToken.startsWith("Bearer ")) {
            idToken = idToken.substring(7);
        }
        if (idToken != null) {
            tokenCache.remove(idToken);
        }
    }

    /**
     * Check if endpoint is public (no auth required).
     */
    public static boolean isPublicEndpoint(String path) {
        return path.equals("/health") ||
               path.equals("/api/auth/verify") ||
               path.equals("/api/auth/register-profile") ||
               path.equals("/api/auth/login") ||
               path.equals("/api/auth/register/member") ||
               path.equals("/api/auth/register/admin");
    }

    /**
     * Clear all cached tokens (for testing).
     */
    public static void clearAll() {
        tokenCache.clear();
    }
}


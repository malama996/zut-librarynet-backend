package com.zut.librarynet.services;

import java.util.*;
import java.util.UUID;

/**
 * ENCAPSULATION PATTERN: Authentication service for API security
 * Provides simple token-based authentication for API endpoints
 * In production, use industry-standard JWT or OAuth2
 */
public class AuthService {
    private static final Map<String, String> tokens = new HashMap<>();
    private static final Map<String, String> memberTokens = new HashMap<>();
    
    /**
     * Generate authentication token for member
     * ENCAPSULATION: Hide token generation logic
     */
    public static String generateToken(String memberId) {
        // Simple token format: memberId:timestamp:uuid
        String token = memberId + ":" + System.currentTimeMillis() + ":" + UUID.randomUUID().toString();
        memberTokens.put(token, memberId);
        return token;
    }
    
    /**
     * Validate token and get member ID
     * ENCAPSULATION: Hide validation logic
     */
    public static String validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }
        
        // Remove "Bearer " prefix if present
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        
        return memberTokens.get(token);
    }
    
    /**
     * Check if endpoint is public (doesn't require authentication)
     */
    public static boolean isPublicEndpoint(String path) {
        return path.equals("/health") || 
               path.equals("/api/members/register") ||
               path.equals("/api/members/login");
    }
    
    /**
     * Revoke token (logout)
     */
    public static void revokeToken(String token) {
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        memberTokens.remove(token);
    }
    
    /**
     * Clear all tokens (for testing)
     */
    public static void clearAllTokens() {
        memberTokens.clear();
    }
}

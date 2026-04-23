package com.zut.librarynet.services;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.zut.librarynet.config.FirestoreClient;

import java.util.*;
import java.util.concurrent.ExecutionException;

/**
 * Service layer for ALL Firestore operations.
 * All data access goes through this service.
 */
public class FirestoreAdminService {
    private static FirestoreAdminService instance;
    private static final boolean FIREBASE_ENABLED = true;

    // Collections names
    private static final String RESOURCES_COL = "resources";
    private static final String USERS_COL = "users";
    private static final String LOANS_COL = "loans";
    private static final String RESERVATIONS_COL = "reservations";

    private FirestoreAdminService() {
        System.out.println("[FirestoreAdminService] Initialized with Firebase: " + FIREBASE_ENABLED);
    }

    public static FirestoreAdminService getInstance() {
        if (instance == null) {
            instance = new FirestoreAdminService();
        }
        return instance;
    }

    // ============================================================
    // RESOURCES CRUD
    // ============================================================

    public List<Map<String, Object>> getAllResources() {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            List<QueryDocumentSnapshot> docs = FirestoreClient.getAllDocuments(RESOURCES_COL);
            for (QueryDocumentSnapshot doc : docs) {
                Map<String, Object> map = doc.getData();
                map.put("id", doc.getId());
                result.add(map);
            }
        } catch (Exception e) {
            System.err.println("[FirestoreAdminService] Error getting resources: " + e.getMessage());
        }
        return result;
    }

    public Map<String, Object> createResource(String type, String title, String publisher, String author, String isbn) {
        String id = "res-" + System.currentTimeMillis();
        Map<String, Object> data = new HashMap<>();
        data.put("type", type);
        data.put("title", title);
        data.put("publisher", publisher);
        data.put("author", author);
        data.put("isbn", isbn);
        data.put("available", true);
        data.put("createdAt", java.time.LocalDateTime.now().toString());

        try {
            FirestoreClient.setDocument(RESOURCES_COL, id, data);
            data.put("id", id);
            System.out.println("[FirestoreAdminService] Created resource in Firebase: " + id);
        } catch (Exception e) {
            System.err.println("[FirestoreAdminService] Error creating resource: " + e.getMessage());
            throw new RuntimeException("Failed to create resource", e);
        }
        return data;
    }

    public Map<String, Object> updateResource(String id, Map<String, Object> data) {
        try {
            DocumentSnapshot doc = FirestoreClient.getDocument(RESOURCES_COL, id);
            if (!doc.exists()) {
                throw new RuntimeException("Resource not found: " + id);
            }
            Map<String, Object> existing = doc.getData();
            if (existing != null) {
                data.forEach((k, v) -> {
                    if (v != null) existing.put(k, v);
                });
                FirestoreClient.setDocument(RESOURCES_COL, id, existing);
                existing.put("id", id);
                System.out.println("[FirestoreAdminService] Updated resource: " + id);
                return existing;
            }
        } catch (Exception e) {
            System.err.println("[FirestoreAdminService] Error updating resource: " + e.getMessage());
        }
        throw new RuntimeException("Resource not found: " + id);
    }

    public void deleteResource(String id) {
        try {
            FirestoreClient.deleteDocument(RESOURCES_COL, id);
            System.out.println("[FirestoreAdminService] Deleted resource: " + id);
        } catch (Exception e) {
            System.err.println("[FirestoreAdminService] Error deleting resource: " + e.getMessage());
        }
    }

    // ============================================================
    // USERS MANAGEMENT
    // ============================================================

    public List<Map<String, Object>> getAllUsers() {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            List<QueryDocumentSnapshot> docs = FirestoreClient.getAllDocuments(USERS_COL);
            for (QueryDocumentSnapshot doc : docs) {
                Map<String, Object> map = doc.getData();
                map.put("id", doc.getId());
                result.add(map);
            }
        } catch (Exception e) {
            System.err.println("[FirestoreAdminService] Error getting users: " + e.getMessage());
        }
        return result;
    }

    public Map<String, Object> updateUser(String id, Map<String, Object> data) {
        try {
            DocumentSnapshot doc = FirestoreClient.getDocument(USERS_COL, id);
            if (!doc.exists()) {
                throw new RuntimeException("User not found: " + id);
            }
            Map<String, Object> existing = doc.getData();
            if (existing != null) {
                data.forEach((k, v) -> {
                    if (v != null) existing.put(k, v);
                });
                FirestoreClient.setDocument(USERS_COL, id, existing);
                existing.put("id", id);
                System.out.println("[FirestoreAdminService] Updated user: " + id);
                return existing;
            }
        } catch (Exception e) {
            System.err.println("[FirestoreAdminService] Error updating user: " + e.getMessage());
        }
        throw new RuntimeException("User not found: " + id);
    }

    // ============================================================
    // LOANS
    // ============================================================

    public List<Map<String, Object>> getAllLoans() {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            List<QueryDocumentSnapshot> docs = FirestoreClient.getAllDocuments(LOANS_COL);
            for (QueryDocumentSnapshot doc : docs) {
                Map<String, Object> map = doc.getData();
                map.put("id", doc.getId());
                result.add(map);
            }
        } catch (Exception e) {
            System.err.println("[FirestoreAdminService] Error getting loans: " + e.getMessage());
        }
        return result;
    }

    public List<Map<String, Object>> getActiveLoans() {
        return getAllLoans().stream()
                .filter(l -> "ACTIVE".equals(l.get("status")))
                .toList();
    }

    public List<Map<String, Object>> getOverdueLoans() {
        return getAllLoans().stream()
                .filter(l -> "ACTIVE".equals(l.get("status")))
                .filter(l -> {
                    String due = (String) l.get("dueDate");
                    if (due == null) return false;
                    return java.time.LocalDateTime.parse(due).isBefore(java.time.LocalDateTime.now());
                })
                .toList();
    }

    // ============================================================
    // RESERVATIONS
    // ============================================================

    public List<Map<String, Object>> getAllReservations() {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            List<QueryDocumentSnapshot> docs = FirestoreClient.getAllDocuments(RESERVATIONS_COL);
            for (QueryDocumentSnapshot doc : docs) {
                Map<String, Object> map = doc.getData();
                map.put("id", doc.getId());
                result.add(map);
            }
        } catch (Exception e) {
            System.err.println("[FirestoreAdminService] Error getting reservations: " + e.getMessage());
        }
        return result;
    }

    public List<Map<String, Object>> getReservationsForResource(String resourceId) {
        return getAllReservations().stream()
                .filter(r -> resourceId.equals(r.get("resourceId")))
                .toList();
    }

    public void clearReservation(String reservationId) {
        try {
            FirestoreClient.deleteDocument(RESERVATIONS_COL, reservationId);
            System.out.println("[FirestoreAdminService] Cleared reservation: " + reservationId);
        } catch (Exception e) {
            System.err.println("[FirestoreAdminService] Error clearing reservation: " + e.getMessage());
        }
    }

    // ============================================================
    // STATISTICS
    // ============================================================

    public Map<String, Object> getStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalResources", getAllResources().size());
        stats.put("totalUsers", getAllUsers().size());
        stats.put("activeUsers", getAllUsers().stream().filter(u -> Boolean.TRUE.equals(u.get("active"))).count());
        stats.put("totalLoans", getAllLoans().size());
        stats.put("activeLoans", getActiveLoans().size());
        stats.put("overdueLoans", getOverdueLoans().size());
        stats.put("totalReservations", getAllReservations().size());
        stats.put("availableResources", getAllResources().stream().filter(r -> Boolean.TRUE.equals(r.get("available"))).count());
        return stats;
    }
}

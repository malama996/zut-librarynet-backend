package com.zut.librarynet.services;

import com.zut.librarynet.exceptions.*;
import com.zut.librarynet.interfaces.FineCalculator;
import com.zut.librarynet.models.*;
import com.zut.librarynet.config.FirestoreClient;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

public class LibraryService {
    private final Map<String, Member> members;
    private final Map<String, LibraryResource> resources;
    private final Map<String, Loan> loans;
    private final Map<String, List<Loan>> memberLoans;
    private final List<Reservation> reservations;
    private final FineCalculator fineCalculator;
    private final ReservationQueueObserver reservationQueue;

    public LibraryService() {
        this.members = new ConcurrentHashMap<>();
        this.resources = new ConcurrentHashMap<>();
        this.loans = new ConcurrentHashMap<>();
        this.memberLoans = new ConcurrentHashMap<>();
        this.reservations = new ArrayList<>();
        this.fineCalculator = new DefaultFineCalculator();
        this.reservationQueue = ReservationQueueObserver.getInstance();
    }

    private void syncResourcesFromFirebase() {
        if (resources.isEmpty()) {
            try {
                List<com.google.cloud.firestore.QueryDocumentSnapshot> docs =
                        com.zut.librarynet.config.FirestoreClient.getAllDocuments("resources");
                for (com.google.cloud.firestore.QueryDocumentSnapshot doc : docs) {
                    String id = doc.getId();
                    String type = doc.getString("type");
                    String title = doc.getString("title");
                    String publisher = doc.getString("publisher");
                    String author = doc.getString("author");
                    String isbn = doc.getString("isbn");
                    Boolean available = doc.getBoolean("available");
                    if (type != null && title != null && !resources.containsKey(id)) {
                        try {
                            LibraryResource resource = addResource(type,
                                    Map.of("title", title, "publisher", publisher != null ? publisher : "",
                                            "author", author != null ? author : "",
                                            "isbn", isbn != null ? isbn : "",
                                            "available", available != null ? available : true));
                            resources.put(id, resource);
                            System.out.println("[LibraryService] Loaded resource from Firebase: " + title);
                        } catch (Exception e) {
                            System.err.println("[LibraryService] Error loading resource: " + e.getMessage());
                        }
                    }
                }
                System.out.println("[LibraryService] Synced " + resources.size() + " resources from Firebase");
            } catch (Exception e) {
                System.err.println("[LibraryService] Firebase sync error: " + e.getMessage());
            }
        }
    }

    private int safeIntValue(Object obj, int defaultValue) {
        if (obj == null) return defaultValue;
        if (!(obj instanceof Number)) return defaultValue;
        try {
            return ((Number) obj).intValue();
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private int safeIntValue(Object obj) throws IllegalArgumentException {
        if (obj == null) throw new IllegalArgumentException("Numeric value cannot be null");
        if (!(obj instanceof Number)) throw new IllegalArgumentException("Expected numeric value, got: " + obj.getClass().getSimpleName());
        try {
            return ((Number) obj).intValue();
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid numeric value: " + obj);
        }
    }

    // MEMBER MANAGEMENT
    public Member registerMember(String type, Map<String, Object> data) throws IllegalArgumentException {
        String name = (String) data.get("name");
        String email = (String) data.get("email");
        String phone = (String) data.get("phone");
        String normalizedType = type.toLowerCase();

        Member member;
        if (normalizedType.contains("student")) {
            member = new StudentMember(name, email, phone,
                    (String) data.get("studentId"),
                    (String) data.get("programme"),
                    safeIntValue(data.get("yearOfStudy"), 1));
        } else if (normalizedType.contains("lecturer")) {
            member = new LecturerMember(name, email, phone,
                    (String) data.get("employeeId"),
                    (String) data.get("department"),
                    safeIntValue(data.get("yearsOfService"), 0));
        } else if (normalizedType.contains("researcher")) {
            member = new ResearcherMember(name, email, phone,
                    (String) data.get("researcherId"),
                    (String) data.get("institution"),
                    (String) data.get("researchArea"));
        } else {
            throw new IllegalArgumentException("Invalid member type: " + type);
        }

        members.put(member.getId(), member);
        memberLoans.put(member.getId(), new ArrayList<>());
        return member;
    }

    /**
     * Register a member with an external UID (Firebase UID).
     */
    public Member registerMemberWithUid(String uid, String type, Map<String, Object> data) throws IllegalArgumentException {
        String name = (String) data.get("name");
        String email = (String) data.get("email");
        String phone = (String) data.get("phone");
        String normalizedType = type.toLowerCase();

        Member member;
        if (normalizedType.contains("student")) {
            member = new StudentMember(uid, name, email, phone,
                    (String) data.get("studentId"),
                    (String) data.get("programme"),
                    safeIntValue(data.get("yearOfStudy"), 1));
        } else if (normalizedType.contains("lecturer")) {
            member = new LecturerMember(uid, name, email, phone,
                    (String) data.get("employeeId"),
                    (String) data.get("department"),
                    safeIntValue(data.get("yearsOfService"), 0));
        } else if (normalizedType.contains("researcher")) {
            member = new ResearcherMember(uid, name, email, phone,
                    (String) data.get("researcherId"),
                    (String) data.get("institution"),
                    (String) data.get("researchArea"));
        } else {
            throw new IllegalArgumentException("Invalid member type: " + type);
        }

        members.put(uid, member);
        memberLoans.put(uid, new ArrayList<>());
        return member;
    }

    public Member getMember(String memberId) {
        return members.get(memberId);
    }

    public Member getMemberByEmail(String email) {
        if (email == null || email.trim().isEmpty()) return null;
        return members.values().stream()
                .filter(member -> member.getEmail().equalsIgnoreCase(email.trim()))
                .findFirst()
                .orElse(null);
    }

    public List<Member> getAllMembers() {
        return new ArrayList<>(members.values());
    }

    // RESOURCE MANAGEMENT
    public LibraryResource addResource(String type, Map<String, Object> data) throws IllegalArgumentException {
        String title = (String) data.get("title");
        String publisher = (String) data.get("publisher");

        LibraryResource resource;
        switch (type.toLowerCase()) {
            case "book":
                resource = new Book(title, publisher,
                        (String) data.get("isbn"),
                        (String) data.get("author"),
                        (String) data.get("edition"));
                break;
            case "journal":
                resource = new Journal(title, publisher,
                        (String) data.get("issn"),
                        safeIntValue(data.get("volume")),
                        safeIntValue(data.get("issue")));
                break;
            case "digital":
                resource = new DigitalResource(title, publisher,
                        (String) data.get("url"),
                        LocalDate.parse((String) data.get("licenceExpiry")));
                break;
            default:
                throw new IllegalArgumentException("Invalid resource type: " + type);
        }

        resources.put(resource.getId(), resource);
        return resource;
    }

    public LibraryResource getResource(String resourceId) {
        syncResourcesFromFirebase();
        return resources.get(resourceId);
    }

    public List<LibraryResource> getAllResources() {
        syncResourcesFromFirebase();
        return new ArrayList<>(resources.values());
    }

    // LOAN MANAGEMENT
    public Loan borrowResource(String memberId, String resourceId) throws LibraryException {
        syncResourcesFromFirebase();
        Member member = members.get(memberId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found: " + memberId);
        }

        LibraryResource resource = resources.get(resourceId);
        if (resource == null) {
            throw new ResourceNotFoundException("Resource not found: " + resourceId);
        }

        if (!resource.canBeBorrowed()) {
            throw new ResourceNotAvailableException(
                    "Digital resources cannot be physically borrowed. Access is available online at: " +
                            ((DigitalResource) resource).getUrl());
        }

        if (member instanceof ResearcherMember && !(resource instanceof Journal)) {
            throw new ResourceNotAvailableException(
                    "Researchers are restricted to borrowing Journals only. This resource is a " +
                            resource.getResourceType());
        }

        if (!resource.isAvailable()) {
            Queue<Reservation> queue = reservationQueue.getQueueForResource(resourceId);
            if (!queue.isEmpty()) {
                throw new ResourceNotAvailableException(
                        String.format("Resource is reserved. %d people are waiting.", queue.size()));
            }
            throw new ResourceNotAvailableException("Resource is currently on loan");
        }

        if (!member.canBorrow()) {
            if (member.getTotalUnpaidFines() > 50) {
                throw new FinesOutstandingException(
                        String.format("Member has unpaid fines of ZMW %.2f. Clear fines to borrow.",
                                member.getTotalUnpaidFines()));
            }
            if (member.getActiveLoans().size() >= member.getMaxBorrowLimit()) {
                throw new BorrowLimitExceededException(
                        String.format("Member has reached borrow limit of %d items",
                                member.getMaxBorrowLimit()));
            }
        }

        Loan loan = new Loan(member, resource);
        loans.put(loan.getId(), loan);
        memberLoans.get(memberId).add(loan);
        loan.addObserver(reservationQueue);

        return loan;
    }

    public ReturnResult returnResource(String loanId) throws LibraryException {
        Loan loan = loans.get(loanId);
        if (loan == null) {
            throw new ResourceNotFoundException("Loan not found: " + loanId);
        }

        Member nextReservedUser = reservationQueue.notifyResourceReturned(loan);
        loan.returnResource(nextReservedUser);

        return new ReturnResult(loan.getAssociatedFine(), nextReservedUser);
    }

    public static class ReturnResult {
        private final Fine fine;
        private final Member nextReservedUser;

        public ReturnResult(Fine fine, Member nextReservedUser) {
            this.fine = fine;
            this.nextReservedUser = nextReservedUser;
        }

        public Fine getFine() { return fine; }
        public Member getNextReservedUser() { return nextReservedUser; }
    }

    public List<Loan> getMemberLoans(String memberId) {
        return memberLoans.getOrDefault(memberId, new ArrayList<>());
    }

    public List<Loan> getActiveLoans() {
        return loans.values().stream()
                .filter(loan -> loan.getStatus().equals("ACTIVE"))
                .collect(Collectors.toList());
    }

    // FINE MANAGEMENT
    public List<Fine> getMemberFines(String memberId) {
        Member member = members.get(memberId);
        if (member == null) return new ArrayList<>();
        return member.getUnpaidFines();
    }

    public void payFine(String memberId, String fineId) throws LibraryException {
        Member member = members.get(memberId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found: " + memberId);
        }

        Fine fineToPay = member.getUnpaidFines().stream()
                .filter(fine -> fine.getId().equals(fineId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Fine not found: " + fineId));

        member.payFine(fineToPay);
    }

    public Member getNextWaitingMember(String resourceId) {
        return reservations.stream()
                .filter(r -> r.getResource().getId().equals(resourceId))
                .filter(r -> "PENDING".equals(r.getStatus()))
                .findFirst()
                .map(Reservation::getMember)
                .orElse(null);
    }

    // RESERVATION MANAGEMENT
    public Reservation createReservation(String memberId, String resourceId) throws LibraryException {
        syncResourcesFromFirebase();

        Member member = members.get(memberId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found: " + memberId);
        }

        LibraryResource resource = resources.get(resourceId);
        if (resource == null) {
            throw new ResourceNotFoundException("Resource not found: " + resourceId);
        }

        if (resource.isAvailable()) {
            throw new ResourceAvailableException("Resource is available for immediate borrowing");
        }

        boolean alreadyReserved = reservations.stream()
                .anyMatch(r -> r.getMember().getId().equals(memberId) &&
                        r.getResource().getId().equals(resourceId) &&
                        r.getStatus().equals("PENDING"));

        if (alreadyReserved) {
            throw new LibraryException("You already have a pending reservation for this resource");
        }

        Reservation reservation = new Reservation(member, resource);
        reservations.add(reservation);
        reservationQueue.addReservation(reservation);

        return reservation;
    }

    public List<Reservation> getMemberReservations(String memberId) {
        return reservations.stream()
                .filter(r -> r.getMember().getId().equals(memberId))
                .collect(Collectors.toList());
    }

    public List<Reservation> getAllReservations() {
        return new ArrayList<>(reservations);
    }

    public void cancelReservation(String reservationId) throws LibraryException {
        Reservation reservation = reservations.stream()
                .filter(r -> r.getId().equals(reservationId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));

        reservation.cancel();
        reservationQueue.removeReservation(reservation);
    }

    // UTILITY METHODS
    public List<LibraryResource> getAvailableResources() {
        syncResourcesFromFirebase();
        return resources.values().stream()
                .filter(LibraryResource::isAvailable)
                .collect(Collectors.toList());
    }

    public List<LibraryResource> getResourcesByType(String type) {
        return resources.values().stream()
                .filter(r -> r.getResourceType().equalsIgnoreCase(type))
                .collect(Collectors.toList());
    }

    public List<LibraryResource> searchResources(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }

        syncResourcesFromFirebase();
        String lowerQuery = query.toLowerCase();
        return resources.values().stream()
                .filter(r -> {
                    String title = r.getTitle().toLowerCase();
                    String publisher = r.getPublisher().toLowerCase();

                    if (r instanceof Book) {
                        String author = ((Book) r).getAuthor().toLowerCase();
                        return title.contains(lowerQuery) || author.contains(lowerQuery) || publisher.contains(lowerQuery);
                    }

                    return title.contains(lowerQuery) || publisher.contains(lowerQuery);
                })
                .collect(Collectors.toList());
    }

    public List<Loan> getOverdueLoans() {
        return loans.values().stream()
                .filter(Loan::isOverdue)
                .collect(Collectors.toList());
    }

    public void extendLoan(String loanId, int additionalDays) throws LibraryException {
        Loan loan = loans.get(loanId);
        if (loan == null) {
            throw new ResourceNotFoundException("Loan not found: " + loanId);
        }
        loan.extendDueDate(additionalDays);
    }

    public Map<String, Long> getStatistics() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("totalMembers", (long) members.size());
        stats.put("totalResources", (long) resources.size());
        stats.put("activeLoans", (long) getActiveLoans().size());
        stats.put("availableResources", (long) getAvailableResources().size());
        stats.put("pendingReservations", reservations.stream()
                .filter(r -> r.getStatus().equals("PENDING"))
                .count());
        return stats;
    }
}

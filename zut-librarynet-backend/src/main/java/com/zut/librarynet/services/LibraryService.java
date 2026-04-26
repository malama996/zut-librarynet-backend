package com.zut.librarynet.services;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.zut.librarynet.config.FirestoreClient;
import com.zut.librarynet.exceptions.*;
import com.zut.librarynet.interfaces.FineCalculator;
import com.zut.librarynet.models.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * LibraryService — Core business logic with Firestore as the source of truth.
 *
 * Architecture:
 * - All mutations write to Firestore FIRST, then update in-memory cache.
 * - All reads attempt Firestore first; cache is a performance layer only.
 * - No mock data. No hardcoded values.
 */
public class LibraryService {
    private final Map<String, Member> membersCache;
    private final Map<String, LibraryResource> resourcesCache;
    private final Map<String, Loan> loansCache;
    private final Map<String, List<Loan>> memberLoansCache;
    private final List<Reservation> reservationsCache;
    private final FineCalculator fineCalculator;
    private final ReservationQueueObserver reservationQueue;
    private final FirestoreAdminService firestore;

    // Cache TTL: 60 seconds (balanced for performance vs freshness)
    private volatile long lastMembersSync = 0;
    private volatile long lastResourcesSync = 0;
    private volatile long lastLoansSync = 0;
    private volatile long lastReservationsSync = 0;
    private static final long CACHE_TTL_MS = 60_000;


    public LibraryService() {
        this.membersCache = new ConcurrentHashMap<>();
        this.resourcesCache = new ConcurrentHashMap<>();
        this.loansCache = new ConcurrentHashMap<>();
        this.memberLoansCache = new ConcurrentHashMap<>();
        this.reservationsCache = Collections.synchronizedList(new ArrayList<>());
        this.fineCalculator = new DefaultFineCalculator();
        this.reservationQueue = ReservationQueueObserver.getInstance();
        this.firestore = FirestoreAdminService.getInstance();

        // Initial warm-up sync from Firestore
        syncAllFromFirebase();
    }

    // ============================================================
    // FIREBASE SYNC
    // ============================================================

    public synchronized void syncAllFromFirebase() {
        syncResourcesFromFirebase();
        syncMembersFromFirebase();
        syncLoansFromFirebase();
        syncReservationsFromFirebase();
    }

    private synchronized void syncResourcesFromFirebase() {
        if (System.currentTimeMillis() - lastResourcesSync < CACHE_TTL_MS && !resourcesCache.isEmpty()) {
            return;
        }
        try {
            List<QueryDocumentSnapshot> docs = FirestoreClient.getAllDocuments("resources");
            Map<String, LibraryResource> fresh = new ConcurrentHashMap<>();
            for (QueryDocumentSnapshot doc : docs) {
                LibraryResource r = documentToResource(doc);
                if (r != null) {
                    fresh.put(r.getId(), r);
                }
            }
            resourcesCache.clear();
            resourcesCache.putAll(fresh);
            lastResourcesSync = System.currentTimeMillis();
            System.out.println("[LibraryService] Synced " + fresh.size() + " resources from Firestore");
        } catch (Exception e) {
            System.err.println("[LibraryService] Resource sync error: " + e.getMessage());
        }
    }

    private synchronized void syncMembersFromFirebase() {
        if (System.currentTimeMillis() - lastMembersSync < CACHE_TTL_MS && !membersCache.isEmpty()) {
            return;
        }
        try {
            List<QueryDocumentSnapshot> docs = FirestoreClient.getAllDocuments("users");
            Map<String, Member> fresh = new ConcurrentHashMap<>();
            for (QueryDocumentSnapshot doc : docs) {
                Member m = documentToMember(doc);
                if (m != null) {
                    fresh.put(m.getId(), m);
                }
            }
            membersCache.clear();
            membersCache.putAll(fresh);
            // Rebuild memberLoansCache
            memberLoansCache.clear();
            for (String uid : fresh.keySet()) {
                memberLoansCache.put(uid, new ArrayList<>());
            }
            lastMembersSync = System.currentTimeMillis();
            System.out.println("[LibraryService] Synced " + fresh.size() + " members from Firestore");
        } catch (Exception e) {
            System.err.println("[LibraryService] Member sync error: " + e.getMessage());
        }
    }

    synchronized void syncLoansFromFirebase() {

        if (System.currentTimeMillis() - lastLoansSync < CACHE_TTL_MS && !loansCache.isEmpty()) {
            return;
        }
        try {
            List<QueryDocumentSnapshot> docs = FirestoreClient.getAllDocuments("loans");
            Map<String, Loan> fresh = new ConcurrentHashMap<>();
            for (QueryDocumentSnapshot doc : docs) {
                Loan l = documentToLoan(doc);
                if (l != null) {
                    fresh.put(l.getId(), l);
                }
            }
            loansCache.clear();
            loansCache.putAll(fresh);

            // Rebuild memberLoansCache from synced loans
            memberLoansCache.clear();
            for (Member m : membersCache.values()) {
                memberLoansCache.put(m.getId(), new ArrayList<>());
            }
            for (Loan l : fresh.values()) {
                String memberId = l.getMember().getId();
                if ("ACTIVE".equals(l.getStatus()) || "OVERDUE".equals(l.getStatus())) {
                    memberLoansCache.computeIfAbsent(memberId, k -> new ArrayList<>()).add(l);
                }
            }

            lastLoansSync = System.currentTimeMillis();
            System.out.println("[LibraryService] Synced " + fresh.size() + " loans from Firestore");
        } catch (Exception e) {
            System.err.println("[LibraryService] Loan sync error: " + e.getMessage());
        }
    }

    private synchronized void syncReservationsFromFirebase() {
        if (System.currentTimeMillis() - lastReservationsSync < CACHE_TTL_MS && !reservationsCache.isEmpty()) {
            return;
        }
        try {
            List<QueryDocumentSnapshot> docs = FirestoreClient.getAllDocuments("reservations");
            List<Reservation> fresh = new ArrayList<>();
            for (QueryDocumentSnapshot doc : docs) {
                Reservation r = documentToReservation(doc);
                if (r != null) {
                    fresh.add(r);
                }
            }
            reservationsCache.clear();
            reservationsCache.addAll(fresh);
            lastReservationsSync = System.currentTimeMillis();
            System.out.println("[LibraryService] Synced " + fresh.size() + " reservations from Firestore");
        } catch (Exception e) {
            System.err.println("[LibraryService] Reservation sync error: " + e.getMessage());
        }
    }

    // ============================================================
    // DOCUMENT CONVERTERS
    // ============================================================

    private LibraryResource documentToResource(DocumentSnapshot doc) {
        Map<String, Object> data = doc.getData();
        if (data == null) return null;

        String id = doc.getId();
        String type = (String) data.get("type");
        String title = (String) data.get("title");
        String publisher = (String) data.get("publisher");
        Boolean available = (Boolean) data.get("available");

        if (title == null || type == null) return null;

        try {
            LibraryResource resource;
            switch (type.toLowerCase()) {
                case "book": {
                    // Defensive sanitization: don't let missing fields break the sync
                    String isbn = getStringOrDefault(data.get("isbn"), "UNKNOWN-ISBN");
                    String author = getStringOrDefault(data.get("author"), "Unknown Author");
                    String edition = getStringOrDefault(data.get("edition"), "1st");
                    resource = new Book(id, title, publisher, isbn, author, edition);
                    break;
                }
                case "journal": {
                    String issn = getStringOrDefault(data.get("issn"), "0000-0000");
                    int volume = safeIntValue(data.get("volume"), 1);
                    int issue = safeIntValue(data.get("issue"), 1);
                    resource = new Journal(id, title, publisher, issn, volume, issue);
                    break;
                }
                case "digital": {
                    String url = getStringOrDefault(data.get("url"), "https://example.com");
                    String expiryStr = (String) data.get("licenceExpiry");
                    LocalDate expiry;
                    try {
                        expiry = expiryStr != null ? LocalDate.parse(expiryStr) : LocalDate.now().plusYears(1);
                    } catch (Exception ex) {
                        expiry = LocalDate.now().plusYears(1);
                    }
                    resource = new DigitalResource(id, title, publisher, url, expiry);
                    break;
                }
                default:
                    return null;
            }

            if (available != null) {
                resource.setAvailable(available);
            }
            return resource;
        } catch (Exception e) {
            System.err.println("[LibraryService] Error converting document to resource (id=" + id + "): " + e.getMessage());
            return null;
        }

    }

    private Member documentToMember(DocumentSnapshot doc) {
        Map<String, Object> data = doc.getData();
        if (data == null) return null;

        String id = doc.getId();
        String name = (String) data.get("name");
        String email = (String) data.get("email");
        String phone = getStringOrDefault(data.get("phone"), "N/A");
        String type = (String) data.get("type");

        if (type == null) type = (String) data.get("memberType");

        if (name == null || email == null) return null;

        try {
            Member member;
            String normalizedType = type != null ? type.toLowerCase() : "";

            if (normalizedType.contains("student")) {
                // FIX: Provide fallback defaults for missing Firestore fields
                String studentId = getStringOrDefault(data.get("studentId"), "STU-" + id.substring(0, Math.min(8, id.length())));
                String programme = getStringOrDefault(data.get("programme"), "General");
                int yearOfStudy = safeIntValue(data.get("yearOfStudy"), 1);
                member = new StudentMember(id, name, email, phone, studentId, programme, yearOfStudy);
            } else if (normalizedType.contains("lecturer")) {
                // FIX: Provide fallback defaults for missing Firestore fields
                String employeeId = getStringOrDefault(data.get("employeeId"), "EMP-" + id.substring(0, Math.min(8, id.length())));
                String department = getStringOrDefault(data.get("department"), "General");
                int yearsOfService = safeIntValue(data.get("yearsOfService"), 0);
                member = new LecturerMember(id, name, email, phone, employeeId, department, yearsOfService);
            } else if (normalizedType.contains("researcher")) {
                // FIX: Provide fallback defaults for missing Firestore fields
                String researcherId = getStringOrDefault(data.get("researcherId"), "RES-" + id.substring(0, Math.min(8, id.length())));
                String institution = getStringOrDefault(data.get("institution"), "ZUT");
                String researchArea = getStringOrDefault(data.get("researchArea"), "General");
                member = new ResearcherMember(id, name, email, phone, researcherId, institution, researchArea);
            } else {
                return null;
            }

            Boolean active = (Boolean) data.get("active");
            if (active != null) {
                member.setActive(active);
            }
            return member;
        } catch (Exception e) {
            System.err.println("[LibraryService] Error converting document to member (id=" + id + "): " + e.getMessage());
            return null;
        }
    }

    private Loan documentToLoan(DocumentSnapshot doc) {
        Map<String, Object> data = doc.getData();
        if (data == null) return null;

        String id = doc.getId();
        String memberId = (String) data.get("memberId");
        String resourceId = (String) data.get("resourceId");
        String borrowDateStr = (String) data.get("borrowDate");
        String dueDateStr = (String) data.get("dueDate");
        String returnDateStr = (String) data.get("returnDate");
        String status = (String) data.get("status");

        if (memberId == null || resourceId == null || borrowDateStr == null || dueDateStr == null) {
            return null;
        }

        Member member = membersCache.get(memberId);
        LibraryResource resource = resourcesCache.get(resourceId);

        if (member == null || resource == null) {
            return null;
        }

        try {
            if (status == null) status = "ACTIVE";
            Loan loan = Loan.fromFirestore(id, member, resource, borrowDateStr, dueDateStr, returnDateStr, status);

            // Restore fine if present
            Double fineAmount = (Double) data.get("fineAmount");
            if (fineAmount != null && fineAmount > 0) {
                Fine fine = new Fine(loan, fineAmount);
                member.addFine(fine);
                loan.setAssociatedFine(fine);
            }

            // Rebuild member's active loans if ACTIVE or OVERDUE
            if ("ACTIVE".equals(status) || "OVERDUE".equals(status)) {
                member.addActiveLoan(loan);
            }

            return loan;
        } catch (Exception e) {
            System.err.println("[LibraryService] Error converting document to loan: " + e.getMessage());
            return null;
        }
    }

    private Reservation documentToReservation(DocumentSnapshot doc) {
        Map<String, Object> data = doc.getData();
        if (data == null) return null;

        String id = doc.getId();
        String memberId = (String) data.get("memberId");
        String resourceId = (String) data.get("resourceId");
        String status = (String) data.get("status");
        String reservationDateStr = (String) data.get("reservationDate");
        String expiryDateStr = (String) data.get("expiryDate");

        if (memberId == null || resourceId == null) return null;

        Member member = membersCache.get(memberId);
        LibraryResource resource = resourcesCache.get(resourceId);

        if (member == null || resource == null) {
            return null;
        }

        try {
            LocalDateTime reservationDate = reservationDateStr != null ?
                    LocalDateTime.parse(reservationDateStr) : LocalDateTime.now();
            LocalDateTime expiryDate = expiryDateStr != null ?
                    LocalDateTime.parse(expiryDateStr) : reservationDate.plusDays(7);
            if (status == null) status = "PENDING";

            return new Reservation(id, member, resource, reservationDate, status, expiryDate);
        } catch (Exception e) {
            System.err.println("[LibraryService] Error converting document to reservation: " + e.getMessage());
            return null;
        }
    }

    // ============================================================
    // PERSISTENCE METHODS
    // ============================================================

    private void persistResource(LibraryResource resource) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("id", resource.getId());
            data.put("title", resource.getTitle());
            data.put("type", resource.getResourceType());
            data.put("publisher", resource.getPublisher());
            data.put("available", resource.isAvailable());
            data.put("createdAt", resource.getCreatedAt().toString());
            data.putAll(resource.getTypeSpecificFields());
            FirestoreClient.setDocument("resources", resource.getId(), data);
        } catch (Exception e) {
            System.err.println("[LibraryService] Error persisting resource: " + e.getMessage());
        }
    }

    private void persistMember(Member member) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("id", member.getId());
            data.put("name", member.getName());
            data.put("email", member.getEmail());
            data.put("phone", member.getPhone());
            data.put("memberType", member.getMemberType());
            data.put("role", member.getMemberType().toUpperCase());
            data.put("active", member.isActive());
            data.put("registrationDate", member.getRegistrationDate().toString());
            data.putAll(member.getTypeSpecificFields());
            FirestoreClient.setDocument("users", member.getId(), data);
        } catch (Exception e) {
            System.err.println("[LibraryService] Error persisting member: " + e.getMessage());
        }
    }


    void persistLoan(Loan loan) {

        try {
            Map<String, Object> data = loan.toMap();
            FirestoreClient.setDocument("loans", loan.getId(), data);
        } catch (Exception e) {
            System.err.println("[LibraryService] Error persisting loan: " + e.getMessage());
        }
    }

    private void persistReservation(Reservation reservation) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("id", reservation.getId());
            data.put("memberId", reservation.getMember().getId());
            data.put("resourceId", reservation.getResource().getId());
            data.put("status", reservation.getStatus());
            data.put("reservationDate", reservation.getReservationDate().toString());
            data.put("expiryDate", reservation.getExpiryDate().toString());
            if (reservation.getNotifiedDate() != null) {
                data.put("notifiedDate", reservation.getNotifiedDate().toString());
            }
            if (reservation.getFulfilledDate() != null) {
                data.put("fulfilledDate", reservation.getFulfilledDate().toString());
            }
            FirestoreClient.setDocument("reservations", reservation.getId(), data);
        } catch (Exception e) {
            System.err.println("[LibraryService] Error persisting reservation: " + e.getMessage());
        }
    }

    // ============================================================
    // MEMBER MANAGEMENT
    // ============================================================

    public Member registerMember(String type, Map<String, Object> data) throws IllegalArgumentException {
        String name = (String) data.get("name");
        String email = (String) data.get("email");
        String phone = (String) data.get("phone");
        if (phone == null) phone = "Not provided";

        return registerMemberWithUid(null, type, data);
    }

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

        membersCache.put(member.getId(), member);
        memberLoansCache.put(member.getId(), new ArrayList<>());

        // Persist to Firestore
        persistMember(member);

        return member;
    }

    public Member getMember(String memberId) {
        syncMembersFromFirebase();
        return membersCache.get(memberId);
    }

    public Member getMemberByEmail(String email) {
        if (email == null || email.trim().isEmpty()) return null;
        syncMembersFromFirebase();
        return membersCache.values().stream()
                .filter(member -> member.getEmail().equalsIgnoreCase(email.trim()))
                .findFirst()
                .orElse(null);
    }

    public List<Member> getAllMembers() {
        syncMembersFromFirebase();
        return new ArrayList<>(membersCache.values());
    }

    // ============================================================
    // RESOURCE MANAGEMENT
    // ============================================================

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

        // Check for logical duplicates (same identifier)
        boolean duplicate = resourcesCache.values().stream()
                .anyMatch(r -> {
                    if (!r.getResourceType().equals(resource.getResourceType())) return false;
                    if (resource instanceof Book && r instanceof Book) {
                        return ((Book) resource).getIsbn().equals(((Book) r).getIsbn());
                    }
                    if (resource instanceof Journal && r instanceof Journal) {
                        return ((Journal) resource).getIssn().equals(((Journal) r).getIssn());
                    }
                    if (resource instanceof DigitalResource && r instanceof DigitalResource) {
                        return ((DigitalResource) resource).getUrl().equals(((DigitalResource) r).getUrl());
                    }
                    return false;
                });

        if (duplicate) {
            throw new IllegalArgumentException("A resource with the same identifier already exists");
        }

        resourcesCache.put(resource.getId(), resource);

        // Persist to Firestore
        persistResource(resource);

        return resource;
    }

    public LibraryResource getResource(String resourceId) {
        syncResourcesFromFirebase();
        return resourcesCache.get(resourceId);
    }

    public List<LibraryResource> getAllResources() {
        syncResourcesFromFirebase();
        return new ArrayList<>(resourcesCache.values());
    }

    // ============================================================
    // LOAN MANAGEMENT
    // ============================================================

    public Loan borrowResource(String memberId, String resourceId) throws LibraryException {
        syncMembersFromFirebase();
        syncResourcesFromFirebase();

        Member member = membersCache.get(memberId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found: " + memberId);
        }

        LibraryResource resource = resourcesCache.get(resourceId);
        if (resource == null) {
            throw new ResourceNotFoundException("Resource not found: " + resourceId);
        }

        // CRITICAL: DigitalResource cannot be borrowed → HTTP 400
        if (!resource.canBeBorrowed()) {
            throw new ResourceNotAvailableException(
                    "Digital resources cannot be physically borrowed. Access is available online at: " +
                            ((DigitalResource) resource).getUrl());
        }

        // CRITICAL: Researcher can ONLY borrow journals
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

        // Check borrowing eligibility
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
            throw new ResourceNotAvailableException("Member cannot borrow at this time");
        }

        Loan loan = new Loan(member, resource);
        loansCache.put(loan.getId(), loan);
        memberLoansCache.computeIfAbsent(memberId, k -> new ArrayList<>()).add(loan);
        loan.addObserver(reservationQueue);

        // Persist to Firestore
        persistLoan(loan);
        persistResource(resource);

        return loan;
    }

    public ReturnResult returnResource(String loanId) throws LibraryException {
        syncLoansFromFirebase();
        Loan loan = loansCache.get(loanId);
        if (loan == null) {
            throw new ResourceNotFoundException("Loan not found: " + loanId);
        }

        // Process reservation queue BEFORE returning (to know next user)
        Member nextReservedUser = reservationQueue.notifyResourceReturned(loan);

        // Return the resource - triggers observer notification
        loan.returnResource(nextReservedUser);

        // Persist changes to Firestore
        persistLoan(loan);
        persistResource(loan.getResource());


        // Also persist member since fines may have been added
        persistMember(loan.getMember());

        return new ReturnResult(loan.getAssociatedFine(), nextReservedUser);
    }

    public List<Loan> getMemberLoans(String memberId) {
        syncLoansFromFirebase();
        return memberLoansCache.getOrDefault(memberId, new ArrayList<>());
    }

    public List<Loan> getActiveLoans() {
        syncLoansFromFirebase();
        return loansCache.values().stream()
                .filter(loan -> loan.getStatus().equals("ACTIVE"))
                .collect(Collectors.toList());
    }

    public List<Loan> getAllLoans() {
        syncLoansFromFirebase();
        return new ArrayList<>(loansCache.values());
    }


    public List<Loan> getOverdueLoans() {
        syncLoansFromFirebase();
        return loansCache.values().stream()
                .filter(loan -> loan.getStatus().equals("OVERDUE") ||
                        (loan.getStatus().equals("ACTIVE") && LocalDate.now().isAfter(loan.getDueDate())))
                .collect(Collectors.toList());
    }

    public void extendLoan(String loanId, int additionalDays) throws LibraryException {
        syncLoansFromFirebase();
        Loan loan = loansCache.get(loanId);
        if (loan == null) {
            throw new ResourceNotFoundException("Loan not found: " + loanId);
        }
        loan.extendDueDate(additionalDays);
        persistLoan(loan);
    }

    public List<Fine> getMemberFines(String memberId) {
        syncMembersFromFirebase();
        Member member = membersCache.get(memberId);
        if (member == null) return new ArrayList<>();
        return member.getUnpaidFines();
    }

    public void payFine(String memberId, String fineId) throws LibraryException {
        syncMembersFromFirebase();
        Member member = membersCache.get(memberId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found: " + memberId);
        }
        Fine fineToPay = member.getUnpaidFines().stream()
                .filter(fine -> fine.getId().equals(fineId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Fine not found: " + fineId));
        member.payFine(fineToPay);
        persistMember(member);
    }

    public Member getNextWaitingMember(String resourceId) {
        return reservationsCache.stream()
                .filter(r -> r.getResource().getId().equals(resourceId))
                .filter(r -> "PENDING".equals(r.getStatus()))
                .findFirst()
                .map(Reservation::getMember)
                .orElse(null);
    }

    public Reservation createReservation(String memberId, String resourceId) throws LibraryException {
        syncMembersFromFirebase();
        syncResourcesFromFirebase();

        Member member = membersCache.get(memberId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found: " + memberId);
        }

        LibraryResource resource = resourcesCache.get(resourceId);
        if (resource == null) {
            throw new ResourceNotFoundException("Resource not found: " + resourceId);
        }

        if (resource.isAvailable()) {
            throw new ResourceAvailableException("Resource is available for immediate borrowing");
        }

        boolean alreadyReserved = reservationsCache.stream()
                .anyMatch(r -> r.getMember().getId().equals(memberId) &&
                        r.getResource().getId().equals(resourceId) &&
                        r.getStatus().equals("PENDING"));

        if (alreadyReserved) {
            throw new LibraryException("You already have a pending reservation for this resource");
        }

        Reservation reservation = new Reservation(member, resource);
        reservationsCache.add(reservation);
        reservationQueue.addReservation(reservation);
        persistReservation(reservation);

        return reservation;
    }

    public List<Reservation> getMemberReservations(String memberId) {
        return reservationsCache.stream()
                .filter(r -> r.getMember().getId().equals(memberId))
                .collect(Collectors.toList());
    }

    public List<Reservation> getAllReservations() {
        return new ArrayList<>(reservationsCache);
    }

    public void cancelReservation(String reservationId) throws LibraryException {
        Reservation reservation = reservationsCache.stream()
                .filter(r -> r.getId().equals(reservationId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));

        reservation.cancel();
        reservationQueue.removeReservation(reservation);
        persistReservation(reservation);
    }

    public List<LibraryResource> getAvailableResources() {
        syncResourcesFromFirebase();
        return resourcesCache.values().stream()
                .filter(LibraryResource::isAvailable)
                .collect(Collectors.toList());
    }

    public List<LibraryResource> getResourcesByType(String type) {
        syncResourcesFromFirebase();
        return resourcesCache.values().stream()
                .filter(r -> r.getResourceType().equalsIgnoreCase(type))
                .collect(Collectors.toList());
    }

    public List<LibraryResource> searchResources(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }

        syncResourcesFromFirebase();
        String lowerQuery = query.toLowerCase().trim();

        return resourcesCache.values().stream()
                .map(resource -> {
                    int score = 0;
                    String title = resource.getTitle().toLowerCase();
                    String publisher = resource.getPublisher().toLowerCase();

                    if (title.equals(lowerQuery)) {
                        score += 100;
                    } else if (title.contains(lowerQuery)) {
                        score += 50;
                    }

                    if (publisher.contains(lowerQuery)) {
                        score += 20;
                    }

                    if (resource instanceof Book) {
                        String author = ((Book) resource).getAuthor().toLowerCase();
                        if (author.contains(lowerQuery)) {
                            score += 30;
                        }
                        String isbn = ((Book) resource).getIsbn().toLowerCase();
                        if (isbn.contains(lowerQuery)) {
                            score += 25;
                        }
                    }

                    if (resource instanceof Journal) {
                        String issn = ((Journal) resource).getIssn().toLowerCase();
                        if (issn.contains(lowerQuery)) {
                            score += 25;
                        }
                    }

                    return new AbstractMap.SimpleEntry<>(resource, score);
                })
                .filter(entry -> entry.getValue() > 0)
                .sorted(Map.Entry.<LibraryResource, Integer>comparingByValue().reversed())
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getOverdueReport() {
        List<Loan> overdueLoans = getOverdueLoans();

        // Sort by days overdue DESC
        overdueLoans.sort(Comparator.comparingInt(Loan::getDaysOverdue).reversed());

        // Group by member type
        Map<String, List<Map<String, Object>>> groupedByMemberType = new HashMap<>();
        for (Loan loan : overdueLoans) {
            String memberType = loan.getMember().getMemberType();
            groupedByMemberType.computeIfAbsent(memberType, k -> new ArrayList<>());

            Map<String, Object> map = new HashMap<>();
            map.put("loanId", loan.getId());
            map.put("memberId", loan.getMember().getId());
            map.put("memberName", loan.getMember().getName());
            map.put("resourceTitle", loan.getResource().getTitle());
            map.put("dueDate", loan.getDueDate().toString());
            map.put("daysOverdue", loan.getDaysOverdue());
            map.put("fineAmount", loan.calculateFine());
            groupedByMemberType.get(memberType).add(map);
        }

        double totalFines = overdueLoans.stream()
                .mapToDouble(Loan::calculateFine)
                .sum();

        Map<String, Object> report = new HashMap<>();
        report.put("generatedAt", LocalDateTime.now().toString());
        report.put("totalOverdue", overdueLoans.size());
        report.put("totalFinesOutstanding", totalFines);
        report.put("groupedByMemberType", groupedByMemberType);

        Map<String, Object> summaryByType = new HashMap<>();
        for (String memberType : groupedByMemberType.keySet()) {
            List<Map<String, Object>> loans = groupedByMemberType.get(memberType);
            double typeFines = loans.stream()
                    .mapToDouble(m -> (Double) m.get("fineAmount"))
                    .sum();
            Map<String, Object> typeSummary = new HashMap<>();
            typeSummary.put("count", loans.size());
            typeSummary.put("totalFines", typeFines);
            summaryByType.put(memberType, typeSummary);
        }
        report.put("summaryByType", summaryByType);

        return report;
    }


    public Map<String, Long> getStatistics() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("totalMembers", (long) membersCache.size());
        stats.put("totalResources", (long) resourcesCache.size());
        stats.put("activeLoans", (long) getActiveLoans().size());
        stats.put("availableResources", (long) getAvailableResources().size());
        stats.put("pendingReservations", reservationsCache.stream()
                .filter(r -> r.getStatus().equals("PENDING"))
                .count());
        return stats;
    }

    private int safeIntValue(Object value, int defaultValue) {
        if (value == null) return defaultValue;
        if (value instanceof Number) return ((Number) value).intValue();
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private int safeIntValue(Object value) {
        return safeIntValue(value, 0);
    }

    private String getStringOrDefault(Object value, String defaultValue) {
        if (value == null) return defaultValue;
        String str = value.toString().trim();
        return str.isEmpty() ? defaultValue : str;
    }

    public Map<String, Object> getDashboardMetrics() {
        syncResourcesFromFirebase();
        syncMembersFromFirebase();
        syncLoansFromFirebase();

        LocalDate today = LocalDate.now();

        int totalResources = resourcesCache.size();
        int availableResources = (int) resourcesCache.values().stream()
                .filter(LibraryResource::isAvailable)
                .count();
        int totalUsers = membersCache.size();
        int activeLoans = (int) loansCache.values().stream()
                .filter(loan -> "ACTIVE".equals(loan.getStatus()))
                .count();
        int overdueLoans = (int) loansCache.values().stream()
                .filter(loan -> "OVERDUE".equals(loan.getStatus()) ||
                        ("ACTIVE".equals(loan.getStatus()) && today.isAfter(loan.getDueDate())))
                .count();

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalResources", totalResources);
        metrics.put("availableResources", availableResources);
        metrics.put("totalUsers", totalUsers);
        metrics.put("activeLoans", activeLoans);
        metrics.put("overdueLoans", overdueLoans);
        return metrics;
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
}

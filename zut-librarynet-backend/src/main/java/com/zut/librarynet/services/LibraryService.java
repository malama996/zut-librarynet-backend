package com.zut.librarynet.services;

import com.zut.librarynet.exceptions.*;
import com.zut.librarynet.interfaces.FineCalculator;
import com.zut.librarynet.models.*;
import com.zut.librarynet.models.Loan;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

public class LibraryService {
    // Data storage with ENCAPSULATION
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

    // MEMBER MANAGEMENT
    public Member registerMember(String type, Map<String, Object> data) throws IllegalArgumentException {
        String name = (String) data.get("name");
        String email = (String) data.get("email");
        String phone = (String) data.get("phone");

        Member member;
        switch (type.toLowerCase()) {
            case "student":
                member = new StudentMember(name, email, phone,
                        (String) data.get("studentId"),
                        (String) data.get("programme"),
                        ((Number) data.get("yearOfStudy")).intValue());
                break;
            case "lecturer":
                member = new LecturerMember(name, email, phone,
                        (String) data.get("employeeId"),
                        (String) data.get("department"),
                        ((Number) data.get("yearsOfService")).intValue());
                break;
            case "researcher":
                member = new ResearcherMember(name, email, phone,
                        (String) data.get("researcherId"),
                        (String) data.get("institution"),
                        (String) data.get("researchArea"));
                break;
            default:
                throw new IllegalArgumentException("Invalid member type: " + type);
        }

        members.put(member.getId(), member);
        memberLoans.put(member.getId(), new ArrayList<>());
        return member;
    }

    public Member getMember(String memberId) {
        return members.get(memberId);
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
                        ((Number) data.get("volume")).intValue(),
                        ((Number) data.get("issue")).intValue());
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
        return resources.get(resourceId);
    }

    public List<LibraryResource> getAllResources() {
        return new ArrayList<>(resources.values());
    }

    // LOAN MANAGEMENT
    public Loan borrowResource(String memberId, String resourceId) throws LibraryException {
        Member member = members.get(memberId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found: " + memberId);
        }

        LibraryResource resource = resources.get(resourceId);
        if (resource == null) {
            throw new ResourceNotFoundException("Resource not found: " + resourceId);
        }

        // BUSINESS RULE 1: Digital resources cannot be borrowed
        if (!resource.canBeBorrowed()) {
            throw new ResourceNotAvailableException(
                    "Digital resources cannot be physically borrowed. Access is available online at: " +
                            ((DigitalResource) resource).getUrl());
        }

        // BUSINESS RULE 2: Check if resource is available
        if (!resource.isAvailable()) {
            // Check if there's a reservation queue
            Queue<Reservation> queue = reservationQueue.getQueueForResource(resourceId);
            if (!queue.isEmpty()) {
                throw new ResourceNotAvailableException(
                        String.format("Resource is reserved. %d people are waiting.", queue.size()));
            }
            throw new ResourceNotAvailableException("Resource is currently on loan");
        }

        // BUSINESS RULE 3: Check if member can borrow
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

        // Create loan
        Loan loan = new Loan(member, resource);
        loans.put(loan.getId(), loan);
        memberLoans.get(memberId).add(loan);

        return loan;
    }

    public Fine returnResource(String loanId) throws LibraryException {
        Loan loan = loans.get(loanId);
        if (loan == null) {
            throw new ResourceNotFoundException("Loan not found: " + loanId);
        }

        loan.returnResource();

        // Notify reservation queue using Observer pattern
        reservationQueue.notifyResourceReturned(loan);

        // Return fine if any
        if (loan.isOverdue()) {
            double fineAmount = fineCalculator.calculateFine(loan);
            if (fineAmount > 0) {
                return new Fine(loan, fineAmount);
            }
        }

        return null;
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

    // RESERVATION MANAGEMENT
    public Reservation createReservation(String memberId, String resourceId) throws LibraryException {
        Member member = members.get(memberId);
        if (member == null) {
            throw new ResourceNotFoundException("Member not found: " + memberId);
        }

        LibraryResource resource = resources.get(resourceId);
        if (resource == null) {
            throw new ResourceNotFoundException("Resource not found: " + resourceId);
        }

        // Check if resource is already available - no need to reserve
        if (resource.isAvailable()) {
            throw new ResourceAvailableException("Resource is available for immediate borrowing");
        }

        // Check if member already has a pending reservation for this resource
        boolean alreadyReserved = reservations.stream()
                .anyMatch(r -> r.getMember().getId().equals(memberId) &&
                        r.getResource().getId().equals(resourceId) &&
                        r.getStatus().equals("PENDING"));

        if (alreadyReserved) {
            throw new LibraryException("You already have a pending reservation for this resource");
        }

        Reservation reservation = new Reservation(member, resource);
        reservations.add(reservation);

        // Add to reservation queue
        reservationQueue.addReservation(reservation);

        return reservation;
    }

    public List<Reservation> getMemberReservations(String memberId) {
        return reservations.stream()
                .filter(r -> r.getMember().getId().equals(memberId))
                .collect(Collectors.toList());
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
        return resources.values().stream()
                .filter(LibraryResource::isAvailable)
                .collect(Collectors.toList());
    }

    public List<LibraryResource> getResourcesByType(String type) {
        return resources.values().stream()
                .filter(r -> r.getResourceType().equalsIgnoreCase(type))
                .collect(Collectors.toList());
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

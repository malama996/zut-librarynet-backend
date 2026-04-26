package com.zut.librarynet.models;
import com.zut.librarynet.interfaces.LoanObserver;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class Loan {
    // ENCAPSULATION: All fields private
    private final String id;
    private final Member member;
    private final LibraryResource resource;
    private final LocalDate borrowDate;
    private LocalDate dueDate;
    private LocalDate returnDate;
    private String status; // ACTIVE, RETURNED, OVERDUE
    private Fine associatedFine;
    // OBSERVER PATTERN: List of observers to notify when loan is closed
    private final List<LoanObserver> observers;

    // Constructor for Firestore reconstruction - no side effects
    public Loan(String id, Member member, LibraryResource resource, 
                LocalDate borrowDate, LocalDate dueDate, 
                LocalDate returnDate, String status) {
        this.id = id != null && !id.trim().isEmpty() ? id : UUID.randomUUID().toString();
        this.member = member;
        this.resource = resource;
        this.borrowDate = borrowDate;
        this.dueDate = dueDate;
        this.returnDate = returnDate;
        this.status = status;
        this.observers = new ArrayList<>();
    }

    public Loan(Member member, LibraryResource resource) {
        this(null, member, resource, LocalDate.now(), 
             LocalDate.now().plusDays(member.getLoanPeriodDays()), 
             null, "ACTIVE");
        
        // Update resource availability
        resource.setAvailable(false);

        // Add to member's active loans
        member.addActiveLoan(this);
    }


    // Getters - no setters for immutable fields
    public String getId() { return id; }
    public Member getMember() { return member; }
    public LibraryResource getResource() { return resource; }
    public LocalDate getBorrowDate() { return borrowDate; }
    public LocalDate getDueDate() { return dueDate; }
    public LocalDate getReturnDate() { return returnDate; }
    public String getStatus() { return status; }
    public Fine getAssociatedFine() { return associatedFine; }

    // Public setter for Firestore reconstruction
    public void setAssociatedFine(Fine fine) {
        this.associatedFine = fine;
    }


    // OBSERVER PATTERN: Add observer

    public void addObserver(LoanObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    // OBSERVER PATTERN: Remove observer
    public void removeObserver(LoanObserver observer) {
        observers.remove(observer);
    }

    // OBSERVER PATTERN: Notify all observers
    private void notifyObservers(Member nextReservedUser) {
        for (LoanObserver observer : observers) {
            try {
                observer.onLoanClosed(this, nextReservedUser);
            } catch (Exception e) {
                System.err.println("Error notifying observer: " + e.getMessage());
            }
        }
    }

    // Business logic methods
    public boolean isOverdue() {
        return status.equals("ACTIVE") && LocalDate.now().isAfter(dueDate);
    }

    public int getDaysOverdue() {
        if (!isOverdue()) return 0;
        return (int) ChronoUnit.DAYS.between(dueDate, LocalDate.now());
    }

    public double calculateFine() {
        if (!isOverdue() || returnDate != null) return 0.0;
        return member.calculateFine(getDaysOverdue());
    }

    /**
     * OBSERVER PATTERN: Updated returnResource to accept nextReservedUser
     * and notify all observers.
     */
    public void returnResource(Member nextReservedUser) {
        if (status.equals("RETURNED")) {
            throw new IllegalStateException("Loan already returned");
        }

        // CRITICAL FIX: Check if overdue BEFORE changing status
        boolean wasOverdue = LocalDate.now().isAfter(dueDate);

        this.returnDate = LocalDate.now();
        this.status = "RETURNED";

        // Make resource available again
        resource.setAvailable(true);

        // Remove from member's active loans
        member.removeActiveLoan(this);

        // Calculate and add fine if it was overdue
        if (wasOverdue) {
            int daysOverdue = (int) ChronoUnit.DAYS.between(dueDate, returnDate);
            double fineAmount = member.calculateFine(daysOverdue);
            if (fineAmount > 0) {
                this.associatedFine = new Fine(this, fineAmount);
                member.addFine(associatedFine);
            }
        }

        // OBSERVER PATTERN: Notify all observers when loan is closed
        notifyObservers(nextReservedUser);
    }

    // Backward compatibility: calls returnResource with null nextReservedUser
    public void returnResource() {
        returnResource(null);
    }

    public void markAsOverdue() {
        if (isOverdue() && status.equals("ACTIVE")) {
            this.status = "OVERDUE";
        }
    }

    public void extendDueDate(int additionalDays) {
        if (additionalDays <= 0) {
            throw new IllegalArgumentException("Additional days must be positive");
        }
        if (!status.equals("ACTIVE")) {
            throw new IllegalStateException("Cannot extend non-active loan");
        }
        this.dueDate = dueDate.plusDays(additionalDays);
    }

    public java.util.Map<String, Object> toMap() {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", this.id);
        map.put("memberId", this.member.getId());
        map.put("resourceId", this.resource.getId());
        map.put("borrowDate", this.borrowDate.toString());
        map.put("dueDate", this.dueDate.toString());
        if (this.returnDate != null) {
            map.put("returnDate", this.returnDate.toString());
        }
        map.put("status", this.status);
        if (this.associatedFine != null) {
            map.put("fineAmount", this.associatedFine.getAmount());
            map.put("fineId", this.associatedFine.getId());
        }
        return map;
    }

    public static Loan fromFirestore(String id, Member member, LibraryResource resource,
                                     String borrowDateStr, String dueDateStr,
                                     String returnDateStr, String status) {
        LocalDate borrowDate = LocalDate.parse(borrowDateStr);
        LocalDate dueDate = LocalDate.parse(dueDateStr);
        LocalDate returnDate = returnDateStr != null ? LocalDate.parse(returnDateStr) : null;
        return new Loan(id, member, resource, borrowDate, dueDate, returnDate, status);
    }

    @Override
    public String toString() {
        return String.format("Loan[%s]: %s borrowed %s, due %s",
                id, resource.getTitle(), borrowDate, dueDate);
    }

}

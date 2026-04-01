package com.zut.librarynet.models;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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

    public Loan(Member member, LibraryResource resource) {
        this.id = UUID.randomUUID().toString();
        this.member = member;
        this.resource = resource;
        this.borrowDate = LocalDate.now();
        this.dueDate = borrowDate.plusDays(member.getLoanPeriodDays());
        this.status = "ACTIVE";

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

    public void returnResource() {
        if (status.equals("RETURNED")) {
            throw new IllegalStateException("Loan already returned");
        }

        this.returnDate = LocalDate.now();
        this.status = "RETURNED";

        // Make resource available again
        resource.setAvailable(true);

        // Remove from member's active loans
        member.removeActiveLoan(this);

        // Calculate and add fine if overdue
        if (isOverdue()) {
            double fineAmount = calculateFine();
            if (fineAmount > 0) {
                this.associatedFine = new Fine(this, fineAmount);
                member.addFine(associatedFine);
            }
        }
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

    @Override
    public String toString() {
        return String.format("Loan[%s]: %s borrowed %s, due %s",
                id, resource.getTitle(), borrowDate, dueDate);
    }
}

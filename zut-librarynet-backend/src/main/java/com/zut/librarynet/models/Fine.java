package com.zut.librarynet.models;

import java.time.LocalDateTime;
import java.util.UUID;

public class Fine {
    private final String id;
    private final Loan loan;
    private final double amount;
    private final LocalDateTime issuedDate;
    private boolean paid;
    private LocalDateTime paidDate;
    private String description;

    public Fine(Loan loan, double amount) {
        this.id = UUID.randomUUID().toString();
        this.loan = loan;
        this.amount = amount;
        this.issuedDate = LocalDateTime.now();
        this.paid = false;
        this.description = String.format("Overdue fine for %s", loan.getResource().getTitle());
    }

    public String getId() { return id; }
    public Loan getLoan() { return loan; }
    public double getAmount() { return amount; }
    public LocalDateTime getIssuedDate() { return issuedDate; }
    public boolean isPaid() { return paid; }
    public LocalDateTime getPaidDate() { return paidDate; }
    public String getDescription() { return description; }

    public void setDescription(String description) { this.description = description; }

    public void markAsPaid() {
        if (paid) {
            throw new IllegalStateException("Fine already paid");
        }
        this.paid = true;
        this.paidDate = LocalDateTime.now();
    }

    public boolean isOverdue() {
        // Fines are considered overdue if unpaid after 30 days
        return !paid && issuedDate.plusDays(30).isBefore(LocalDateTime.now());
    }

    @Override
    public String toString() {
        return String.format("Fine[%s]: ZMW %.2f - %s", id, amount, description);
    }
}

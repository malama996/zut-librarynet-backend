package com.zut.librarynet.models;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

/**
 * ABSTRACTION: Member defines the contract for all library members
 * Demonstrates ABSTRACTION through abstract methods for fine calculation
 */


public abstract class Member {
    // ENCAPSULATION: All fields private
    private final String id;
    private String name;
    private String email;
    private String phone;
    private final List<Loan> activeLoans;
    private final List<Fine> unpaidFines;
    private boolean active;
    private LocalDateTime registrationDate;

    public Member(String name, String email, String phone) {
        this.id = UUID.randomUUID().toString();
        this.name = validateName(name);
        this.email = validateEmail(email);
        this.phone = validatePhone(phone);
        this.activeLoans = new ArrayList<>();
        this.unpaidFines = new ArrayList<>();
        this.active = true;
        this.registrationDate = LocalDateTime.now();
    }

    // ENCAPSULATION: Validation methods
    private String validateName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Name cannot be empty");
        }
        if (name.length() < 2) {
            throw new IllegalArgumentException("Name must be at least 2 characters");
        }
        return name.trim();
    }

    private String validateEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be empty");
        }
        if (!email.contains("@") || !email.contains(".")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        return email.trim().toLowerCase();
    }

    private String validatePhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            throw new IllegalArgumentException("Phone cannot be empty");
        }
        // Zambian phone number validation - accept any valid Zambian number format
        // Valid formats: 0974123456, +260974123456, etc.
        phone = phone.trim();
        if (!phone.matches("^(\\+260|0)[0-9]{2,}$") || phone.length() < 10) {
            throw new IllegalArgumentException("Invalid Zambian phone number");
        }
        return phone;
    }

    // Getters and Setters with validation
    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public boolean isActive() { return active; }
    public LocalDateTime getRegistrationDate() { return registrationDate; }

    public void setName(String name) { this.name = validateName(name); }
    public void setEmail(String email) { this.email = validateEmail(email); }
    public void setPhone(String phone) { this.phone = validatePhone(phone); }
    public void setActive(boolean active) { this.active = active; }

    // Loan management with ENCAPSULATION
    public List<Loan> getActiveLoans() {
        return new ArrayList<>(activeLoans); // Return copy to prevent external modification
    }

    public void addActiveLoan(Loan loan) {
        if (loan != null && !activeLoans.contains(loan)) {
            this.activeLoans.add(loan);
        }
    }

    public void removeActiveLoan(Loan loan) {
        this.activeLoans.remove(loan);
    }

    // Fine management
    public List<Fine> getUnpaidFines() {
        return new ArrayList<>(unpaidFines);
    }

    public void addFine(Fine fine) {
        if (fine != null) {
            this.unpaidFines.add(fine);
        }
    }

    public void payFine(Fine fine) {
        this.unpaidFines.remove(fine);
        if (fine != null) {
            fine.markAsPaid();
        }
    }

    public double getTotalUnpaidFines() {
        return unpaidFines.stream()
                .filter(fine -> !fine.isPaid())
                .mapToDouble(Fine::getAmount)
                .sum();
    }

    // Business logic method with ENCAPSULATION
    public boolean canBorrow() {
        boolean hasActiveStatus = active;
        boolean finesUnderLimit = getTotalUnpaidFines() <= 50.0;
        boolean underBorrowLimit = activeLoans.size() < getMaxBorrowLimit();

        return hasActiveStatus && finesUnderLimit && underBorrowLimit;
    }

    // POLYMORPHISM: Abstract methods - each subclass implements differently
    public abstract double calculateFine(int daysOverdue);
    public abstract int getMaxBorrowLimit();
    public abstract int getLoanPeriodDays();
    public abstract String getMemberType();

    @Override
    public String toString() {
        return String.format("%s[%s]: %s (%s)", getMemberType(), id, name, email);
    }
}

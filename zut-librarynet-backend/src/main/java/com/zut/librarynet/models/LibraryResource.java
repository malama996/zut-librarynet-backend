package com.zut.librarynet.models;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ABSTRACTION: LibraryResource defines the contract for all library materials
 * This abstract class demonstrates:
 * - ABSTRACTION: Hides implementation details from subclasses
 * - ENCAPSULATION: All fields private with validation in setters
 */

public abstract class LibraryResource {
    // ENCAPSULATION: Private fields - cannot be accessed directly
    private final String id;
    private String title;
    private String publisher;
    private final LocalDateTime createdAt;
    private boolean available;

    public LibraryResource(String title, String publisher) {
        this.id = UUID.randomUUID().toString();
        this.title = validateTitle(title);
        this.publisher = validatePublisher(publisher);
        this.createdAt = LocalDateTime.now();
        this.available = true;
    }

    // ENCAPSULATION: Validation methods protect data integrity
    private String validateTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty");
        }
        if (title.length() < 3) {
            throw new IllegalArgumentException("Title must be at least 3 characters");
        }
        return title.trim();
    }

    private String validatePublisher(String publisher) {
        if (publisher == null || publisher.trim().isEmpty()) {
            throw new IllegalArgumentException("Publisher cannot be empty");
        }
        return publisher.trim();
    }

    // Getters (no setters for immutable fields)
    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getPublisher() { return publisher; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public boolean isAvailable() { return available; }

    // Setter with validation
    public void setTitle(String title) {
        this.title = validateTitle(title);
    }

    public void setPublisher(String publisher) {
        this.publisher = validatePublisher(publisher);
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    // ABSTRACT METHODS - Subclasses MUST implement these
    // This is the heart of ABSTRACTION
    public abstract String getResourceType();
    public abstract String generateStatement();
    public abstract boolean canBeBorrowed();
    public abstract java.util.Map<String, Object> getTypeSpecificFields();

    @Override
    public String toString() {
        return String.format("%s[%s]: %s", getResourceType(), id, title);
    }
}

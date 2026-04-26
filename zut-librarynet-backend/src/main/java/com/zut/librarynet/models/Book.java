package com.zut.librarynet.models;

/**
 * INHERITANCE: Book extends LibraryResource and adds book-specific properties
 * Demonstrates how inheritance allows code reuse while adding specialization
 */
public class Book extends LibraryResource {
    // Book-specific fields
    private String isbn;
    private String author;
    private String edition;

    public Book(String id, String title, String publisher, String isbn, String author, String edition) {
        super(id, title, publisher);
        this.isbn = validateIsbn(isbn);
        this.author = validateAuthor(author);
        this.edition = edition != null ? edition : "1st";
    }

    public Book(String title, String publisher, String isbn, String author, String edition) {
        this(null, title, publisher, isbn, author, edition);
    }


    // ENCAPSULATION: Validation for book-specific fields
    private String validateIsbn(String isbn) {
        if (isbn == null || isbn.trim().isEmpty()) {
            throw new IllegalArgumentException("ISBN cannot be empty");
        }
        // Allow safe defaults used during Firestore sync
        String trimmed = isbn.trim();
        if (trimmed.equals("UNKNOWN-ISBN") || trimmed.equals("UNKNOWN")) {
            return trimmed;
        }
        // Basic ISBN validation (10 or 13 digits, with optional hyphens)
        String cleanIsbn = trimmed.replaceAll("[\\s-]", "");
        if (!cleanIsbn.matches("\\d{10}|\\d{13}")) {
            throw new IllegalArgumentException("Invalid ISBN format. Must be 10 or 13 digits.");
        }
        return trimmed;
    }

    private String validateAuthor(String author) {
        if (author == null || author.trim().isEmpty()) {
            throw new IllegalArgumentException("Author cannot be empty");
        }
        String trimmed = author.trim();
        // Allow safe defaults used during Firestore sync
        if (trimmed.equals("Unknown Author") || trimmed.equals("UNKNOWN")) {
            return trimmed;
        }
        if (trimmed.length() < 2) {
            throw new IllegalArgumentException("Author name must be at least 2 characters");
        }
        return trimmed;
    }

    // Getters and Setters
    public String getIsbn() { return isbn; }
    public String getAuthor() { return author; }
    public String getEdition() { return edition; }

    public void setIsbn(String isbn) { this.isbn = validateIsbn(isbn); }
    public void setAuthor(String author) { this.author = validateAuthor(author); }
    public void setEdition(String edition) { this.edition = edition; }

    // POLYMORPHISM: Implementing abstract methods from LibraryResource
    @Override
    public String getResourceType() {
        return "BOOK";
    }

    @Override
    public String generateStatement() {
        return String.format("BOOK: '%s' by %s | ISBN: %s | Edition: %s | Status: %s",
                getTitle(), author, isbn, edition, isAvailable() ? "Available" : "On Loan");
    }

    @Override
    public boolean canBeBorrowed() {
        return true; // Physical books can be borrowed
    }

    @Override
    public java.util.Map<String, Object> getTypeSpecificFields() {
        java.util.Map<String, Object> fields = new java.util.HashMap<>();
        fields.put("isbn", this.isbn);
        fields.put("author", this.author);
        fields.put("edition", this.edition);
        return fields;
    }
}

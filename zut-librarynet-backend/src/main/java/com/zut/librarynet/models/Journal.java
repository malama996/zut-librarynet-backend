package com.zut.librarynet.models;

public class Journal extends LibraryResource {
    private String issn;
    private int volume;
    private int issue;

    public Journal(String id, String title, String publisher, String issn, int volume, int issue) {
        super(id, title, publisher);
        this.issn = validateIssn(issn);
        this.volume = validateVolume(volume);
        this.issue = validateIssue(issue);
    }

    public Journal(String title, String publisher, String issn, int volume, int issue) {
        this(null, title, publisher, issn, volume, issue);
    }


    private String validateIssn(String issn) {
        if (issn == null || issn.trim().isEmpty()) {
            throw new IllegalArgumentException("ISSN cannot be empty");
        }
        String trimmed = issn.trim();
        // Allow safe defaults used during Firestore sync
        if (trimmed.equals("0000-0000") || trimmed.equals("UNKNOWN-ISSN") || trimmed.equals("UNKNOWN")) {
            return trimmed;
        }
        // Basic ISSN validation: XXXX-XXXX format
        if (!trimmed.matches("\\d{4}-\\d{3}[0-9X]")) {
            throw new IllegalArgumentException("Invalid ISSN format. Expected: XXXX-XXXX");
        }
        return trimmed;
    }

    private int validateVolume(int volume) {
        if (volume <= 0) {
            throw new IllegalArgumentException("Volume must be positive");
        }
        return volume;
    }

    private int validateIssue(int issue) {
        if (issue <= 0) {
            throw new IllegalArgumentException("Issue must be positive");
        }
        return issue;
    }

    public String getIssn() { return issn; }
    public int getVolume() { return volume; }
    public int getIssue() { return issue; }

    public void setIssn(String issn) { this.issn = validateIssn(issn); }
    public void setVolume(int volume) { this.volume = validateVolume(volume); }
    public void setIssue(int issue) { this.issue = validateIssue(issue); }

    @Override
    public String getResourceType() {
        return "JOURNAL";
    }

    @Override
    public String generateStatement() {
        return String.format("JOURNAL: '%s' | ISSN: %s | Volume: %d, Issue: %d | Status: %s",
                getTitle(), issn, volume, issue, isAvailable() ? "Available" : "On Loan");
    }

    @Override
    public boolean canBeBorrowed() {
        return true; // Physical journals can be borrowed
    }

    @Override
    public java.util.Map<String, Object> getTypeSpecificFields() {
        java.util.Map<String, Object> fields = new java.util.HashMap<>();
        fields.put("issn", this.issn);
        fields.put("volume", this.volume);
        fields.put("issue", this.issue);
        return fields;
    }
}

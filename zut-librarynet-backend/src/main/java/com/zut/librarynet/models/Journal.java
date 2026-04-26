package com.zut.librarynet.models;

/**
 * INHERITANCE: Journal extends LibraryResource and adds journal-specific properties.
 *
 * Firestore schema (exact field names):
 *   journalTitle     → stored as title in LibraryResource
 *   publisher        → LibraryResource.publisher
 *   issn             → this.issn
 *   volume           → this.volume  (stored as String for flexibility e.g. "Vol. 45, No. 3")
 *   publicationDate  → this.publicationDate
 *   subjectArea      → this.subjectArea
 */
public class Journal extends LibraryResource {

    private String issn;

    /**
     * Volume stored as String to support formats like "Vol. 45, No. 3" or just "45".
     * The legacy int fields are kept for backward compatibility but volume is primary.
     */
    private String volume;

    /** Publication date as a human-readable string (e.g. "March 2024") */
    private String publicationDate;

    /** Subject area / discipline */
    private String subjectArea;

    // ── Legacy int fields kept for backward compat (used when volume is a plain number) ──
    private int volumeInt;
    private int issue;

    // ── Full constructor (recommended — all fields) ──
    public Journal(String id, String title, String publisher,
                   String issn, String volume, String publicationDate, String subjectArea) {
        super(id, title, publisher);
        this.issn = validateIssn(issn);
        this.volume = (volume != null && !volume.trim().isEmpty()) ? volume.trim() : "1";
        this.publicationDate = (publicationDate != null) ? publicationDate.trim() : "";
        this.subjectArea = (subjectArea != null) ? subjectArea.trim() : "";
        this.volumeInt = parseVolumeInt(this.volume);
        this.issue = 1;
    }

    // ── Legacy int constructor (for backward compat with existing Firestore data) ──
    public Journal(String id, String title, String publisher, String issn, int volume, int issue) {
        super(id, title, publisher);
        this.issn = validateIssn(issn);
        this.volumeInt = volume > 0 ? volume : 1;
        this.issue = issue > 0 ? issue : 1;
        this.volume = String.valueOf(this.volumeInt);
        this.publicationDate = "";
        this.subjectArea = "";
    }

    // ── Convenience constructors without ID ──
    public Journal(String title, String publisher,
                   String issn, String volume, String publicationDate, String subjectArea) {
        this(null, title, publisher, issn, volume, publicationDate, subjectArea);
    }

    public Journal(String title, String publisher, String issn, int volume, int issue) {
        this(null, title, publisher, issn, volume, issue);
    }

    // ── ISSN validation ──
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
            throw new IllegalArgumentException("Invalid ISSN format. Expected: XXXX-XXXX (e.g. 1234-567X)");
        }
        return trimmed;
    }

    /** Parse integer volume from a string like "Vol. 45, No. 3" or "45" */
    private int parseVolumeInt(String vol) {
        if (vol == null) return 1;
        // Try plain integer first
        try {
            return Integer.parseInt(vol.trim());
        } catch (NumberFormatException ignored) {}
        // Try extracting first number
        String digits = vol.replaceAll("[^0-9]", "");
        if (!digits.isEmpty()) {
            try {
                return Integer.parseInt(digits.substring(0, Math.min(digits.length(), 5)));
            } catch (NumberFormatException ignored) {}
        }
        return 1;
    }

    // ── Getters ──
    public String getIssn() { return issn; }
    public String getVolume() { return volume; }
    public String getPublicationDate() { return publicationDate; }
    public String getSubjectArea() { return subjectArea; }
    public int getVolumeInt() { return volumeInt; }
    public int getIssue() { return issue; }

    // ── Setters ──
    public void setIssn(String issn) { this.issn = validateIssn(issn); }

    public void setVolume(String volume) {
        this.volume = (volume != null && !volume.trim().isEmpty()) ? volume.trim() : "1";
        this.volumeInt = parseVolumeInt(this.volume);
    }

    public void setPublicationDate(String publicationDate) {
        this.publicationDate = publicationDate != null ? publicationDate.trim() : "";
    }

    public void setSubjectArea(String subjectArea) {
        this.subjectArea = subjectArea != null ? subjectArea.trim() : "";
    }

    public void setIssue(int issue) {
        this.issue = issue > 0 ? issue : 1;
    }

    @Override
    public String getResourceType() {
        return "JOURNAL";
    }

    @Override
    public String generateStatement() {
        return String.format("JOURNAL: '%s' | ISSN: %s | Volume: %s | Subject: %s | Status: %s",
                getTitle(), issn, volume,
                subjectArea.isEmpty() ? "N/A" : subjectArea,
                isAvailable() ? "Available" : "On Loan");
    }

    @Override
    public boolean canBeBorrowed() {
        return true; // Physical journals can be borrowed
    }

    /**
     * Returns ALL Firestore fields for this journal.
     * Field names match exactly what the frontend sends and Firestore stores.
     */
    @Override
    public java.util.Map<String, Object> getTypeSpecificFields() {
        java.util.Map<String, Object> fields = new java.util.HashMap<>();
        fields.put("issn", this.issn);
        fields.put("volume", this.volume);                        // String format
        fields.put("publicationDate", this.publicationDate);
        fields.put("subjectArea", this.subjectArea);
        // Legacy int fields for backward compat
        fields.put("volumeInt", this.volumeInt);
        fields.put("issue", this.issue);
        return fields;
    }
}

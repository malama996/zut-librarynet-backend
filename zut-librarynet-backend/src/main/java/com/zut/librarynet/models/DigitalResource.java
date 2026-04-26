package com.zut.librarynet.models;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * INHERITANCE: DigitalResource extends LibraryResource.
 *
 * Firestore schema (exact field names matching frontend):
 *   resourceTitle  → stored as title in LibraryResource
 *   provider       → stored as publisher in LibraryResource
 *   accessUrl      → this.url  (aliased: both "url" and "accessUrl" are accepted on input)
 *   accessType     → this.accessType  (e.g. "Subscription", "Open Access")
 *   format         → this.format      (e.g. "PDF", "Online Database")
 *   category       → this.category    (e.g. "Research Database")
 *   licenceExpiry  → this.licenceExpiry
 */
public class DigitalResource extends LibraryResource {

    /** Primary access URL */
    private String url;

    /** Access type: "Subscription", "Open Access", "Free", etc. */
    private String accessType;

    /** Format: "PDF", "Online Database", "eBook", etc. */
    private String format;

    /** Category: "Research Database", "e-Journal", "Video Library", etc. */
    private String category;

    /** Licence expiry date (null = perpetual/no expiry) */
    private LocalDate licenceExpiry;

    // ── Full constructor (recommended) ──
    public DigitalResource(String id, String title, String publisher,
                           String url, String accessType, String format,
                           String category, LocalDate licenceExpiry) {
        super(id, title, publisher);
        this.url = validateUrl(url);
        this.accessType = accessType != null ? accessType.trim() : "";
        this.format = format != null ? format.trim() : "";
        this.category = category != null ? category.trim() : "";
        this.licenceExpiry = licenceExpiry;
    }

    // ── Legacy constructor (backward compat) ──
    public DigitalResource(String id, String title, String publisher,
                           String url, LocalDate licenceExpiry) {
        this(id, title, publisher, url, "", "", "", licenceExpiry);
    }

    // ── Without ID variants ──
    public DigitalResource(String title, String publisher,
                           String url, String accessType, String format,
                           String category, LocalDate licenceExpiry) {
        this(null, title, publisher, url, accessType, format, category, licenceExpiry);
    }

    public DigitalResource(String title, String publisher,
                           String url, LocalDate licenceExpiry) {
        this(null, title, publisher, url, "", "", "", licenceExpiry);
    }

    // ── URL validation ──
    private String validateUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("Access URL cannot be empty");
        }
        String trimmed = url.trim();
        // Allow safe defaults used during Firestore sync
        if (trimmed.equals("https://example.com") || trimmed.equals("http://example.com")
                || trimmed.equals("UNKNOWN")) {
            return trimmed;
        }
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            throw new IllegalArgumentException("Access URL must start with http:// or https://");
        }
        return trimmed;
    }

    // ── Getters ──
    public String getUrl() { return url; }
    public String getAccessUrl() { return url; }   // alias for frontend compatibility
    public String getAccessType() { return accessType; }
    public String getFormat() { return format; }
    public String getCategory() { return category; }
    public LocalDate getLicenceExpiry() { return licenceExpiry; }

    // ── Setters ──
    public void setUrl(String url) { this.url = validateUrl(url); }
    public void setAccessType(String accessType) { this.accessType = accessType != null ? accessType.trim() : ""; }
    public void setFormat(String format) { this.format = format != null ? format.trim() : ""; }
    public void setCategory(String category) { this.category = category != null ? category.trim() : ""; }
    public void setLicenceExpiry(LocalDate licenceExpiry) { this.licenceExpiry = licenceExpiry; }

    public boolean isLicenceValid() {
        if (licenceExpiry == null) return true; // no expiry = always valid
        return licenceExpiry.isAfter(LocalDate.now());
    }

    @Override
    public String getResourceType() {
        return "DIGITAL";
    }

    @Override
    public String generateStatement() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String licenceStatus = licenceExpiry == null ? "Perpetual"
                : (isLicenceValid() ? "Valid until " + licenceExpiry.format(formatter) : "Expired");
        return String.format(
                "DIGITAL RESOURCE: '%s' | URL: %s | Access: %s | Format: %s | Licence: %s | Available: %s",
                getTitle(), url, accessType.isEmpty() ? "N/A" : accessType,
                format.isEmpty() ? "N/A" : format, licenceStatus,
                isAvailable() ? "Yes" : "No");
    }

    @Override
    public boolean canBeBorrowed() {
        return false; // Digital resources are accessed online — not physically borrowed
    }

    /**
     * Returns ALL Firestore fields for this digital resource.
     * Field names match exactly what the frontend sends/expects.
     */
    @Override
    public java.util.Map<String, Object> getTypeSpecificFields() {
        java.util.Map<String, Object> fields = new java.util.HashMap<>();
        fields.put("url", this.url);
        fields.put("accessUrl", this.url);          // alias — frontend uses "accessUrl"
        fields.put("accessType", this.accessType);
        fields.put("format", this.format);
        fields.put("category", this.category);
        fields.put("licenceValid", this.isLicenceValid());
        if (this.licenceExpiry != null) {
            fields.put("licenceExpiry", this.licenceExpiry.toString());
        }
        return fields;
    }
}

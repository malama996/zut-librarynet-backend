package com.zut.librarynet.models;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class DigitalResource extends LibraryResource {
    private String url;
    private LocalDate licenceExpiry;

    public DigitalResource(String title, String publisher, String url, LocalDate licenceExpiry) {
        super(title, publisher);
        this.url = validateUrl(url);
        this.licenceExpiry = licenceExpiry;
    }

    private String validateUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("URL cannot be empty");
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            throw new IllegalArgumentException("URL must start with http:// or https://");
        }
        return url;
    }

    public String getUrl() { return url; }
    public LocalDate getLicenceExpiry() { return licenceExpiry; }

    public void setUrl(String url) { this.url = validateUrl(url); }
    public void setLicenceExpiry(LocalDate licenceExpiry) { this.licenceExpiry = licenceExpiry; }

    public boolean isLicenceValid() {
        return licenceExpiry != null && licenceExpiry.isAfter(LocalDate.now());
    }

    @Override
    public String getResourceType() {
        return "DIGITAL";
    }

    @Override
    public String generateStatement() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String licenceStatus = isLicenceValid() ? "Valid until " + licenceExpiry.format(formatter) : "Expired";
        return String.format("DIGITAL RESOURCE: '%s' | URL: %s | Licence: %s | Access: %s",
                getTitle(), url, licenceStatus, isAvailable() ? "Available" : "On Loan");
    }

    @Override
    public boolean canBeBorrowed() {
        return false; // Digital resources cannot be physically borrowed - access is always available
    }
}

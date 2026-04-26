package com.zut.librarynet.services;

import com.zut.librarynet.models.LibraryResource;
import com.zut.librarynet.models.Loan;
import com.zut.librarynet.models.Member;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

public class EmailService {

    private static final String EMAILJS_API_URL =
            "https://api.emailjs.com/api/v1.0/email/send";

    private static EmailService instance;

    private final HttpClient httpClient;

    private final String serviceId;
    private final String templateId;

    // 🔥 BOTH KEYS NOW SUPPORTED
    private final String publicKey;
    private final String privateKey;

    private final boolean configured;

    // ============================================================
    // INIT
    // ============================================================
    private EmailService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        this.serviceId = getEnv("EMAILJS_SERVICE_ID",
                getEnv("VITE_EMAILJS_SERVICE_ID", ""));

        this.templateId = getEnv("EMAILJS_TEMPLATE_ID",
                getEnv("VITE_EMAILJS_TEMPLATE_ID", ""));

        // 🔥 PUBLIC KEY (REQUIRED BY EMAILJS API)
        this.publicKey = getEnv("EMAILJS_PUBLIC_KEY",
                getEnv("VITE_EMAILJS_PUBLIC_KEY", ""));

        // 🔥 PRIVATE KEY (SECURITY LAYER)
        this.privateKey = getEnv("EMAILJS_PRIVATE_KEY",
                getEnv("VITE_EMAILJS_PRIVATE_KEY", ""));

        this.configured = !serviceId.isEmpty()
                && !templateId.isEmpty()
                && !publicKey.isEmpty();

        System.out.println(configured
                ? "[EmailService] EmailJS configured ✅"
                : "[EmailService] EmailJS NOT configured ❌");
    }

    public static synchronized EmailService getInstance() {
        if (instance == null) instance = new EmailService();
        return instance;
    }

    // ============================================================
    // 🎯 CORE EMAIL METHOD
    // ============================================================
    private void sendEmail(Member member,
                           String eventType,
                           String message,
                           String bookTitle,
                           int daysOverdue,
                           double fineAmount) {

        if (!configured) {
            System.out.println("[EmailService DEMO] " + eventType +
                    " → " + member.getEmail());
            return;
        }

        String json = buildJsonBody(
                member.getName(),
                member.getEmail(),
                eventType,
                message,
                safe(bookTitle),
                formatInt(daysOverdue),
                formatMoney(fineAmount)
        );

        sendAsync(json);
    }

    // ============================================================
    // 📘 EVENT METHODS
    // ============================================================
    public void sendOverdueNoticeEmail(Member member, Loan loan) {
        sendEmail(
                member,
                "BOOK_OVERDUE",
                "This is a reminder that your borrowed book is overdue. Please return it immediately.",
                loan.getResource().getTitle(),
                loan.getDaysOverdue(),
                loan.calculateFine()
        );
    }

    public void sendReservationAvailableEmail(Member member, LibraryResource resource) {
        sendEmail(
                member,
                "BOOK_RESERVED",
                "A book you requested is now available for collection.",
                resource.getTitle(),
                0,
                0.0
        );
    }

    public void sendReturnedLateEmail(Member member, Loan loan) {
        sendEmail(
                member,
                "BOOK_RETURNED_LATE",
                "You returned a book late. A fine has been applied.",
                loan.getResource().getTitle(),
                loan.getDaysOverdue(),
                loan.calculateFine()
        );
    }

    public void sendWelcomeEmail(Member member) {
        sendEmail(
                member,
                "NEW_MEMBER_REGISTERED",
                "Welcome to ZUT Library Net! Your account has been successfully created.",
                "Not Applicable",
                0,
                0.0
        );
    }

    // ============================================================
    // 📡 EMAILJS REQUEST BODY (FIXED)
    // ============================================================
    private String buildJsonBody(String toName,
                                 String toEmail,
                                 String eventType,
                                 String message,
                                 String bookTitle,
                                 String daysOverdue,
                                 String fineAmount) {

        return "{"
                + "\"service_id\":\"" + escape(serviceId) + "\","
                + "\"template_id\":\"" + escape(templateId) + "\","
                + "\"user_id\":\"" + escape(publicKey) + "\","      // 🔥 REQUIRED
                + "\"accessToken\":\"" + escape(privateKey) + "\"," // 🔐 OPTIONAL SECURITY
                + "\"template_params\":{"
                + "\"to_name\":\"" + escape(toName) + "\","
                + "\"to_email\":\"" + escape(toEmail) + "\","
                + "\"event_type\":\"" + escape(eventType) + "\","
                + "\"message\":\"" + escape(message) + "\","
                + "\"book_title\":\"" + escape(bookTitle) + "\","
                + "\"days_overdue\":\"" + daysOverdue + "\","
                + "\"fine_amount\":\"" + fineAmount + "\""
                + "}"
                + "}";
    }

    // ============================================================
    // 🚀 ASYNC SENDING
    // ============================================================
    private void sendAsync(String json) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(EMAILJS_API_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();

        httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenAccept(res -> {
                    if (res.statusCode() == 200) {
                        System.out.println("[EmailService] ✅ Email sent successfully");
                    } else {
                        System.err.println("[EmailService] ❌ EmailJS error: " + res.body());
                    }
                })
                .exceptionally(ex -> {
                    System.err.println("[EmailService] ❌ Failed: " + ex.getMessage());
                    return null;
                });
    }

    // ============================================================
    // 🛡️ HELPERS
    // ============================================================
    private String safe(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "Not Applicable";
        }
        return value;
    }

    private String formatInt(int value) {
        return (value <= 0) ? "0" : String.valueOf(value);
    }

    private String formatMoney(double value) {
        return (value <= 0) ? "0.00" : String.format("%.2f", value);
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    // ============================================================
    // 🌐 ENV LOADER
    // ============================================================
    private static String getEnv(String key, String def) {
        String v = System.getenv(key);
        return (v != null) ? v : def;
    }
}
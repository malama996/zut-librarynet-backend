package com.zut.librarynet.services;

import com.zut.librarynet.models.LibraryResource;
import com.zut.librarynet.models.Loan;
import com.zut.librarynet.models.Member;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

public class EmailService {

    private static final String EMAILJS_API_URL =
            "https://api.emailjs.com/api/v1.0/email/send";

    private static EmailService instance;

    private final HttpClient httpClient;

    private final String serviceId;
    private final String templateId;

    // 🔥 BOTH KEYS SUPPORTED
    private final String publicKey;
    private final String privateKey;

    private final boolean configured;

    // ============================================================
    // .env FILE LOADER — reads KEY=VALUE pairs from .env at startup
    // ============================================================
    private static final Map<String, String> DOT_ENV = new HashMap<>();

    static {
        // Try to locate .env file relative to working directory or one level up
        String[] candidatePaths = {
            ".env",
            "zut-librarynet-backend/.env",
            "../.env"
        };
        for (String path : candidatePaths) {
            File envFile = new File(path);
            if (envFile.exists()) {
                try {
                    for (String line : Files.readAllLines(envFile.toPath(), StandardCharsets.UTF_8)) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int eq = line.indexOf('=');
                        if (eq > 0) {
                            String key = line.substring(0, eq).trim();
                            String value = line.substring(eq + 1).trim();
                            // Strip surrounding quotes if present
                            if (value.startsWith("\"") && value.endsWith("\""))
                                value = value.substring(1, value.length() - 1);
                            if (value.startsWith("'") && value.endsWith("'"))
                                value = value.substring(1, value.length() - 1);
                            DOT_ENV.put(key, value);
                        }
                    }
                    System.out.println("[EmailService] Loaded .env from: " + envFile.getAbsolutePath());
                    break;
                } catch (IOException e) {
                    System.err.println("[EmailService] Failed to read .env at " + path + ": " + e.getMessage());
                }
            }
        }
        if (DOT_ENV.isEmpty()) {
            System.out.println("[EmailService] No .env file found — relying on process environment variables");
        }
    }

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

        if (configured) {
            System.out.println("[EmailService] EmailJS configured ✅");
            System.out.println("[EmailService] Service ID : " + serviceId);
            System.out.println("[EmailService] Template ID: " + templateId);
            System.out.println("[EmailService] Public Key : " + publicKey.substring(0, Math.min(6, publicKey.length())) + "***");
        } else {
            System.out.println("[EmailService] EmailJS NOT configured ❌");
            System.out.println("  → EMAILJS_SERVICE_ID  : " + (serviceId.isEmpty() ? "MISSING" : "✓"));
            System.out.println("  → EMAILJS_TEMPLATE_ID : " + (templateId.isEmpty() ? "MISSING" : "✓"));
            System.out.println("  → EMAILJS_PUBLIC_KEY  : " + (publicKey.isEmpty() ? "MISSING" : "✓"));
        }
    }

    public static synchronized EmailService getInstance() {
        if (instance == null) instance = new EmailService();
        return instance;
    }

    // ============================================================
    // 🎯 CORE EMAIL METHOD — with full null validation
    // ============================================================
    private void sendEmail(Member member,
                           String eventType,
                           String message,
                           String bookTitle,
                           int daysOverdue,
                           double fineAmount) {

        // ── GUARD: validate member
        if (member == null) {
            System.err.println("[EmailService] ❌ Cannot send email — member is null");
            return;
        }

        // ── GUARD: validate email (the root cause of "recipients address is empty")
        String recipientEmail = member.getEmail();
        System.out.println("[EmailService] 📧 Recipient email from member: '" + recipientEmail + "'");
        if (recipientEmail == null || recipientEmail.isBlank()) {
            System.err.println("[EmailService] ❌ STOPPED — member email is null or blank. MemberId=" + member.getId());
            return;
        }

        // ── GUARD: validate name
        String recipientName = member.getName();
        if (recipientName == null || recipientName.isBlank()) {
            System.err.println("[EmailService] ⚠ Member name is blank — using fallback 'Library Member'");
            recipientName = "Library Member";
        }

        if (!configured) {
            System.out.println("[EmailService DEMO] " + eventType +
                    " → " + recipientEmail + " (" + recipientName + ")");
            return;
        }

        String json = buildJsonBody(
                recipientName,
                recipientEmail,
                eventType,
                message,
                safe(bookTitle),
                formatInt(daysOverdue),
                formatMoney(fineAmount)
        );

        // ── DEBUG: print the full payload before sending
        System.out.println("[EmailService] 📤 Sending email to: " + recipientEmail);
        System.out.println("[EmailService] 📦 JSON Payload:\n" + json);

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
    // 📡 EMAILJS REQUEST BODY
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
                + "\"user_id\":\"" + escape(publicKey) + "\","      // 🔥 REQUIRED by EmailJS REST API
                + "\"accessToken\":\"" + escape(privateKey) + "\"," // 🔐 Optional security
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
                        System.err.println("[EmailService] ❌ EmailJS error (HTTP " + res.statusCode() + "): " + res.body());
                    }
                })
                .exceptionally(ex -> {
                    System.err.println("[EmailService] ❌ Failed to send email: " + ex.getMessage());
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
    // 🌐 ENV LOADER — checks .env map first, then process env
    // ============================================================
    private static String getEnv(String key, String def) {
        // 1. Check .env file values loaded at startup
        String dotEnvValue = DOT_ENV.get(key);
        if (dotEnvValue != null && !dotEnvValue.isEmpty()) {
            return dotEnvValue;
        }
        // 2. Fall back to real process environment variable
        String v = System.getenv(key);
        return (v != null && !v.isEmpty()) ? v : def;
    }
}
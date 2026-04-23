package com.zut.librarynet.utils;
import java.time.LocalDateTime;

public class ErrorResponse {
    private boolean error;
    private int code;
    private String message;
    private String details;
    private LocalDateTime timestamp;

    public ErrorResponse() {
        this.timestamp = LocalDateTime.now();
    }

    public ErrorResponse(int code, String message) {
        this();
        this.error = true;
        this.code = code;
        this.message = message;
    }

    public ErrorResponse(int code, String message, String details) {
        this(code, message);
        this.details = details;
    }

    // Getters and setters
    public boolean isError() { return error; }
    public void setError(boolean error) { this.error = error; }

    public int getCode() { return code; }
    public void setCode(int code) { this.code = code; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}


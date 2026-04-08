package com.zut.librarynet.handlers;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.zut.librarynet.exceptions.*;
import com.zut.librarynet.models.*;
import com.zut.librarynet.services.LibraryService;
import com.zut.librarynet.services.AuthService;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

public class LibraryHandlers {
    protected final LibraryService service;
    protected final Gson gson;

    public LibraryHandlers(LibraryService service) {
        this.service = service;
        this.gson = new GsonBuilder()
                .setPrettyPrinting()
                .registerTypeAdapter(LocalDateTime.class, new LocalDateTimeAdapter())
                .create();
    }

    // Health check and statistics
    public void getStatistics(Context ctx) {
        Map<String, Object> response = new HashMap<>();
        response.put("statistics", service.getStatistics());
        response.put("timestamp", LocalDateTime.now().toString());
        ctx.status(HttpStatus.OK).json(response);
    }

    // Member handlers
    public void registerMember(Context ctx) {
        try {
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            String type = (String) data.get("type");

            Member member = service.registerMember(type, data);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("memberId", member.getId());
            response.put("memberType", member.getMemberType());
            response.put("name", member.getName());
            response.put("email", member.getEmail());
            response.put("message", String.format("%s registered successfully", member.getMemberType()));

            ctx.status(HttpStatus.CREATED).json(response);

        } catch (IllegalArgumentException e) {
            sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }
    // NEW: Member login to get authentication token
    public void loginMember(Context ctx) {
        try {
            String body = ctx.body();
            if (body == null || body.trim().isEmpty()) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Request body is required");
                return;
            }

            Map<String, Object> data = gson.fromJson(body, Map.class);
            
            if (data == null) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Invalid JSON format");
                return;
            }

            String memberId = (String) data.get("memberId");
            if (memberId == null || memberId.trim().isEmpty()) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Missing required field: memberId");
                return;
            }

            // Verify member exists
            Member member = service.getMember(memberId);
            if (member == null) {
                sendErrorResponse(ctx, HttpStatus.UNAUTHORIZED, "Invalid memberId");
                return;
            }

            // Generate authentication token
            String token = AuthService.generateToken(memberId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("token", "Bearer " + token);
            response.put("memberId", memberId);
            response.put("memberType", member.getMemberType());
            response.put("name", member.getName());
            response.put("message", "Login successful. Use token in Authorization header");

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error: " + e.getMessage());
        }
    }
    public void getMember(Context ctx) {
        try {
            String memberId = ctx.pathParam("id");
            Member member = service.getMember(memberId);

            if (member == null) {
                sendErrorResponse(ctx, HttpStatus.NOT_FOUND, "Member not found: " + memberId);
                return;
            }

            Map<String, Object> response = new HashMap<>();
            response.put("id", member.getId());
            response.put("name", member.getName());
            response.put("email", member.getEmail());
            response.put("phone", member.getPhone());
            response.put("memberType", member.getMemberType());
            response.put("active", member.isActive());
            response.put("activeLoans", member.getActiveLoans().size());
            response.put("totalFines", member.getTotalUnpaidFines());
            response.put("canBorrow", member.canBorrow());
            response.put("maxBorrowLimit", member.getMaxBorrowLimit());
            response.put("loanPeriodDays", member.getLoanPeriodDays());

            // Add type-specific fields
            if (member instanceof StudentMember) {
                StudentMember student = (StudentMember) member;
                response.put("studentId", student.getStudentId());
                response.put("programme", student.getProgramme());
                response.put("yearOfStudy", student.getYearOfStudy());
            } else if (member instanceof LecturerMember) {
                LecturerMember lecturer = (LecturerMember) member;
                response.put("employeeId", lecturer.getEmployeeId());
                response.put("department", lecturer.getDepartment());
                response.put("yearsOfService", lecturer.getYearsOfService());
            } else if (member instanceof ResearcherMember) {
                ResearcherMember researcher = (ResearcherMember) member;
                response.put("researcherId", researcher.getResearcherId());
                response.put("institution", researcher.getInstitution());
                response.put("researchArea", researcher.getResearchArea());
            }

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    public void getAllMembers(Context ctx) {
        try {
            java.util.List<Member> members = service.getAllMembers();

            Map<String, Object> response = new HashMap<>();
            response.put("count", members.size());
            response.put("members", members.stream()
                    .map(this::memberToMap)
                    .collect(java.util.stream.Collectors.toList()));

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // Resource handlers
    public void addResource(Context ctx) {
        try {
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            String type = (String) data.get("type");

            LibraryResource resource = service.addResource(type, data);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("resourceId", resource.getId());
            response.put("resourceType", resource.getResourceType());
            response.put("title", resource.getTitle());
            response.put("message", String.format("%s added successfully", resource.getResourceType()));

            ctx.status(HttpStatus.CREATED).json(response);

        } catch (IllegalArgumentException e) {
            sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    public void getResource(Context ctx) {
        try {
            String resourceId = ctx.pathParam("id");
            LibraryResource resource = service.getResource(resourceId);

            if (resource == null) {
                sendErrorResponse(ctx, HttpStatus.NOT_FOUND, "Resource not found: " + resourceId);
                return;
            }

            ctx.status(HttpStatus.OK).json(resourceToMap(resource));

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    public void getAllResources(Context ctx) {
        try {
            java.util.List<LibraryResource> resources = service.getAllResources();

            Map<String, Object> response = new HashMap<>();
            response.put("count", resources.size());
            response.put("resources", resources.stream()
                    .map(this::resourceToMap)
                    .collect(java.util.stream.Collectors.toList()));

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // Loan handlers (simplified - will be expanded)
    public void borrowResource(Context ctx) {
        try {
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            String memberId = (String) data.get("memberId");
            String resourceId = (String) data.get("resourceId");

            Loan loan = service.borrowResource(memberId, resourceId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("loanId", loan.getId());
            response.put("memberId", memberId);
            response.put("resourceId", resourceId);
            response.put("resourceTitle", loan.getResource().getTitle());
            response.put("dueDate", loan.getDueDate().toString());
            response.put("message", "Resource borrowed successfully");

            ctx.status(HttpStatus.OK).json(response);

        } catch (ResourceNotFoundException e) {
            sendErrorResponse(ctx, HttpStatus.NOT_FOUND, e.getMessage());
        } catch (ResourceNotAvailableException | BorrowLimitExceededException | FinesOutstandingException e) {
            sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    public void returnResource(Context ctx) {
        try {
            String loanId = ctx.pathParam("id");
            Fine fine = service.returnResource(loanId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("loanId", loanId);

            if (fine != null) {
                response.put("fineAmount", fine.getAmount());
                response.put("message", String.format("Resource returned. Fine of ZMW %.2f applied.", fine.getAmount()));
            } else {
                response.put("message", "Resource returned successfully. No fines applied.");
            }

            ctx.status(HttpStatus.OK).json(response);

        } catch (ResourceNotFoundException e) {
            sendErrorResponse(ctx, HttpStatus.NOT_FOUND, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    public void getMemberLoans(Context ctx) {
        try {
            String memberId = ctx.pathParam("id");
            java.util.List<Loan> loans = service.getMemberLoans(memberId);
            Member member = service.getMember(memberId);

            Map<String, Object> response = new HashMap<>();
            response.put("memberId", memberId);
            response.put("memberName", member != null ? member.getName() : "Unknown");
            response.put("activeLoans", loans.stream()
                    .filter(loan -> loan.getStatus().equals("ACTIVE"))
                    .map(this::loanToMap)
                    .collect(java.util.stream.Collectors.toList()));
            response.put("returnedLoans", loans.stream()
                    .filter(loan -> loan.getStatus().equals("RETURNED"))
                    .map(this::loanToMap)
                    .collect(java.util.stream.Collectors.toList()));

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // Fine handlers
    public void getMemberFines(Context ctx) {
        try {
            String memberId = ctx.pathParam("id");
            java.util.List<Fine> fines = service.getMemberFines(memberId);
            Member member = service.getMember(memberId);

            Map<String, Object> response = new HashMap<>();
            response.put("memberId", memberId);
            response.put("memberName", member != null ? member.getName() : "Unknown");
            response.put("totalUnpaidFines", member != null ? member.getTotalUnpaidFines() : 0);
            response.put("fines", fines.stream()
                    .map(this::fineToMap)
                    .collect(java.util.stream.Collectors.toList()));

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    public void payFine(Context ctx) {
        try {
            String memberId = ctx.pathParam("id");
            String fineId = ctx.pathParam("fineId");

            service.payFine(memberId, fineId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Fine paid successfully");

            ctx.status(HttpStatus.OK).json(response);

        } catch (ResourceNotFoundException e) {
            sendErrorResponse(ctx, HttpStatus.NOT_FOUND, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // Reservation handlers
    public void createReservation(Context ctx) {
        try {
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            String memberId = (String) data.get("memberId");
            String resourceId = (String) data.get("resourceId");

            Reservation reservation = service.createReservation(memberId, resourceId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("reservationId", reservation.getId());
            response.put("memberId", memberId);
            response.put("resourceId", resourceId);
            response.put("resourceTitle", reservation.getResource().getTitle());
            response.put("message", "Reservation created. You will be notified when the resource becomes available.");

            ctx.status(HttpStatus.CREATED).json(response);

        } catch (ResourceNotFoundException e) {
            sendErrorResponse(ctx, HttpStatus.NOT_FOUND, e.getMessage());
        } catch (ResourceAvailableException e) {
            sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    public void getMemberReservations(Context ctx) {
        try {
            String memberId = ctx.pathParam("id");
            java.util.List<Reservation> reservations = service.getMemberReservations(memberId);

            Map<String, Object> response = new HashMap<>();
            response.put("memberId", memberId);
            response.put("count", reservations.size());
            response.put("reservations", reservations.stream()
                    .map(this::reservationToMap)
                    .collect(java.util.stream.Collectors.toList()));

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    public void cancelReservation(Context ctx) {
        try {
            String reservationId = ctx.pathParam("id");
            service.cancelReservation(reservationId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Reservation cancelled successfully");

            ctx.status(HttpStatus.OK).json(response);

        } catch (ResourceNotFoundException e) {
            sendErrorResponse(ctx, HttpStatus.NOT_FOUND, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // Utility handlers
    public void getAvailableResources(Context ctx) {
        try {
            java.util.List<LibraryResource> available = service.getAvailableResources();

            Map<String, Object> response = new HashMap<>();
            response.put("count", available.size());
            response.put("resources", available.stream()
                    .map(this::resourceToMap)
                    .collect(java.util.stream.Collectors.toList()));

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    public void getResourcesByType(Context ctx) {
        try {
            String type = ctx.pathParam("type");
            java.util.List<LibraryResource> resources = service.getResourcesByType(type);

            Map<String, Object> response = new HashMap<>();
            response.put("type", type);
            response.put("count", resources.size());
            response.put("resources", resources.stream()
                    .map(this::resourceToMap)
                    .collect(java.util.stream.Collectors.toList()));

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // NEW: Search resources
    public void searchResources(Context ctx) {
        try {
            String query = ctx.queryParam("q");
            if (query == null || query.trim().isEmpty()) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Search query parameter 'q' is required");
                return;
            }

            java.util.List<LibraryResource> results = service.searchResources(query);

            Map<String, Object> response = new HashMap<>();
            response.put("query", query);
            response.put("count", results.size());
            response.put("results", results.stream()
                    .map(this::resourceToMap)
                    .collect(java.util.stream.Collectors.toList()));

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // NEW: Get overdue report
    public void getOverdueReport(Context ctx) {
        try {
            java.util.List<Loan> overdueLoans = service.getOverdueLoans();

            double totalFinesOutstanding = overdueLoans.stream()
                    .mapToDouble(Loan::calculateFine)
                    .sum();

            Map<String, Object> response = new HashMap<>();
            response.put("generatedAt", LocalDateTime.now().toString());
            response.put("totalOverdue", overdueLoans.size());
            response.put("totalFinesOutstanding", totalFinesOutstanding);
            response.put("overdueLoans", overdueLoans.stream()
                    .map(this::loanToMap)
                    .collect(java.util.stream.Collectors.toList()));

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // NEW: Extend loan
    public void extendLoan(Context ctx) {
        try {
            String loanId = ctx.pathParam("id");
            Map<String, Object> data = gson.fromJson(ctx.body(), Map.class);
            
            if (data == null || !data.containsKey("days")) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Request body must contain 'days' parameter");
                return;
            }

            int days = ((Number) data.get("days")).intValue();
            if (days <= 0) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Days must be a positive integer");
                return;
            }

            service.extendLoan(loanId, days);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", String.format("Loan extended by %d days", days));

            ctx.status(HttpStatus.OK).json(response);

        } catch (ResourceNotFoundException e) {
            sendErrorResponse(ctx, HttpStatus.NOT_FOUND, e.getMessage());
        } catch (IllegalArgumentException e) {
            sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // NEW: Get reservation queue position
    public void getReservationQueuePosition(Context ctx) {
        try {
            String reservationId = ctx.pathParam("id");
            
            // Find the reservation - need alternative approach since we can't query all
            // For now, return a placeholder response
            Map<String, Object> response = new HashMap<>();
            response.put("reservationId", reservationId);
            response.put("queuePosition", 1);
            response.put("status", "QUEUED");

            ctx.status(HttpStatus.OK).json(response);

        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    // Helper methods
    protected Map<String, Object> memberToMap(Member member) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", member.getId());
        map.put("name", member.getName());
        map.put("email", member.getEmail());
        map.put("memberType", member.getMemberType());
        map.put("active", member.isActive());
        return map;
    }

    protected Map<String, Object> loanToMap(Loan loan) {
        Map<String, Object> map = new HashMap<>();
        map.put("loanId", loan.getId());
        map.put("resourceTitle", loan.getResource().getTitle());
        map.put("resourceType", loan.getResource().getResourceType());
        map.put("borrowDate", loan.getBorrowDate().toString());
        map.put("dueDate", loan.getDueDate().toString());
        map.put("status", loan.getStatus());
        if (loan.getReturnDate() != null) {
            map.put("returnDate", loan.getReturnDate().toString());
        }
        if (loan.isOverdue()) {
            map.put("daysOverdue", loan.getDaysOverdue());
            map.put("fineAmount", loan.calculateFine());
        }
        return map;
    }

    protected Map<String, Object> fineToMap(Fine fine) {
        Map<String, Object> map = new HashMap<>();
        map.put("fineId", fine.getId());
        map.put("amount", fine.getAmount());
        map.put("issuedDate", fine.getIssuedDate().toString());
        map.put("paid", fine.isPaid());
        map.put("description", fine.getDescription());
        if (fine.getPaidDate() != null) {
            map.put("paidDate", fine.getPaidDate().toString());
        }
        return map;
    }

    protected Map<String, Object> resourceToMap(LibraryResource resource) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", resource.getId());
        map.put("title", resource.getTitle());
        map.put("type", resource.getResourceType());
        map.put("available", resource.isAvailable());
        map.put("statement", resource.generateStatement());

        if (resource instanceof Book) {
            Book book = (Book) resource;
            map.put("author", book.getAuthor());
            map.put("isbn", book.getIsbn());
            map.put("edition", book.getEdition());
        } else if (resource instanceof Journal) {
            Journal journal = (Journal) resource;
            map.put("issn", journal.getIssn());
            map.put("volume", journal.getVolume());
            map.put("issue", journal.getIssue());
        } else if (resource instanceof DigitalResource) {
            DigitalResource digital = (DigitalResource) resource;
            map.put("url", digital.getUrl());
            map.put("licenceValid", digital.isLicenceValid());
            map.put("licenceExpiry", digital.getLicenceExpiry().toString());
        }

        return map;
    }

    protected Map<String, Object> reservationToMap(Reservation reservation) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", reservation.getId());
        map.put("resourceTitle", reservation.getResource().getTitle());
        map.put("resourceType", reservation.getResource().getResourceType());
        map.put("reservationDate", reservation.getReservationDate().toString());
        map.put("status", reservation.getStatus());
        map.put("expiryDate", reservation.getExpiryDate().toString());
        if (reservation.getNotifiedDate() != null) {
            map.put("notifiedDate", reservation.getNotifiedDate().toString());
        }
        return map;
    }

    protected void sendErrorResponse(Context ctx, HttpStatus status, String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", true);
        error.put("code", status.getCode());
        error.put("message", message);
        error.put("timestamp", LocalDateTime.now().toString());

        ctx.status(status);
        ctx.json(error);
    }
}

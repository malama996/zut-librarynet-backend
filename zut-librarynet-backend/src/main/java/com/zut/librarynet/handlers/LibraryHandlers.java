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
            // CRITICAL FIX: Validate request body
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
            
            // UPDATED: Support modern API format with firstName/lastName
            String firstName = (String) data.get("firstName");
            String lastName = (String) data.get("lastName");
            String firstName_old = (String) data.get("first_name");
            String lastName_old = (String) data.get("last_name");
            String name = (String) data.get("name");
            
            // Combine firstName/lastName if provided, otherwise use name field
            if ((firstName != null && !firstName.trim().isEmpty()) && (lastName != null && !lastName.trim().isEmpty())) {
                name = firstName.trim() + " " + lastName.trim();
            } else if ((firstName_old != null && !firstName_old.trim().isEmpty()) && (lastName_old != null && !lastName_old.trim().isEmpty())) {
                name = firstName_old.trim() + " " + lastName_old.trim();
            }
            
            if (name == null || name.trim().isEmpty()) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Missing required fields: firstName and lastName, or name");
                return;
            }
            
            String email = (String) data.get("email");
            if (email == null || email.trim().isEmpty()) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Missing required field: email");
                return;
            }
            
            String phone = (String) data.get("phone");
            if (phone == null || phone.trim().isEmpty()) {
                phone = "Not provided";
            }
            
            // UPDATED: Support membershipType instead of type
            String type = (String) data.get("type");
            String membershipType = (String) data.get("membershipType");
            
            if (type == null && membershipType == null) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Missing required field: membershipType or type");
                return;
            }
            
            if (type == null) {
                type = membershipType;
            }

            // Validate type-specific fields and provide defaults
            String typeStr = type.toLowerCase();
            if (typeStr.contains("student") || typeStr.equals("studentmember")) {
                if (!data.containsKey("studentId") && !data.containsKey("student_id")) {
                    data.put("studentId", "STU" + System.currentTimeMillis());
                }
                if (!data.containsKey("programme")) {
                    data.put("programme", "General");
                }
                if (!data.containsKey("yearOfStudy")) {
                    data.put("yearOfStudy", 1);
                }
                type = "StudentMember";
            } else if (typeStr.contains("lecturer") || typeStr.equals("lecturermember")) {
                if (!data.containsKey("employeeId") && !data.containsKey("employee_id")) {
                    data.put("employeeId", "LEC" + System.currentTimeMillis());
                }
                if (!data.containsKey("department")) {
                    data.put("department", "General");
                }
                if (!data.containsKey("yearsOfService")) {
                    data.put("yearsOfService", 0);
                }
                type = "LecturerMember";
            } else if (typeStr.contains("researcher") || typeStr.equals("researchermember")) {
                if (!data.containsKey("researcherId") && !data.containsKey("researcher_id")) {
                    data.put("researcherId", "RES" + System.currentTimeMillis());
                }
                if (!data.containsKey("institution")) {
                    data.put("institution", "General");
                }
                if (!data.containsKey("researchArea")) {
                    data.put("researchArea", "General");
                }
                type = "ResearcherMember";
            }

            // Use unified registration that accepts modern format
            data.put("name", name);
            data.put("email", email);
            data.put("phone", phone);

            Member member = service.registerMember(type, data);

            // Generate auth token with MEMBER role (deprecated - use /api/auth/register/member instead)
            String token = AuthService.generateToken(member.getId(), AuthService.ROLE_MEMBER);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("memberId", member.getId());
            response.put("memberType", member.getMemberType());
            response.put("name", member.getName());
            response.put("email", member.getEmail());
            response.put("token", token);
            response.put("message", String.format("%s registered successfully", member.getMemberType()));

            ctx.status(HttpStatus.CREATED).json(response);

        } catch (IllegalArgumentException e) {
            sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error: " + e.getMessage());
        }
    }
    // NEW: Member login to get authentication token - requires BOTH email and memberId
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

            String email = (String) data.get("email");
            String memberId = (String) data.get("memberId");
            
            // CRITICAL: Both email and memberId are required for login
            if (email == null || email.trim().isEmpty()) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Missing required field: email");
                return;
            }

            if (memberId == null || memberId.trim().isEmpty()) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Missing required field: memberId");
                return;
            }

            email = email.trim();
            memberId = memberId.trim();

            // Get member by ID first
            Member member = service.getMember(memberId);
            if (member == null) {
                sendErrorResponse(ctx, HttpStatus.UNAUTHORIZED, "Invalid Member ID");
                return;
            }

            // Verify email matches the member ID
            if (!member.getEmail().equalsIgnoreCase(email)) {
                sendErrorResponse(ctx, HttpStatus.UNAUTHORIZED, "Email and Member ID do not match");
                return;
            }

            // Generate authentication token (deprecated - use /api/auth/login instead)
            String token = AuthService.generateToken(member.getId(), AuthService.ROLE_MEMBER);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("token", "Bearer " + token);
            response.put("memberId", member.getId());
            response.put("memberType", member.getMemberType());
            response.put("name", member.getName());
            response.put("email", member.getEmail());
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

            // POLYMORPHISM: Use polymorphic method instead of instanceof
            response.putAll(member.getTypeSpecificFields());

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
            // CRITICAL FIX: Validate request body
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
            
            String type = (String) data.get("type");
            if (type == null || type.trim().isEmpty()) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Missing required field: type");
                return;
            }
            
            // Validate required fields
            if (!data.containsKey("title") || !data.containsKey("publisher")) {
                sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, "Missing required fields: title, publisher");
                return;
            }

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
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error: " + e.getMessage());
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
        } catch (ResourceNotAvailableException | BorrowLimitExceededException e) {
            sendErrorResponse(ctx, HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (FinesOutstandingException e) {
            // HTTP 403 Forbidden for fines exceeding threshold
            sendErrorResponse(ctx, HttpStatus.FORBIDDEN, e.getMessage());
        } catch (Exception e) {
            sendErrorResponse(ctx, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    public void returnResource(Context ctx) {
        try {
            String loanId = ctx.pathParam("id");
            LibraryService.ReturnResult result = service.returnResource(loanId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("loanId", loanId);

            if (result.getFine() != null) {
                response.put("fineAmount", result.getFine().getAmount());
                response.put("message", String.format("Resource returned. Fine of ZMW %.2f applied.", result.getFine().getAmount()));
            } else {
                response.put("message", "Resource returned successfully. No fines applied.");
            }

            // OBSERVER PATTERN: Include nextReservedUser in response if exists
            if (result.getNextReservedUser() != null) {
                Member nextUser = result.getNextReservedUser();
                response.put("nextReservedUser", Map.of(
                    "id", nextUser.getId(),
                    "name", nextUser.getName(),
                    "email", nextUser.getEmail()
                ));
                System.out.printf("[NOTIFICATION] Next reserved user: %s (%s)%n", nextUser.getName(), nextUser.getEmail());
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

    // NEW: Get single loan by ID
    public void getLoan(Context ctx) {
        try {
            String loanId = ctx.pathParam("id");
            java.util.List<Loan> allLoans = service.getActiveLoans();

            Loan found = null;
            for (Loan loan : allLoans) {
                if (loan.getId().equals(loanId)) {
                    found = loan;
                    break;
                }
            }

            if (found == null) {
                sendErrorResponse(ctx, HttpStatus.NOT_FOUND, "Loan not found: " + loanId);
                return;
            }

            Map<String, Object> response = new HashMap<>();
            response.put("loan", loanToMap(found));
            response.put("memberId", found.getMember().getId());
            response.put("memberName", found.getMember().getName());

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

    /**
     * GET /api/resources/{id}/next-waiting — Get next member in reservation queue
     * Used by frontend to send EmailJS notification when resource becomes available
     */
    public void getNextWaitingMember(Context ctx) {
        try {
            String resourceId = ctx.pathParam("id");
            Member next = service.getNextWaitingMember(resourceId);

            Map<String, Object> response = new HashMap<>();
            if (next != null) {
                response.put("success", true);
                response.put("hasWaitingMember", true);
                response.put("memberId", next.getId());
                response.put("memberName", next.getName());
                response.put("memberEmail", next.getEmail());
            } else {
                response.put("success", true);
                response.put("hasWaitingMember", false);
            }

            ctx.status(HttpStatus.OK).json(response);
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
        map.put("publisher", resource.getPublisher());

        // POLYMORPHISM: Use polymorphic method instead of instanceof
        map.putAll(resource.getTypeSpecificFields());

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

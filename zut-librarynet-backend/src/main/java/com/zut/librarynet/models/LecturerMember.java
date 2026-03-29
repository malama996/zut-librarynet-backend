package com.zut.librarynet.models;

public class LecturerMember extends Member {
    private String employeeId;
    private String department;
    private int yearsOfService;

    public LecturerMember(String name, String email, String phone,
                          String employeeId, String department, int yearsOfService) {
        super(name, email, phone);
        this.employeeId = validateEmployeeId(employeeId);
        this.department = department;
        this.yearsOfService = validateYearsOfService(yearsOfService);
    }

    private String validateEmployeeId(String employeeId) {
        if (employeeId == null || employeeId.trim().isEmpty()) {
            throw new IllegalArgumentException("Employee ID cannot be empty");
        }
        if (!employeeId.matches("EMP\\d{3}")) {
            throw new IllegalArgumentException("Employee ID must be EMP followed by 3 digits (e.g., EMP001)");
        }
        return employeeId;
    }

    private int validateYearsOfService(int yearsOfService) {
        if (yearsOfService < 0) {
            throw new IllegalArgumentException("Years of service cannot be negative");
        }
        return yearsOfService;
    }

    public String getEmployeeId() { return employeeId; }
    public String getDepartment() { return department; }
    public int getYearsOfService() { return yearsOfService; }

    public void setEmployeeId(String employeeId) { this.employeeId = validateEmployeeId(employeeId); }
    public void setDepartment(String department) { this.department = department; }
    public void setYearsOfService(int yearsOfService) { this.yearsOfService = validateYearsOfService(yearsOfService); }

    @Override
    public double calculateFine(int daysOverdue) {
        // Lecturer: ZMW 5 per day
        return daysOverdue * 5.0;
    }

    @Override
    public int getMaxBorrowLimit() {
        return 10; // Lecturers can borrow up to 10 items
    }

    @Override
    public int getLoanPeriodDays() {
        return 30; // 30-day loan period for lecturers
    }

    @Override
    public String getMemberType() {
        return "LECTURER";
    }

    @Override
    public String toString() {
        return String.format("LECTURER: %s (ID: %s) - %s Department, %d years",
                getName(), employeeId, department, yearsOfService);
    }
}

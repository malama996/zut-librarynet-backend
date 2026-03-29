package com.zut.librarynet.models;

public class StudentMember extends Member {
    // Student-specific fields
    private String studentId;
    private String programme;
    private int yearOfStudy;

    public StudentMember(String name, String email, String phone,
                         String studentId, String programme, int yearOfStudy) {
        super(name, email, phone);
        this.studentId = validateStudentId(studentId);
        this.programme = programme;
        this.yearOfStudy = validateYearOfStudy(yearOfStudy);
    }

    private String validateStudentId(String studentId) {
        if (studentId == null || studentId.trim().isEmpty()) {
            throw new IllegalArgumentException("Student ID cannot be empty");
        }
        // ZUT student ID format: 2024XXX format
        if (!studentId.matches("\\d{7}")) {
            throw new IllegalArgumentException("Student ID must be 7 digits");
        }
        return studentId;
    }

    private int validateYearOfStudy(int yearOfStudy) {
        if (yearOfStudy < 1 || yearOfStudy > 6) {
            throw new IllegalArgumentException("Year of study must be between 1 and 6");
        }
        return yearOfStudy;
    }

    public String getStudentId() { return studentId; }
    public String getProgramme() { return programme; }
    public int getYearOfStudy() { return yearOfStudy; }

    public void setStudentId(String studentId) { this.studentId = validateStudentId(studentId); }
    public void setProgramme(String programme) { this.programme = programme; }
    public void setYearOfStudy(int yearOfStudy) { this.yearOfStudy = validateYearOfStudy(yearOfStudy); }

    // POLYMORPHISM: Implementing abstract methods from Member
    @Override
    public double calculateFine(int daysOverdue) {
        // Student: ZMW 2 per day
        return daysOverdue * 2.0;
    }

    @Override
    public int getMaxBorrowLimit() {
        return 3; // Students can borrow up to 3 items
    }

    @Override
    public int getLoanPeriodDays() {
        return 14; // 14-day loan period for students
    }

    @Override
    public String getMemberType() {
        return "STUDENT";
    }

    @Override
    public String toString() {
        return String.format("STUDENT: %s (ID: %s) - %s, Year %d",
                getName(), studentId, programme, yearOfStudy);
    }
}

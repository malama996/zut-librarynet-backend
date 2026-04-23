package com.zut.librarynet.models;

public class ResearcherMember extends Member {
    private String researcherId;
    private String institution;
    private String researchArea;

    public ResearcherMember(String name, String email, String phone,
                            String researcherId, String institution, String researchArea) {
        super(name, email, phone);
        this.researcherId = validateResearcherId(researcherId);
        this.institution = institution;
        this.researchArea = researchArea;
    }

    private String validateResearcherId(String researcherId) {
        if (researcherId == null || researcherId.trim().isEmpty()) {
            throw new IllegalArgumentException("Researcher ID cannot be empty");
        }
        if (!researcherId.matches("RES\\d{4}")) {
            throw new IllegalArgumentException("Researcher ID must be RES followed by 4 digits (e.g., RES0001)");
        }
        return researcherId;
    }

    public String getResearcherId() { return researcherId; }
    public String getInstitution() { return institution; }
    public String getResearchArea() { return researchArea; }

    public void setResearcherId(String researcherId) { this.researcherId = validateResearcherId(researcherId); }
    public void setInstitution(String institution) { this.institution = institution; }
    public void setResearchArea(String researchArea) { this.researchArea = researchArea; }

    @Override
    public double calculateFine(int daysOverdue) {
        // Researchers pay ZMW 0 fine - no monetary penalty
        return 0.0;
    }

    @Override
    public int getMaxBorrowLimit() {
        return 20; // Researchers can borrow up to 20 items
    }

    @Override
    public int getLoanPeriodDays() {
        return 60; // 60-day loan period for researchers
    }

    @Override
    public String getMemberType() {
        return "RESEARCHER";
    }

    // Researcher-specific business rule: lose borrowing privileges after 14 days overdue
    public boolean hasOverduePrivileges() {
        return getActiveLoans().stream()
                .noneMatch(loan -> loan.isOverdue() && loan.getDaysOverdue() > 14);
    }

    @Override
    public boolean canBorrow() {
        // Researchers must also check overdue privilege
        return super.canBorrow() && hasOverduePrivileges();
    }

    @Override
    public String toString() {
        return String.format("RESEARCHER: %s (ID: %s) - %s, %s",
                getName(), researcherId, institution, researchArea);
    }

    @Override
    public java.util.Map<String, Object> getTypeSpecificFields() {
        java.util.Map<String, Object> fields = new java.util.HashMap<>();
        fields.put("researcherId", this.researcherId);
        fields.put("institution", this.institution);
        fields.put("researchArea", this.researchArea);
        return fields;
    }
}


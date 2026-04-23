package com.zut.librarynet.services;

import com.zut.librarynet.interfaces.FineCalculator;
import com.zut.librarynet.models.Loan;
import com.zut.librarynet.models.Member;

public class DefaultFineCalculator implements FineCalculator {

    @Override
    public double calculateFine(Loan loan) {
        // CRITICAL FIX: Only calculate fine for overdue loans that HAVE been returned
        // Overdue loans that haven't been returned yet: no fine (still possible to extend)
        if (loan == null || !loan.isOverdue() || loan.getReturnDate() == null) {
            return 0.0; // No fine if: null, not overdue, or hasn't been returned yet
        }

        Member member = loan.getMember();
        int daysOverdue = loan.getDaysOverdue();

        // POLYMORPHISM: Member.calculateFine() is polymorphic
        return member.calculateFine(daysOverdue);
    }

    @Override
    public String getFineDescription(Loan loan) {
        if (loan == null || !loan.isOverdue()) {
            return "No fine applicable";
        }

        Member member = loan.getMember();
        int daysOverdue = loan.getDaysOverdue();
        double amount = calculateFine(loan);

        return String.format("%s fine: ZMW %.2f for %d days overdue at ZMW %.2f/day",
                member.getMemberType(), amount, daysOverdue,
                member.calculateFine(1) / 1.0);
    }

    @Override
    public boolean isEligibleForFineWaiver(Loan loan) {
        if (loan == null || !loan.isOverdue()) {
            return false;
        }

        // First-time offenders with less than 5 days overdue can request waiver
        Member member = loan.getMember();
        int daysOverdue = loan.getDaysOverdue();

        return member.getUnpaidFines().isEmpty() && daysOverdue <= 5;
    }
}

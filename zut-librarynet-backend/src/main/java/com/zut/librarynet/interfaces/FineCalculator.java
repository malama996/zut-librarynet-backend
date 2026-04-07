package com.zut.librarynet.interfaces;
import com.zut.librarynet.models.Loan;

/**
 * INTERFACE: Defines contract for fine calculation
 * This demonstrates ABSTRACTION - we know what it does, not how
 */
public interface FineCalculator {
    double calculateFine(Loan loan);
    String getFineDescription(Loan loan);
    boolean isEligibleForFineWaiver(Loan loan);
}

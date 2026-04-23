package com.zut.librarynet.interfaces;

import com.zut.librarynet.models.Member;
import com.zut.librarynet.models.Loan;

/**
 * OBSERVER PATTERN: Interface for observers that need to be notified
 * when a loan is closed (returned).
 *
 * This enables loose coupling between Loan and notification logic.
 * Any class implementing this interface will be notified when a
 * resource is returned, allowing for features like email notifications
 * or queue management without tight dependencies.
 */
public interface LoanObserver {
    /**
     * Called when a loan is closed (resource returned).
     *
     * @param loan The loan that was closed
     * @param nextReservedUser The next user in reservation queue, or null if queue empty
     */
    void onLoanClosed(Loan loan, Member nextReservedUser);
}
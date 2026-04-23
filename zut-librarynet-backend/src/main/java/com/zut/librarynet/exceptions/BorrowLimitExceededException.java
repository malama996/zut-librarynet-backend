package com.zut.librarynet.exceptions;

/**
 * Thrown when a member has reached their borrowing limit
 */
public class BorrowLimitExceededException extends LibraryException {
    public BorrowLimitExceededException(String message) {
        super(message);
    }
}

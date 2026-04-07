package com.zut.librarynet.exceptions;

/**
 * Thrown when a member has outstanding fines preventing borrowing
 */
public class FinesOutstandingException extends LibraryException {
    public FinesOutstandingException(String message) {
        super(message);
    }
}

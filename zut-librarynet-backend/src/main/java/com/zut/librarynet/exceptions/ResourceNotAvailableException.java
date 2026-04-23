package com.zut.librarynet.exceptions;

/**
 * Thrown when a resource is not available for borrowing
 */
public class ResourceNotAvailableException extends LibraryException {
    public ResourceNotAvailableException(String message) {
        super(message);
    }
}

package com.zut.librarynet.exceptions;

/**
 * Thrown when attempting to create a reservation for an available resource
 */
public class ResourceAvailableException extends LibraryException {
    public ResourceAvailableException(String message) {
        super(message);
    }
}

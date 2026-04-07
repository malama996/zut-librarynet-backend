package com.zut.librarynet.exceptions;

/**
 * Thrown when a requested resource is not found in the library system
 */
public class ResourceNotFoundException extends LibraryException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}

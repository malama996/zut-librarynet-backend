package com.zut.librarynet.models;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * User model for authentication system.
 * Separate from Member model (library member data).
 *
 * Role-based access control:
 * - ADMIN: Full access to admin features
 * - MEMBER: Library borrowing features (with specific memberType: STUDENT, LECTURER, RESEARCHER)
 */
public class User {
    private final String id;
    private String name;
    private String email;
    private String passwordHash;
    private String role;          // ADMIN or MEMBER
    private String memberType;    // STUDENT, LECTURER, or RESEARCHER (null for ADMIN)
    private LocalDateTime createdAt;

    // Role constants
    public static final String ROLE_ADMIN   = "ADMIN";
    public static final String ROLE_MEMBER  = "MEMBER";

    // Member type constants
    public static final String TYPE_STUDENT    = "STUDENT";
    public static final String TYPE_LECTURER   = "LECTURER";
    public static final String TYPE_RESEARCHER = "RESEARCHER";

    public User(String name, String email, String passwordHash, String role) {
        this.id           = UUID.randomUUID().toString();
        this.name         = name;
        this.email        = email;
        this.passwordHash = passwordHash;
        this.role         = role;
        this.createdAt    = LocalDateTime.now();
    }

    /** Constructor for member with specific type */
    public User(String name, String email, String passwordHash, String role, String memberType) {
        this(name, email, passwordHash, role);
        this.memberType = memberType;
    }

    // Getters
    public String getId()          { return id; }
    public String getName()         { return name; }
    public String getEmail()        { return email; }
    public String getPasswordHash(){ return passwordHash; }
    public String getRole()         { return role; }
    public String getMemberType()   { return memberType; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    // Setters
    public void setName(String name)           { this.name = name; }
    public void setEmail(String email)         { this.email = email; }
    public void setPasswordHash(String hash)  { this.passwordHash = hash; }
    public void setMemberType(String type)     { this.memberType = type; }

    public boolean isAdmin()  { return ROLE_ADMIN.equals(role); }
    public boolean isMember() { return ROLE_MEMBER.equals(role); }

    @Override
    public String toString() {
        return String.format("User[%s]: %s (%s) - role=%s, memberType=%s",
                id, name, email, role, memberType);
    }
}
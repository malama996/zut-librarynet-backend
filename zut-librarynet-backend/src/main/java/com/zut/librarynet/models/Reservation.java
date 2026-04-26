package com.zut.librarynet.models;

import java.time.LocalDateTime;
import java.util.Queue;
import java.util.UUID;

public class Reservation {
    private final String id;
    private final Member member;
    private final LibraryResource resource;
    private final LocalDateTime reservationDate;
    private String status; // PENDING, NOTIFIED, FULFILLED, CANCELLED, EXPIRED
    private LocalDateTime notifiedDate;
    private LocalDateTime fulfilledDate;
    private LocalDateTime expiryDate;

    public Reservation(String id, Member member, LibraryResource resource,
                       LocalDateTime reservationDate, String status,
                       LocalDateTime expiryDate) {
        this.id = id != null && !id.trim().isEmpty() ? id : UUID.randomUUID().toString();
        this.member = member;
        this.resource = resource;
        this.reservationDate = reservationDate;
        this.status = status;
        this.expiryDate = expiryDate;
    }

    public Reservation(Member member, LibraryResource resource) {
        this(null, member, resource, LocalDateTime.now(), "PENDING", LocalDateTime.now().plusDays(7));
    }


    public String getId() { return id; }
    public Member getMember() { return member; }
    public LibraryResource getResource() { return resource; }
    public LocalDateTime getReservationDate() { return reservationDate; }
    public String getStatus() { return status; }
    public LocalDateTime getNotifiedDate() { return notifiedDate; }
    public LocalDateTime getFulfilledDate() { return fulfilledDate; }
    public LocalDateTime getExpiryDate() { return expiryDate; }

    public boolean isExpired() {
        return status.equals("PENDING") && LocalDateTime.now().isAfter(expiryDate);
    }

    public void markAsNotified() {
        if (!status.equals("PENDING")) {
            throw new IllegalStateException("Can only notify pending reservations");
        }
        this.status = "NOTIFIED";
        this.notifiedDate = LocalDateTime.now();
    }

    public void markAsFulfilled() {
        if (!status.equals("NOTIFIED")) {
            throw new IllegalStateException("Can only fulfill notified reservations");
        }
        this.status = "FULFILLED";
        this.fulfilledDate = LocalDateTime.now();
    }

    public void cancel() {
        if (status.equals("FULFILLED")) {
            throw new IllegalStateException("Cannot cancel fulfilled reservation");
        }
        this.status = "CANCELLED";
    }

    public void expire() {
        if (isExpired() && status.equals("PENDING")) {
            this.status = "EXPIRED";
        }
    }

    public int getQueuePosition(Queue<Reservation> queue) {
        // Calculate position in queue
        int position = 1;
        for (Reservation r : queue) {
            if (r.getId().equals(this.id)) {
                return position;
            }
            position++;
        }
        return -1;
    }

    @Override
    public String toString() {
        return String.format("Reservation[%s]: %s reserved by %s - %s",
                id, resource.getTitle(), member.getName(), status);
    }
}

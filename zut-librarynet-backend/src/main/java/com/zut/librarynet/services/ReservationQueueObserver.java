package com.zut.librarynet.services;
import com.zut.librarynet.interfaces.LoanObserver;
import com.zut.librarynet.models.Loan;
import com.zut.librarynet.models.Reservation;
import com.zut.librarynet.models.Member;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * OBSERVER PATTERN: Implements Observer to watch for returned resources
 * and notify waiting members in the reservation queue.
 *
 * Also implements LoanObserver to receive notifications
 * directly from Loan when a resource is returned.
 */
public class ReservationQueueObserver implements LoanObserver {
    private static ReservationQueueObserver instance;

    // Map of resource to queue of waiting reservations
    private final Map<String, Queue<Reservation>> reservationQueues;
    // Map of resource to list of observers
    private final Map<String, List<ReservationObserver>> observers;

    private ReservationQueueObserver() {
        this.reservationQueues = new ConcurrentHashMap<>();
        this.observers = new ConcurrentHashMap<>();
    }

    public static synchronized ReservationQueueObserver getInstance() {
        if (instance == null) {
            instance = new ReservationQueueObserver();
        }
        return instance;
    }

    public void addReservation(Reservation reservation) {
        String resourceId = reservation.getResource().getId();
        reservationQueues.computeIfAbsent(resourceId, k -> new ConcurrentLinkedQueue<>()).add(reservation);

        // Register default observer
        registerObserver(resourceId, new EmailNotificationObserver());
    }

    /**
     * OBSERVER PATTERN: Implementation of LoanObserver.onLoanClosed.
     * This is called when a loan is closed, allowing us to process
     * the reservation queue and notify the next user.
     */
    @Override
    public synchronized void onLoanClosed(Loan loan, Member nextReservedUser) {
        String resourceId = loan.getResource().getId();
        System.out.printf("[RESERVATION QUEUE] Processing queue for resource: %s%n", resourceId);
    }

    public synchronized Member notifyResourceReturned(Loan loan) {
        // CRITICAL FIX: Synchronize to prevent race condition
        String resourceId = loan.getResource().getId();
        Queue<Reservation> queue = reservationQueues.get(resourceId);

        Member nextUser = null;

        if (queue != null && !queue.isEmpty()) {
            Reservation nextReservation = queue.poll();
            if (nextReservation != null) {
                nextReservation.markAsNotified();
                nextUser = nextReservation.getMember();
                notifyObservers(resourceId, nextReservation);
            }
        }

        return nextUser;
    }

    public void registerObserver(String resourceId, ReservationObserver observer) {
        observers.computeIfAbsent(resourceId, k -> new ArrayList<>()).add(observer);
    }

    private void notifyObservers(String resourceId, Reservation reservation) {
        List<ReservationObserver> resourceObservers = observers.get(resourceId);
        if (resourceObservers != null) {
            for (ReservationObserver observer : resourceObservers) {
                observer.onResourceAvailable(reservation);
            }
        }
    }

    public Queue<Reservation> getQueueForResource(String resourceId) {
        return reservationQueues.getOrDefault(resourceId, new ConcurrentLinkedQueue<>());
    }

    public void removeReservation(Reservation reservation) {
        String resourceId = reservation.getResource().getId();
        Queue<Reservation> queue = reservationQueues.get(resourceId);
        if (queue != null) {
            queue.remove(reservation);
        }
    }

    public int getQueuePosition(Reservation reservation) {
        String resourceId = reservation.getResource().getId();
        Queue<Reservation> queue = reservationQueues.get(resourceId);
        if (queue == null) return -1;

        int position = 1;
        for (Reservation r : queue) {
            if (r.getId().equals(reservation.getId())) {
                return position;
            }
            position++;
        }
        return -1;
    }

    public int getQueueSize(String resourceId) {
        Queue<Reservation> queue = reservationQueues.get(resourceId);
        return queue != null ? queue.size() : 0;
    }

    // Observer Interface
    public interface ReservationObserver {
        void onResourceAvailable(Reservation reservation);
    }

    // Concrete Observer: Email Notification
    public static class EmailNotificationObserver implements ReservationObserver {
        @Override
        public void onResourceAvailable(Reservation reservation) {
            // In production, this would send an actual email
            System.out.printf("[EMAIL NOTIFICATION] To: %s (%s)%n",
                    reservation.getMember().getName(),
                    reservation.getMember().getEmail());
            System.out.printf("Subject: Resource Available - %s%n",
                    reservation.getResource().getTitle());
            System.out.printf("Message: The resource '%s' you reserved is now available. "
                            + "Please collect it within 7 days.%n%n",
                    reservation.getResource().getTitle());
        }
    }
}
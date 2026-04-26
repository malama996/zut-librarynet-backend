package com.zut.librarynet.services;

import com.zut.librarynet.models.Loan;
import com.zut.librarynet.models.Member;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Scheduled job that runs every hour to:
 * 1. Check for ACTIVE loans past due date
 * 2. Mark them as OVERDUE
 * 3. Trigger email notifications
 */
public class OverdueChecker {
    private final ScheduledExecutorService scheduler;
    private final LibraryService libraryService;
    private final EmailService emailService;
    private volatile boolean running = false;

    public OverdueChecker(LibraryService libraryService) {
        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "overdue-checker");
            t.setDaemon(true);
            return t;
        });
        this.libraryService = libraryService;
        this.emailService = EmailService.getInstance();
    }

    public void start() {
        if (running) return;
        running = true;
        // Run immediately, then every hour
        scheduler.scheduleAtFixedRate(this::checkOverdueLoans, 0, 1, TimeUnit.HOURS);
        System.out.println("[OverdueChecker] Started - checking every hour");
    }

    public void stop() {
        running = false;
        scheduler.shutdown();
        System.out.println("[OverdueChecker] Stopped");
    }

    private void checkOverdueLoans() {
        try {
            System.out.println("[OverdueChecker] Running overdue check at " + LocalDate.now());
            libraryService.syncLoansFromFirebase();

            List<Loan> activeLoans = libraryService.getActiveLoans();
            int overdueCount = 0;

            for (Loan loan : activeLoans) {
                if (loan.isOverdue()) {
                    loan.markAsOverdue();
                    libraryService.persistLoan(loan);
                    Member member = loan.getMember();
                    emailService.sendOverdueNoticeEmail(member, loan);
                    overdueCount++;
                }
            }

            if (overdueCount > 0) {
                System.out.println("[OverdueChecker] Marked " + overdueCount + " loans as OVERDUE");
            }
        } catch (Exception e) {
            System.err.println("[OverdueChecker] Error during check: " + e.getMessage());
        }
    }
}

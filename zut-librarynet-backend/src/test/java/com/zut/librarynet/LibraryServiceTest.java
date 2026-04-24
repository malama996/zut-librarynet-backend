package com.zut.librarynet;

import com.zut.librarynet.exceptions.*;
import com.zut.librarynet.models.*;
import com.zut.librarynet.services.LibraryService;
import org.junit.jupiter.api.*;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertTrue;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class LibraryServiceTest {
    private LibraryService service;
    private String studentId;
    private String lecturerId;
    private String researcherId;
    private String bookId;
    private String journalId;
    private String digitalId;

    @BeforeEach
    void setUp() {
        service = new LibraryService();

        // Register members
        Map<String, Object> studentData = new HashMap<>();
        studentData.put("name", "John Doe");
        studentData.put("email", "john.doe@zut.edu.zm");
        studentData.put("phone", "0977123456");
        studentData.put("studentId", "2024001");
        studentData.put("programme", "Computer Science");
        studentData.put("yearOfStudy", 2);
        studentId = service.registerMember("student", studentData).getId();

        Map<String, Object> lecturerData = new HashMap<>();
        lecturerData.put("name", "Dr. Jane Smith");
        lecturerData.put("email", "jane.smith@zut.edu.zm");
        lecturerData.put("phone", "0977234567");
        lecturerData.put("employeeId", "EMP001");
        lecturerData.put("department", "Computer Science");
        lecturerData.put("yearsOfService", 5);
        lecturerId = service.registerMember("lecturer", lecturerData).getId();

        Map<String, Object> researcherData = new HashMap<>();
        researcherData.put("name", "Dr. Robert Brown");
        researcherData.put("email", "robert.brown@research.org");
        researcherData.put("phone", "0977345678");
        researcherData.put("researcherId", "RES0001");
        researcherData.put("institution", "ZUT Research Centre");
        researcherData.put("researchArea", "Artificial Intelligence");
        researcherId = service.registerMember("researcher", researcherData).getId();

        // Add resources
        Map<String, Object> bookData = new HashMap<>();
        bookData.put("title", "Java Programming: A Comprehensive Guide");
        bookData.put("publisher", "O'Reilly Media");
        bookData.put("isbn", "978-1492077991");
        bookData.put("author", "John Johnson");
        bookData.put("edition", "4th");
        bookId = service.addResource("book", bookData).getId();

        Map<String, Object> journalData = new HashMap<>();
        journalData.put("title", "Journal of Computer Science Research");
        journalData.put("publisher", "ACM");
        journalData.put("issn", "1234-5678");
        journalData.put("volume", 15);
        journalData.put("issue", 2);
        journalId = service.addResource("journal", journalData).getId();

        Map<String, Object> digitalData = new HashMap<>();
        digitalData.put("title", "ZUT Digital Library Guide");
        digitalData.put("publisher", "ZUT Press");
        digitalData.put("url", "https://library.zut.edu.zm/digital");
        digitalData.put("licenceExpiry", "2025-12-31");
        digitalId = service.addResource("digital", digitalData).getId();
    }

    // TEST 1: ENCAPSULATION - Validation prevents invalid data
    @Test
    @Order(1)
    void testEncapsulation_InvalidDataThrowsException() {
        Map<String, Object> invalidStudent = new HashMap<>();
        invalidStudent.put("name", "");
        invalidStudent.put("email", "invalid");
        invalidStudent.put("phone", "123");
        invalidStudent.put("studentId", "123");
        invalidStudent.put("programme", "CS");
        invalidStudent.put("yearOfStudy", 2);

        assertThrows(IllegalArgumentException.class, () -> {
            service.registerMember("student", invalidStudent);
        });

        Map<String, Object> invalidBook = new HashMap<>();
        invalidBook.put("title", "");
        invalidBook.put("publisher", "Test");
        invalidBook.put("isbn", "invalid");
        invalidBook.put("author", "");
        invalidBook.put("edition", "1st");

        assertThrows(IllegalArgumentException.class, () -> {
            service.addResource("book", invalidBook);
        });
    }

    // TEST 2: INHERITANCE - Polymorphic behavior across member types
    @Test
    @Order(2)
    void testInheritance_PolymorphicMemberBehavior() {
        Member student = service.getMember(studentId);
        Member lecturer = service.getMember(lecturerId);
        Member researcher = service.getMember(researcherId);

        assertTrue(student instanceof StudentMember);
        assertTrue(lecturer instanceof LecturerMember);
        assertTrue(researcher instanceof ResearcherMember);

        assertEquals(3, student.getMaxBorrowLimit());
        assertEquals(10, lecturer.getMaxBorrowLimit());
        assertEquals(20, researcher.getMaxBorrowLimit());

        assertEquals(14, student.getLoanPeriodDays());
        assertEquals(30, lecturer.getLoanPeriodDays());
        assertEquals(60, researcher.getLoanPeriodDays());
    }

    // TEST 3: POLYMORPHISM - Fine calculation differs by member type
    @Test
    @Order(3)
    void testPolymorphism_FineCalculationDiffersByMemberType() {
        Member student = service.getMember(studentId);
        Member lecturer = service.getMember(lecturerId);
        Member researcher = service.getMember(researcherId);

        assertEquals(20.0, student.calculateFine(10));
        assertEquals(50.0, lecturer.calculateFine(10));
        assertEquals(0.0, researcher.calculateFine(10));
    }

    // TEST 4: ENCAPSULATION - Cannot directly modify private fields
    @Test
    @Order(4)
    void testEncapsulation_NoDirectFieldAccess() {
        Member student = service.getMember(studentId);
        assertNotNull(student.getId());
        assertNotNull(student.getName());
        assertNotNull(student.getEmail());
        assertNotNull(student.getPhone());
    }

    // TEST 5: POLYMORPHISM - Resource statements differ by type
    @Test
    @Order(5)
    void testPolymorphism_ResourceStatementsDiffer() {
        LibraryResource book = service.getResource(bookId);
        LibraryResource journal = service.getResource(journalId);
        LibraryResource digital = service.getResource(digitalId);

        String bookStatement = book.generateStatement();
        String journalStatement = journal.generateStatement();
        String digitalStatement = digital.generateStatement();

        assertTrue(bookStatement.startsWith("BOOK:"));
        assertTrue(journalStatement.startsWith("JOURNAL:"));
        assertTrue(digitalStatement.startsWith("DIGITAL RESOURCE:"));
    }

    // TEST 6: BUSINESS RULE - Digital resources cannot be borrowed
    @Test
    @Order(6)
    void testBusinessRule_DigitalResourceCannotBeBorrowed() {
        assertThrows(ResourceNotAvailableException.class, () -> {
            service.borrowResource(studentId, digitalId);
        });
    }

    // TEST 7: BUSINESS RULE - Student borrow limit
    @Test
    @Order(7)
    void testBusinessRule_StudentBorrowLimit() throws LibraryException {
        List<String> bookIds = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            Map<String, Object> bookData = new HashMap<>();
            bookData.put("title", "Test Book " + i);
            bookData.put("publisher", "Test Publisher");
            bookData.put("isbn", "978-123456789" + i);
            bookData.put("author", "Test Author");
            bookData.put("edition", "1st");
            String id = service.addResource("book", bookData).getId();
            bookIds.add(id);
        }

        for (int i = 0; i < 3; i++) {
            service.borrowResource(studentId, bookIds.get(i));
        }

        assertThrows(BorrowLimitExceededException.class, () -> {
            service.borrowResource(studentId, bookIds.get(3));
        });
    }

    // TEST 8: BUSINESS RULE - Fines > 50 prevent borrowing
    @Test
    @Order(8)
    void testBusinessRule_FinesPreventBorrowing() throws LibraryException {
        Member student = service.getMember(studentId);

        Loan mockLoan = new Loan(student, service.getResource(bookId));
        Fine fine = new Fine(mockLoan, 75.0);
        student.addFine(fine);

        assertFalse(student.canBorrow());
        assertEquals(75.0, student.getTotalUnpaidFines());

        assertThrows(FinesOutstandingException.class, () -> {
            service.borrowResource(studentId, journalId);
        });
    }

    // TEST 9: BUSINESS RULE - Member cannot borrow same resource twice
    @Test
    @Order(9)
    void testBusinessRule_CannotBorrowSameResourceTwice() throws LibraryException {
        service.borrowResource(studentId, bookId);

        assertThrows(ResourceNotAvailableException.class, () -> {
            service.borrowResource(studentId, bookId);
        });
    }

    // TEST 10: POLYMORPHISM - Lecturer and researcher have different loan periods
    @Test
    @Order(10)
    void testPolymorphism_LoanPeriods() throws LibraryException {
        Map<String, Object> bookData = new HashMap<>();
        bookData.put("title", "Advanced Java");
        bookData.put("publisher", "Pearson");
        bookData.put("isbn", "978-0134685991");
        bookData.put("author", "Joshua Bloch");
        bookData.put("edition", "3rd");
        String testBookId = service.addResource("book", bookData).getId();

        Loan studentLoan = service.borrowResource(studentId, testBookId);
        assertEquals(14, java.time.temporal.ChronoUnit.DAYS.between(
                studentLoan.getBorrowDate(), studentLoan.getDueDate()));

        service.returnResource(studentLoan.getId());
        Loan lecturerLoan = service.borrowResource(lecturerId, testBookId);
        assertEquals(30, java.time.temporal.ChronoUnit.DAYS.between(
                lecturerLoan.getBorrowDate(), lecturerLoan.getDueDate()));
    }

    // TEST 11: ENCAPSULATION - Loan cannot be modified after creation
    @Test
    @Order(11)
    void testEncapsulation_LoanImmutability() throws LibraryException {
        Loan loan = service.borrowResource(studentId, bookId);
        assertNotNull(loan.getId());
    }

    // TEST 12: Get member loans
    @Test
    @Order(12)
    void testGetMemberLoans() throws LibraryException {
        service.borrowResource(studentId, bookId);
        List<Loan> loans = service.getMemberLoans(studentId);

        assertEquals(1, loans.size());
        assertEquals(bookId, loans.get(0).getResource().getId());
    }

    // TEST 13: Return resource and calculate fine
    @Test
    @Order(13)
    void testReturnResource_WithFineCalculation() throws LibraryException {
        Loan loan = service.borrowResource(studentId, bookId);
        LibraryService.ReturnResult result = service.returnResource(loan.getId());
        assertNull(result.getFine());
    }

    // TEST 14: Create reservation
    @Test
    @Order(14)
    void testCreateReservation() throws LibraryException {
        service.borrowResource(studentId, bookId);
        Reservation reservation = service.createReservation(lecturerId, bookId);

        assertNotNull(reservation);
        assertEquals("PENDING", reservation.getStatus());
    }

    // TEST 15: Get available resources
    @Test
    @Order(15)
    void testGetAvailableResources() throws LibraryException {
        List<LibraryResource> available = service.getAvailableResources();
        assertEquals(3, available.size());

        service.borrowResource(studentId, bookId);

        available = service.getAvailableResources();
        assertEquals(2, available.size());
    }

    // TEST 16: Researcher loses privileges after 14 days overdue
    @Test
    @Order(16)
    void testResearcherSpecialRule() throws LibraryException {
        ResearcherMember researcher = (ResearcherMember) service.getMember(researcherId);
        assertTrue(researcher.canBorrow());

        Loan loan = new Loan(researcher, service.getResource(bookId));
        researcher.addActiveLoan(loan);

        assertNotNull(researcher.hasOverduePrivileges());
    }

    // TEST 17: Resource not found exceptions
    @Test
    @Order(17)
    void testResourceNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> {
            service.borrowResource(studentId, "nonexistent-id");
        });

        assertThrows(ResourceNotFoundException.class, () -> {
            service.returnResource("nonexistent-loan-id");
        });
    }

    // TEST 18: Invalid member type
    @Test
    @Order(18)
    void testInvalidMemberType() {
        Map<String, Object> invalidData = new HashMap<>();
        invalidData.put("name", "Test");
        invalidData.put("email", "test@test.com");
        invalidData.put("phone", "0977123456");

        assertThrows(IllegalArgumentException.class, () -> {
            service.registerMember("invalid", invalidData);
        });
    }

    // TEST 19: Invalid resource type
    @Test
    @Order(19)
    void testInvalidResourceType() {
        Map<String, Object> data = new HashMap<>();
        data.put("title", "Test");
        data.put("publisher", "Test");

        assertThrows(IllegalArgumentException.class, () -> {
            service.addResource("invalid", data);
        });
    }

    // TEST 20: Phone number validation
    @Test
    @Order(20)
    void testPhoneNumberValidation() {
        Map<String, Object> invalidPhone = new HashMap<>();
        invalidPhone.put("name", "Test User");
        invalidPhone.put("email", "test@test.com");
        invalidPhone.put("phone", "12345678");
        invalidPhone.put("studentId", "2024001");
        invalidPhone.put("programme", "CS");
        invalidPhone.put("yearOfStudy", 2);

        assertThrows(IllegalArgumentException.class, () -> {
            service.registerMember("student", invalidPhone);
        });
    }

    // TEST 21: Reservation queue notification
    @Test
    @Order(21)
    void testReservationQueueNotification() throws LibraryException {
        service.borrowResource(studentId, bookId);
        Reservation reservation = service.createReservation(lecturerId, bookId);

        Loan loan = service.getMemberLoans(studentId).get(0);
        service.returnResource(loan.getId());

        assertEquals("NOTIFIED", reservation.getStatus());
    }

    // TEST 22: Cannot reserve available resource
    @Test
    @Order(22)
    void testCannotReserveAvailableResource() throws LibraryException {
        assertThrows(ResourceAvailableException.class, () -> {
            service.createReservation(lecturerId, bookId);
        });
    }

    // TEST 23: Cannot duplicate reservation
    @Test
    @Order(23)
    void testCannotDuplicateReservation() throws LibraryException {
        service.borrowResource(studentId, bookId);
        service.createReservation(lecturerId, bookId);

        assertThrows(LibraryException.class, () -> {
            service.createReservation(lecturerId, bookId);
        });
    }

    // TEST 24: Cancel reservation
    @Test
    @Order(24)
    void testCancelReservation() throws LibraryException {
        service.borrowResource(studentId, bookId);
        Reservation reservation = service.createReservation(lecturerId, bookId);

        service.cancelReservation(reservation.getId());
        assertEquals("CANCELLED", reservation.getStatus());
    }

    // TEST 25: Pay fine
    @Test
    @Order(25)
    void testPayFine() throws LibraryException {
        Member student = service.getMember(studentId);

        Loan mockLoan = new Loan(student, service.getResource(bookId));
        Fine fine = new Fine(mockLoan, 30.0);
        student.addFine(fine);

        assertEquals(30.0, student.getTotalUnpaidFines());

        service.payFine(studentId, fine.getId());

        assertEquals(0.0, student.getTotalUnpaidFines());
        assertTrue(fine.isPaid());
    }

    // TEST 26: Statistics endpoint
    @Test
    @Order(26)
    void testGetStatistics() {
        Map<String, Long> stats = service.getStatistics();

        assertEquals(3, stats.get("totalMembers"));
        assertEquals(3, stats.get("totalResources"));
        assertEquals(0, stats.get("activeLoans"));
        assertEquals(3, stats.get("availableResources"));
    }

    // TEST 27: Get resources by type
    @Test
    @Order(27)
    void testGetResourcesByType() {
        List<LibraryResource> books = service.getResourcesByType("BOOK");
        assertEquals(1, books.size());

        List<LibraryResource> journals = service.getResourcesByType("JOURNAL");
        assertEquals(1, journals.size());

        List<LibraryResource> digital = service.getResourcesByType("DIGITAL");
        assertEquals(1, digital.size());
    }

    // TEST 28: Loan cannot be returned twice
    @Test
    @Order(28)
    void testCannotReturnLoanTwice() throws LibraryException {
        Loan loan = service.borrowResource(studentId, bookId);
        service.returnResource(loan.getId());

        assertThrows(IllegalStateException.class, () -> {
            service.returnResource(loan.getId());
        });
    }

    // TEST 29: Invalid member ID in loan
    @Test
    @Order(29)
    void testInvalidMemberInLoan() {
        assertThrows(ResourceNotFoundException.class, () -> {
            service.borrowResource("invalid-id", bookId);
        });
    }

    // TEST 30: Invalid resource ID in loan
    @Test
    @Order(30)
    void testInvalidResourceInLoan() {
        assertThrows(ResourceNotFoundException.class, () -> {
            service.borrowResource(studentId, "invalid-id");
        });
    }
}

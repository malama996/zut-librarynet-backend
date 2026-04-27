# 📚 ZUT LibraryNet System

![Java](https://img.shields.io/badge/Java-17+-orange)
![Javalin](https://img.shields.io/badge/Framework-Javalin-blue)
![React](https://img.shields.io/badge/Frontend-React-cyan)
![Firebase](https://img.shields.io/badge/Database-Firestore-yellow)

ZUT LibraryNet is a modern, full-stack Library Management System designed for the Zambia University of Technology (ZUT). Built with a strong emphasis on **Object-Oriented Programming (OOP)** principles, it features a scalable Java backend, a responsive React frontend, and real-time cloud data storage via Firebase Firestore.

---

## ✨ Key Features

- **Polymorphic Membership:** Distinct rules, borrowing limits, and fine calculations for Students, Lecturers, and Researchers.
- **Resource Management:** Handles physical Books, specialized Journals (for researchers only), and Digital Resources (online access only).
- **Automated Fines:** Smart fine calculation based on dynamic member-type rules.
- **Reservation Queue (Observer Pattern):** Users can reserve currently borrowed items and receive automatic EmailJS notifications when the item becomes available.
- **Admin Dashboard:** Full CRM-style control over resources, members, active loans, and system analytics.

---

## 🛠️ Technology Stack

### Backend
* **Language:** Java 17+
* **Framework:** Javalin (Lightweight REST framework)
* **Authentication:** Firebase Admin SDK
* **Notifications:** EmailJS REST API
* **Testing:** JUnit 5
* **Build Tool:** Maven

### Frontend
* **Library:** React 18
* **Build Tool:** Vite
* **Styling:** Tailwind CSS + custom UI components
* **HTTP Client:** Axios

### Database
* **Database:** Firebase Cloud Firestore (NoSQL)

---

## 🏗️ Architecture & OOP Design

This project serves as a showcase for robust OOP principles:

* **Encapsulation:** All internal states (e.g., `activeLoans`, `unpaidFines`) are hidden behind private access modifiers and manipulated exclusively through validated getter/setter logic.
* **Inheritance:** `Book`, `Journal`, and `DigitalResource` inherit from the abstract `LibraryResource` base class, eliminating code duplication while allowing specialized fields (like `url` for digital assets).
* **Polymorphism:** Fine calculation and borrowing rules are polymorphic. Calling `member.calculateFine()` automatically applies the correct mathematical rules depending on whether the instance is a `StudentMember` or `ResearcherMember`.
* **Abstraction:** Interfaces (like `FineCalculator` and `LoanObserver`) abstract away complex implementations from the service layer.

---

## 🚀 Installation & Setup

### Prerequisites
* Java JDK 17+
* Node.js v18+
* Maven
* A Firebase Project with Firestore enabled
* An EmailJS account

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd zut-librarynet-backend
   ```
2. Set up your environment variables. Create a `.env` file in the root of the backend folder:
   ```env
   EMAILJS_SERVICE_ID=your_service_id
   EMAILJS_TEMPLATE_ID=your_template_id
   EMAILJS_PUBLIC_KEY=your_public_key
   ```
3. Add your Firebase `serviceAccountKey.json` into the `src/main/resources/` directory.
4. Build and run the server:
   ```bash
   mvn clean install
   mvn exec:java -Dexec.mainClass="com.zut.librarynet.LibraryNetApp"
   ```
   *The backend will start on `http://localhost:7070`.*

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd zut-librarynet-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the frontend environment variables in a `.env` file:
   ```env
   VITE_API_URL=http://localhost:7070
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *The frontend will start on `http://localhost:5173`.*

---

## 📡 Core API Endpoints

The API is fully documented via an included Postman Collection (located in `/postman`).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/members/register` | Registers a new member |
| `POST` | `/api/members/login` | Authenticates a member |
| `GET`  | `/api/resources` | Lists all library resources |
| `POST` | `/api/loans/borrow` | Borrows a resource (applies limit/fine checks) |
| `POST` | `/api/loans/:id/return` | Returns a resource, calculates fines |
| `POST` | `/api/reservations` | Places a member in the resource waitlist |

---

## 🧪 Testing

The system includes a comprehensive suite of JUnit tests validating boundary conditions, polymorphism, and edge cases.

```bash
cd zut-librarynet-backend
mvn test
```

---

## 👥 Contributors / License

Developed as part of the DIT 400 Object-Oriented Programming assessment.

**Academic Integrity:** This code is submitted for academic grading. Unauthorized duplication is prohibited.

**License:** MIT License

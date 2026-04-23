import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MdHome, MdLocalLibrary, MdAssignmentReturn, MdLibraryBooks, MdBarChart, MdAssignment, MdEvent } from 'react-icons/md';
import './App.css';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import DashboardPage from './pages/DashboardPage';
import AvailableResourcesPage from './pages/AvailableResourcesPage';
import BorrowResourcePage from './pages/BorrowResourcePage';
import ReturnResourcePage from './pages/ReturnResourcePage';
import StatisticsPage from './pages/StatisticsPage';
import ReservationsPage from './pages/ReservationsPage';
import AdminDashboard from './pages/AdminDashboard';

// Layouts
import AppShell from './layouts/AppShell';

// Firebase
import { initializeFirebase } from './firebase';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        // Check auth from localStorage
        const token = localStorage.getItem('authToken');
        const name = localStorage.getItem('userName');
        const role = localStorage.getItem('userRole');

        if (token && name) {
            setIsLoggedIn(true);
            setUserName(name);
            setUserRole(role || 'MEMBER');
        }

        // Initialize Firebase
        initializeFirebase();
    }, []);

    const handleLoginSuccess = (user) => {
        setIsLoggedIn(true);
        setUserName(user.name);
        setUserRole(user.role);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        setIsLoggedIn(false);
        setUserName('');
        setUserRole('');
    };

    // Redirect based on role
    const getDefaultRoute = () => {
        return userRole === 'ADMIN' ? '/admin' : '/';
    };

    // Separate navigation sets per role
    const memberNav = [
        { path: '/', icon: MdHome,                  label: 'Dashboard',    color: '#3b82f6' },
        { path: '/borrow', icon: MdLocalLibrary,     label: 'Borrow',       color: '#1e40af' },
        { path: '/return', icon: MdAssignmentReturn, label: 'Return',       color: '#059669' },
        { path: '/available', icon: MdLibraryBooks,  label: 'Available',    color: '#9333ea' },
        { path: '/stats', icon: MdBarChart,          label: 'Statistics',   color: '#f97316' },
        { path: '/reservations', icon: MdEvent,   label: 'Reservations', color: '#0891b2' },
    ];

    const adminNav = [
        { path: '/admin', icon: MdAssignment, label: 'Admin Panel', color: '#dc2626' },
    ];

    const navLinks = userRole === 'ADMIN' ? adminNav : memberNav;

    return (
        <>
            <Toaster position="top-right" />
            <Router>
                {/* AUTHENTICATED ROUTES */}
                {isLoggedIn ? (
                    <AppShell
                        userName={userName}
                        userRole={userRole}
                        onLogout={handleLogout}
                        navLinks={navLinks}
                    >
                        <Routes>
                            {/* ADMIN routes — admin panel ONLY */}
                            {userRole === 'ADMIN' ? (
                                <Route path="/admin" element={<AdminDashboard />} />
                            ) : (
                                /* MEMBER routes — member dashboard only */
                                <>
                                    <Route path="/"              element={<DashboardPage />} />
                                    <Route path="/borrow"        element={<BorrowResourcePage />} />
                                    <Route path="/return"        element={<ReturnResourcePage />} />
                                    <Route path="/available"     element={<AvailableResourcesPage />} />
                                    <Route path="/stats"         element={<StatisticsPage />} />
                                    <Route path="/reservations"  element={<ReservationsPage />} />
                                </>
                            )}

                            {/* Catch-all redirect */}
                            <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
                        </Routes>
                    </AppShell>
                ) : (
                    /* PUBLIC ROUTES */
                    <Routes>
                        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
                        <Route path="/register" element={<RegisterPage onSuccess={handleLoginSuccess} />} />
                        <Route path="/admin/register" element={<AdminRegisterPage onSuccess={handleLoginSuccess} />} />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </Routes>
                )}
            </Router>
        </>
    );
}

export default App;
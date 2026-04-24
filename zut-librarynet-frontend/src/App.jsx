import React from 'react';
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

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppRoutes() {
  const { isLoggedIn, name, role, logout } = useAuth();

  const getDefaultRoute = () => {
    return role === 'admin' ? '/admin' : '/';
  };

  const memberNav = [
    { path: '/', icon: MdHome, label: 'Dashboard', color: '#3b82f6' },
    { path: '/borrow', icon: MdLocalLibrary, label: 'Borrow', color: '#1e40af' },
    { path: '/return', icon: MdAssignmentReturn, label: 'Return', color: '#059669' },
    { path: '/available', icon: MdLibraryBooks, label: 'Available', color: '#9333ea' },
    { path: '/stats', icon: MdBarChart, label: 'Statistics', color: '#f97316' },
    { path: '/reservations', icon: MdEvent, label: 'Reservations', color: '#0891b2' },
  ];

  const adminNav = [
    { path: '/admin', icon: MdAssignment, label: 'Admin Panel', color: '#dc2626' },
  ];

  const navLinks = role === 'admin' ? adminNav : memberNav;

  return (
    <Router>
      {isLoggedIn ? (
        <AppShell
          userName={name}
          userRole={role?.toUpperCase() || 'MEMBER'}
          onLogout={logout}
          navLinks={navLinks}
        >
          <Routes>
            {role === 'admin' ? (
              <Route path="/admin" element={<AdminDashboard />} />
            ) : (
              <>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/borrow" element={<BorrowResourcePage />} />
                <Route path="/return" element={<ReturnResourcePage />} />
                <Route path="/available" element={<AvailableResourcesPage />} />
                <Route path="/stats" element={<StatisticsPage />} />
                <Route path="/reservations" element={<ReservationsPage />} />
              </>
            )}
            <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
          </Routes>
        </AppShell>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/register" element={<AdminRegisterPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Router>
  );
}

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </>
  );
}

export default App;


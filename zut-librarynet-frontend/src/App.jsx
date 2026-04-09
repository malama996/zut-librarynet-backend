import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';

// Import components
import MemberRegistration from './components/MemberRegistration';
import ResourceManagement from './components/ResourceManagement';
import BorrowResource from './components/BorrowResource';
import ReturnResource from './components/ReturnResource';
import MemberDashboard from './components/MemberDashboard';
import AvailableResources from './components/AvailableResources';
import ReservationManagement from './components/ReservationManagement';
import OverdueReport from './components/OverdueReport';
import SearchResources from './components/SearchResources';
import Statistics from './components/Statistics';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
      <Router>
        <div className="app">
          <Toaster position="top-right" />

          <nav className="navbar">
            <div className="navbar-brand">
              <h1>📚 ZUT LibraryNet</h1>
              <p>University Library Management System</p>
            </div>
            <div className="navbar-links">
              <Link to="/" onClick={() => setActiveTab('dashboard')}>Dashboard</Link>
              <Link to="/register" onClick={() => setActiveTab('register')}>Register Member</Link>
              <Link to="/resources" onClick={() => setActiveTab('resources')}>Add Resource</Link>
              <Link to="/borrow" onClick={() => setActiveTab('borrow')}>Borrow</Link>
              <Link to="/return" onClick={() => setActiveTab('return')}>Return</Link>
              <Link to="/available" onClick={() => setActiveTab('available')}>Available</Link>
              <Link to="/reservations" onClick={() => setActiveTab('reservations')}>Reservations</Link>
              <Link to="/overdue" onClick={() => setActiveTab('overdue')}>Overdue Report</Link>
              <Link to="/search" onClick={() => setActiveTab('search')}>Search</Link>
            </div>
          </nav>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<Statistics />} />
              <Route path="/register" element={<MemberRegistration />} />
              <Route path="/resources" element={<ResourceManagement />} />
              <Route path="/borrow" element={<BorrowResource />} />
              <Route path="/return" element={<ReturnResource />} />
              <Route path="/members/:memberId" element={<MemberDashboard />} />
              <Route path="/available" element={<AvailableResources />} />
              <Route path="/reservations" element={<ReservationManagement />} />
              <Route path="/overdue" element={<OverdueReport />} />
              <Route path="/search" element={<SearchResources />} />
            </Routes>
          </main>
        </div>
      </Router>
  );
}

export default App;

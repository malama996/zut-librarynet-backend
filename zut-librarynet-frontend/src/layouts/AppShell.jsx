import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { MdLibraryBooks, MdPerson, MdHome, MdLocalLibrary, MdAssignmentReturn, MdBarChart, MdAssignment } from 'react-icons/md';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

function AppShell({ children, userName, userRole, onLogout, navLinks }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const location = useLocation();

  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
      // Close sidebar on mobile
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (path) => location.pathname === path;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const navigationLinks = navLinks || [];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 30,
            display: 'block',
          }}
          className="md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        style={{
          position: isDesktop ? 'relative' : 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '16rem',
          backgroundColor: '#1e3a5f',
          color: 'white',
          transform: isDesktop ? 'translateX(0)' : (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'),
          transition: 'transform 0.3s ease-in-out',
          zIndex: isDesktop ? 'auto' : 50,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="p-6 border-b border-blue-800">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdLibraryBooks style={{ fontSize: '1.75rem', color: 'white' }} />
            <h1 className="text-2xl font-bold">ZUT LibraryNet</h1>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {navigationLinks.map(({ path, icon: Icon, label, color }) => (
            <Link
              key={path}
              to={path}
              onClick={closeSidebar}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                transition: 'all 0.2s',
                backgroundColor: isActive(path) ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: 'rgba(255, 255, 255, 0.95)',
                borderLeft: isActive(path) ? `4px solid ${color}` : '4px solid transparent',
                paddingLeft: '0.75rem',
              }}
              onMouseEnter={(e) => {
                if (!isActive(path)) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.querySelector('svg').style.color = color;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(path)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.querySelector('svg').style.color = 'rgba(255, 255, 255, 0.95)';
                }
              }}
            >
              <Icon style={{ fontSize: '1.5rem', color: isActive(path) ? color : 'rgba(255, 255, 255, 0.95)', transition: 'color 0.2s' }} />
              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem', textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)', letterSpacing: '0.3px' }}>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-800">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <MdPerson style={{ fontSize: '1rem', color: '#dbeafe' }} />
            <p className="text-sm text-blue-100 m-0">
              {userName || 'Guest'}
            </p>
          </div>
          <Badge variant="outline" className="text-blue-100 border-blue-600 mb-4 block">
            {userRole === 'ADMIN'
              ? 'Administrator'
              : userRole === 'STUDENT'
              ? 'Student'
              : userRole === 'LECTURER'
              ? 'Lecturer'
              : userRole === 'RESEARCHER'
              ? 'Researcher'
              : 'Member'}
          </Badge>
          <Button
            variant="ghost"
            className="w-full justify-start text-blue-100 hover:bg-blue-800"
            onClick={onLogout}
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow" style={{ zIndex: 40 }}>
          <div className="flex items-center justify-between">
            {!isDesktop && (
              <button
                type="button"
                onClick={toggleSidebar}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  cursor: 'pointer',
                  backgroundColor: sidebarOpen ? '#3b82f6' : '#f3f4f6',
                  border: sidebarOpen ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  transition: 'all 0.2s',
                }}
                title={sidebarOpen ? 'Close menu' : 'Open menu'}
                aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={sidebarOpen}
                aria-controls="sidebar"
              >
                {sidebarOpen ? <X size={24} color="#ffffff" strokeWidth={3} /> : <Menu size={24} color="#1e3a5f" strokeWidth={2.5} />}
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {/* Page title goes here */}
            </h2>
            <div className="flex items-center gap-4">
              {/* Notifications, settings, etc. */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;

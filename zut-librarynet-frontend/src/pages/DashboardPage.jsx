import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { BookOpen, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { getMemberLoans, getMemberFines } from '../api/api';
import { useAuth } from '../contexts/AuthContext';

function DashboardPage() {
  const navigate = useNavigate();
  const { uid, name, role } = useAuth();

  const [stats, setStats] = useState({
    currentlyBorrowed: 0,
    dueSoon: 0,
    overdue: 0,
    fines: 0,
  });
  const [activeLoans, setActiveLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    if (uid) {
      fetchDashboardData();
    }
  }, [uid]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch active loans
      const loansResponse = await getMemberLoans(uid);
      const loans = loansResponse.data?.activeLoans || [];
      setActiveLoans(loans);

      // Fetch fines
      const finesResponse = await getMemberFines(uid);
      const totalFines = finesResponse.data?.totalUnpaidFines || 0;

      // Calculate stats
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const overdueCount = loans.filter(loan => {
        const dueDate = new Date(loan.dueDate);
        return now > dueDate;
      }).length;

      const dueSoonCount = loans.filter(loan => {
        const dueDate = new Date(loan.dueDate);
        return dueDate >= now && dueDate <= threeDaysFromNow;
      }).length;

      setStats({
        currentlyBorrowed: loans.length,
        dueSoon: dueSoonCount,
        overdue: overdueCount,
        fines: totalFines,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  // Check if overdue
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date() > new Date(dueDate);
  };

  // Calculate days overdue
  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const now = new Date();
    if (now <= due) return 0;
    const diff = now - due;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-amber-500 rounded-lg text-white p-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {name || 'Member'}!</h1>
        <p className="text-lg text-white/90">
          You&apos;re logged in as a{' '}
          <Badge className="bg-white/20 text-white border-white/40 inline-block ml-2">
            {role || 'Member'}
          </Badge>
        </p>
      </div>

      {/* Statistics Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Library Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            icon={<BookOpen className="text-blue-600" size={32} />}
            label="Currently Borrowed"
            value={isLoading ? '...' : stats.currentlyBorrowed}
            color="blue"
          />
          <StatCard
            icon={<Clock className="text-amber-600" size={32} />}
            label="Due Soon"
            value={isLoading ? '...' : stats.dueSoon}
            color="amber"
          />
          <StatCard
            icon={<AlertCircle className="text-red-600" size={32} />}
            label="Overdue Loans"
            value={isLoading ? '...' : stats.overdue}
            color="red"
          />
          <StatCard
            icon={<CheckCircle className="text-green-600" size={32} />}
            label="Fines Outstanding"
            value={isLoading ? '...' : `ZMW ${stats.fines}`}
            color="green"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/available">
              <CardContent className="p-8 text-center">
                <BookOpen className="mx-auto mb-4 text-blue-600" size={40} />
                <h3 className="text-lg font-semibold mb-2">Browse Available</h3>
                <p className="text-gray-600 mb-4">View all resources available for borrowing</p>
                <Button size="sm">Browse Now</Button>
              </CardContent>
            </Link>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/return">
              <CardContent className="p-8 text-center">
                <Clock className="mx-auto mb-4 text-amber-600" size={40} />
                <h3 className="text-lg font-semibold mb-2">Return Resource</h3>
                <p className="text-gray-600 mb-4">Return a borrowed resource or renew</p>
                <Button size="sm">Return Now</Button>
              </CardContent>
            </Link>
          </Card>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/stats">
              <CardContent className="p-8 text-center">
                <CheckCircle className="mx-auto mb-4 text-green-600" size={40} />
                <h3 className="text-lg font-semibold mb-2">My Statistics</h3>
                <p className="text-gray-600 mb-4">View your borrowing statistics and history</p>
                <Button size="sm">View Stats</Button>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>

      {/* Active Loans Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Active Loans</h2>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            ) : activeLoans.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {activeLoans.map((loan) => (
                  <div key={loan.loanId} className="p-6 flex items-start justify-between hover:bg-gray-50">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{loan.resourceTitle}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Due: {formatDate(loan.dueDate)}
                      </p>
                      {isOverdue(loan.dueDate) && (
                        <Badge variant="destructive" className="mt-2">
                          {getDaysOverdue(loan.dueDate)} days overdue
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/return')}
                      >
                        Return
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-500">No active loans. You haven&apos;t borrowed any resources yet.</p>
                <Button className="mt-4" onClick={() => navigate('/available')}>
                  Browse Available Resources
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200',
  };

  return (
    <Card className={`border ${colorClasses[color] || 'border-gray-200'}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>{icon}</div>
        </div>
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default DashboardPage;


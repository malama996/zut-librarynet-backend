import React, { useState, useEffect } from 'react';
import { MdCheckCircle, MdWarning } from 'react-icons/md';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';
import { getMemberLoans, getMemberFines } from '../api/api';

function StatisticsPage() {
  const memberId = localStorage.getItem('userId');
  const [stats, setStats] = useState({
    totalBorrowed: 0,
    totalReturned: 0,
    activeLoan: 0,
    overdueLoans: 0,
    totalFines: 0,
    memberSince: new Date().toLocaleDateString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (memberId) loadStatistics();
  }, [memberId]);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      const [loansRes, finesRes] = await Promise.all([
        getMemberLoans(memberId),
        getMemberFines(memberId),
      ]);

      const loans = loansRes.data?.activeLoans || [];
      const now = new Date();

      const overdue = loans.filter(l => new Date(l.dueDate) < now).length;

      setStats({
        totalBorrowed: loansRes.data?.totalBorrowed || loans.length,
        totalReturned: loansRes.data?.totalReturned || 0,
        activeLoan: loans.length,
        overdueLoans: overdue,
        totalFines: finesRes.data?.totalUnpaidFines || 0,
        memberSince: loansRes.data?.memberSince || new Date().toLocaleDateString(),
      });

      setRecentActivity(loans.slice(0, 5));
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statistics = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Statistics</h1>
        <p className="text-gray-600">Overview of your library activity and borrowing patterns</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatisticCard
          icon={<BarChart3 className="text-blue-600" size={32} />}
          label="Total Borrowed"
          value={statistics.totalBorrowed}
          unit="resources"
        />
        <StatisticCard
          icon={<TrendingUp className="text-green-600" size={32} />}
          label="Total Returned"
          value={statistics.totalReturned}
          unit="resources"
        />
        <StatisticCard
          icon={<Activity className="text-purple-600" size={32} />}
          label="Currently Borrowing"
          value={statistics.activeLoan}
          unit="resources"
        />
        <StatisticCard
          icon={<PieChart className="text-red-600" size={32} />}
          label="Overdue Resources"
          value={statistics.overdueLoans}
          unit="resources"
        />
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-gray-600">Member Since</span>
              <span className="font-semibold text-gray-900">{statistics.memberSince}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-gray-600">Active Loans</span>
              <span className="font-semibold text-gray-900">{statistics.activeLoan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Overdue</span>
              <span className="font-semibold text-red-600">{statistics.overdueLoans}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="pb-4 border-b border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Outstanding Fines</p>
              <p className="text-3xl font-bold text-red-600">ZMW {statistics.totalFines}</p>
            </div>
            <div className="pb-4">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {statistics.totalFines > 0 ? (
                  <>
                    <MdWarning style={{ fontSize: '1.5rem', color: '#dc2626' }} />
                    <p className="text-lg font-semibold text-red-600">Action Required</p>
                  </>
                ) : (
                  <>
                    <MdCheckCircle style={{ fontSize: '1.5rem', color: '#15803d' }} />
                    <p className="text-lg font-semibold text-green-700">Good Standing</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Borrowing Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Borrowing Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => {
                const isOverdue = activity.daysOverdue > 0;
                return (
                  <div key={activity.loanId || activity.id} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{activity.resourceTitle}</p>
                      <p className="text-sm text-gray-500">Due: {new Date(activity.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Borrowed</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isOverdue ? 'Overdue' : 'Active'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">No borrowing activity yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatisticCard({ icon, label, value, unit }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>{icon}</div>
        </div>
        <p className="text-sm text-gray-600 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{unit}</p>
      </CardContent>
    </Card>
  );
}

export default StatisticsPage;

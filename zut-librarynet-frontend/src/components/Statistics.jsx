import React, { useState, useEffect } from 'react';
import { getStatistics, getAvailableResources, getAllMembers } from '../api/api';
import toast from 'react-hot-toast';

const Statistics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [statsRes, availableRes, membersRes] = await Promise.all([
                getStatistics(),
                getAvailableResources(),
                getAllMembers()
            ]);

            setStats({
                ...statsRes.data.statistics,
                availableCount: availableRes.data.count,
                membersCount: membersRes.data.count
            });
        } catch (error) {
            toast.error('Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div>
            <h2>📊 Library Statistics</h2>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{stats?.membersCount || 0}</div>
                    <div className="stat-label">Total Members</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-value">{stats?.totalResources || 0}</div>
                    <div className="stat-label">Total Resources</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-value">{stats?.availableCount || 0}</div>
                    <div className="stat-label">Available Resources</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📖</div>
                    <div className="stat-value">{stats?.activeLoans || 0}</div>
                    <div className="stat-label">Active Loans</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-value">{stats?.pendingReservations || 0}</div>
                    <div className="stat-label">Pending Reservations</div>
                </div>
            </div>
        </div>
    );
};

export default Statistics;

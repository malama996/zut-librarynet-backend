import React, { useState, useEffect } from 'react';
import { getOverdueReport } from '../api/api';
import toast from 'react-hot-toast';

const OverdueReport = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReport();
    }, []);

    const loadReport = async () => {
        try {
            const response = await getOverdueReport();
            setReport(response.data);
        } catch (error) {
            toast.error('Failed to load overdue report');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="card">
            <h2>📋 Overdue Report (Cherry Challenge 2)</h2>
            <p className="description">
                Using Java Streams: .filter(), .sorted(), .groupingBy()
            </p>

            {report?.totalOverdueLoans === 0 ? (
                <p className="success">No overdue loans. All items are returned on time!</p>
            ) : (
                <>
                    <div className="info-box">
                        <p><strong>Total Overdue Loans:</strong> {report.totalOverdueLoans}</p>
                        <p><strong>Report Generated:</strong> {new Date(report.reportDate).toLocaleString()}</p>
                    </div>

                    {Object.entries(report.overdueByMemberType || {}).map(([type, loans]) => (
                        <div key={type} className="overdue-group">
                            <h3>{type}s ({loans.length} overdue)</h3>
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th>Resource</th>
                                    <th>Borrower</th>
                                    <th>Due Date</th>
                                    <th>Days Overdue</th>
                                    <th>Fine (ZMW)</th>
                                </tr>
                                </thead>
                                <tbody>
                                {loans.map(loan => (
                                    <tr key={loan.loanId}>
                                        <td>{loan.resourceTitle}</td>
                                        <td>{loan.memberName || 'Unknown'}</td>
                                        <td>{loan.dueDate}</td>
                                        <td className="overdue-text">{loan.daysOverdue}</td>
                                        <td>{loan.fineAmount}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

export default OverdueReport;

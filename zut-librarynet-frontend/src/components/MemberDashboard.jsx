import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getMember, getMemberLoans, getMemberFines, payFine } from '../api/api';
import toast from 'react-hot-toast';

const MemberDashboard = () => {
    const { memberId } = useParams();
    const [member, setMember] = useState(null);
    const [loans, setLoans] = useState(null);
    const [fines, setFines] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMemberData();
    }, [memberId]);

    const loadMemberData = async () => {
        try {
            const [memberRes, loansRes, finesRes] = await Promise.all([
                getMember(memberId),
                getMemberLoans(memberId),
                getMemberFines(memberId)
            ]);
            setMember(memberRes.data);
            setLoans(loansRes.data);
            setFines(finesRes.data);
        } catch (error) {
            toast.error('Failed to load member data');
        } finally {
            setLoading(false);
        }
    };

    const handlePayFine = async (fineId) => {
        try {
            await payFine(memberId, fineId);
            toast.success('Fine paid successfully');
            loadMemberData(); // Refresh
        } catch (error) {
            toast.error('Failed to pay fine');
        }
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (!member) return <div className="error">Member not found</div>;

    return (
        <div>
            <div className="card">
                <h2>{member.name}</h2>
                <p><strong>Type:</strong> {member.memberType}</p>
                <p><strong>Email:</strong> {member.email}</p>
                <p><strong>Phone:</strong> {member.phone}</p>
                <p><strong>Status:</strong> {member.active ? 'Active' : 'Inactive'}</p>

                {member.memberType === 'STUDENT' && (
                    <>
                        <p><strong>Student ID:</strong> {member.studentId}</p>
                        <p><strong>Programme:</strong> {member.programme}</p>
                        <p><strong>Year:</strong> {member.yearOfStudy}</p>
                    </>
                )}

                {member.memberType === 'LECTURER' && (
                    <>
                        <p><strong>Employee ID:</strong> {member.employeeId}</p>
                        <p><strong>Department:</strong> {member.department}</p>
                        <p><strong>Years of Service:</strong> {member.yearsOfService}</p>
                    </>
                )}

                {member.memberType === 'RESEARCHER' && (
                    <>
                        <p><strong>Researcher ID:</strong> {member.researcherId}</p>
                        <p><strong>Institution:</strong> {member.institution}</p>
                        <p><strong>Research Area:</strong> {member.researchArea}</p>
                    </>
                )}

                <div className="info-box">
                    <p><strong>Active Loans:</strong> {member.activeLoans}</p>
                    <p><strong>Max Borrow Limit:</strong> {member.maxBorrowLimit}</p>
                    <p><strong>Loan Period:</strong> {member.loanPeriodDays} days</p>
                    <p><strong>Total Fines:</strong> ZMW {member.totalFines}</p>
                    <p><strong>Can Borrow:</strong> {member.canBorrow ? '✅ Yes' : '❌ No'}</p>
                </div>
            </div>

            <div className="card">
                <h3>📖 Active Loans</h3>
                {loans?.activeLoans?.length === 0 ? (
                    <p>No active loans</p>
                ) : (
                    <table className="data-table">
                        <thead>
                        <tr><th>Resource</th><th>Type</th><th>Borrow Date</th><th>Due Date</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                        {loans?.activeLoans?.map(loan => (
                            <tr key={loan.loanId}>
                                <td>{loan.resourceTitle}</td>
                                <td>{loan.resourceType}</td>
                                <td>{loan.borrowDate}</td>
                                <td>{loan.dueDate}</td>
                                <td>
                                    {loan.daysOverdue ?
                                        <span className="overdue">Overdue ({loan.daysOverdue} days)</span> :
                                        <span className="active">Active</span>}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="card">
                <h3>💰 Fines</h3>
                {fines?.fines?.length === 0 ? (
                    <p>No unpaid fines</p>
                ) : (
                    <table className="data-table">
                        <thead>
                        <tr><th>Description</th><th>Amount</th><th>Issued Date</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                        {fines?.fines?.filter(f => !f.paid).map(fine => (
                            <tr key={fine.fineId}>
                                <td>{fine.description}</td>
                                <td>ZMW {fine.amount}</td>
                                <td>{fine.issuedDate}</td>
                                <td>
                                    <button onClick={() => handlePayFine(fine.fineId)} className="small-btn">
                                        Pay
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default MemberDashboard;

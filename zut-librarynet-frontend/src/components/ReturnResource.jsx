import React, { useState } from 'react';
import { getMemberLoans, returnResource, syncReturn, getNextWaitingMember } from '../api/api';
import { sendReservationEmail } from '../services/emailService';
import toast from 'react-hot-toast';

const ReturnResource = () => {
    const [memberId, setMemberId] = useState('');
    const [memberLoans, setMemberLoans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loansLoaded, setLoansLoaded] = useState(false);

    const handleLoadLoans = async (e) => {
        e.preventDefault();
        if (!memberId.trim()) {
            toast.error('Please enter a member ID');
            return;
        }

        setLoading(true);
        try {
            const response = await getMemberLoans(memberId);
            const activeLoans = response.data.activeLoans || [];
            setMemberLoans(activeLoans);
            setLoansLoaded(true);
            if (activeLoans.length === 0) {
                toast.info('No active loans found for this member');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load loans');
            setMemberLoans([]);
            setLoansLoaded(false);
        } finally {
            setLoading(false);
        }
    };

    const handleReturnLoan = async (loanId, resourceId) => {
        try {
            setLoading(true);
            const response = await returnResource(loanId);
            toast.success(response.data.message);

            // Sync loan returned + resource availability restored in Firestore (real-time)
            await syncReturn(loanId, resourceId, response.data);

            // Notify waiting member via EmailJS if someone is waiting for this resource
            try {
                const waitingRes = await getNextWaitingMember(resourceId);
                if (waitingRes.data?.hasWaitingMember) {
                    const { memberName, memberEmail } = waitingRes.data;
                    await sendReservationEmail(
                        { name: memberName, email: memberEmail },
                        { title: response.data.resourceTitle }
                    );
                    toast.success(`Notification sent to waiting member: ${memberName}`);
                }
            } catch (emailErr) {
                console.log('No waiting member to notify or email failed:', emailErr.message);
            }

            // Reload loans
            if (memberId.trim()) {
                const response = await getMemberLoans(memberId);
                setMemberLoans(response.data.activeLoans || []);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to return resource');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>Return Resource</h2>

            <form onSubmit={handleLoadLoans} className="search-form">
                <div className="form-group">
                    <label>Member ID *</label>
                    <input
                        type="text"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        placeholder="Enter member ID"
                        required
                    />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? 'Loading...' : 'Load Loans'}
                </button>
            </form>

            {loansLoaded && (
                <div className="loans-list">
                    <h3>Active Loans ({memberLoans.length})</h3>
                    {memberLoans.length === 0 ? (
                        <p>No active loans to return</p>
                    ) : (
                        <div className="resources-grid">
                            {memberLoans.map((loan) => (
                                <div key={loan.loanId} className="resource-card">
                                    <h4>{loan.resourceTitle}</h4>
                                    <p><strong>Type:</strong> {loan.resourceType}</p>
                                    <p><strong>Borrowed:</strong> {loan.borrowDate}</p>
                                    <p><strong>Due Date:</strong> {loan.dueDate}</p>
                                    <p>
                                        <strong>Status:</strong>{' '}
                                        <span className={loan.daysOverdue ? 'overdue' : 'active'}>
                                            {loan.daysOverdue ? `OVERDUE (${loan.daysOverdue} days)` : 'ACTIVE'}
                                        </span>
                                    </p>
                                    {loan.daysOverdue && (
                                        <p className="fine-warning">
                                            Fine due: ZMW {loan.fineAmount?.toFixed(2) || '0.00'}
                                        </p>
                                    )}
                                    <button
                                        onClick={() => handleReturnLoan(loan.loanId, loan.resourceId)}
                                        disabled={loading}
                                        className="btn btn-success"
                                    >
                                        Return
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReturnResource;

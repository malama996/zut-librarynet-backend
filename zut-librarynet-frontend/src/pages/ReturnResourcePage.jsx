import React, { useState, useEffect } from 'react';
import { MdWarning, MdCheckCircle } from 'react-icons/md';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { toastSuccess, toastError } from '../lib/toast';
import { returnResource, extendLoan, getMemberLoans } from '../api/api';
import { updateResourceAvailability, updateLoanStatus, subscribeToCollection, COLLECTIONS } from '../firebase/firestoreService';
import { useAuth } from '../hooks/useAuth';

function ReturnResourcePage() {
  const { uid } = useAuth();
  const [activeLoans, setActiveLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [returnResult, setReturnResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch active loans from backend API + Firestore real-time sync
  useEffect(() => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Primary: Fetch from backend API
    const fetchFromBackend = async () => {
      try {
        const response = await getMemberLoans(uid);
        if (response.data?.activeLoans) {
          const backendLoans = response.data.activeLoans.map(loan => ({
            id: loan.loanId || loan.id,
            loanId: loan.loanId || loan.id,
            resourceId: loan.resourceId,
            resourceTitle: loan.resourceTitle || 'Unknown Resource',
            borrowDate: loan.borrowDate,
            dueDate: loan.dueDate,
            status: loan.status,
            fineAmount: loan.fineAmount || 0,
          }));
          setActiveLoans(backendLoans);
        }
      } catch (err) {
        console.warn('[ReturnPage] Backend fetch failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFromBackend();

    // Secondary: Firestore real-time updates
    const unsub = subscribeToCollection(
      COLLECTIONS.LOANS,
      (data) => {
        const firestoreLoans = data
          .filter(l => (l.status === 'ACTIVE' || l.status === 'OVERDUE') && l.userId === uid)
          .map(l => ({
            id: l.id || l.loanId,
            loanId: l.loanId || l.id,
            resourceId: l.resourceId,
            resourceTitle: l.resourceTitle || 'Unknown Resource',
            borrowDate: l.borrowDate,
            dueDate: l.dueDate,
            status: l.status,
            fineAmount: l.fineAmount || 0,
          }));
        // Merge Firestore data with backend data (prefer backend for completeness)
        setActiveLoans(prev => {
          const backendIds = new Set(prev.map(p => p.loanId));
          const newLoans = firestoreLoans.filter(fl => !backendIds.has(fl.loanId));
          return [...prev, ...newLoans];
        });
      }
    );

    return () => unsub();
  }, [uid]);

  const handleReturn = async () => {
    if (!selectedLoan) {
      toastError('Please select a resource');
      return;
    }

    setActionLoading(true);

    try {
      const response = await returnResource(selectedLoan.loanId);
      const data = response.data;

      setReturnResult({
        success: true,
        loan: selectedLoan,
        fine: data.fineAmount || 0,
        message: data.message,
        nextReservedUser: data.nextReservedUser,
      });

      toastSuccess('Resource returned!');

      // Sync to Firestore
      try {
        await updateLoanStatus(selectedLoan.loanId, 'RETURNED', data.fineAmount || 0);
        await updateResourceAvailability(selectedLoan.resourceId, true);
      } catch (syncErr) {
        console.warn('[ReturnPage] Firestore sync failed:', syncErr);
      }

      // Note: Backend sends email notification to next reserved user automatically

      // Remove the returned loan from the list
      setActiveLoans(prev => prev.filter(l => l.loanId !== selectedLoan.loanId));
      setSelectedLoan(null);

      setTimeout(() => setReturnResult(null), 5000);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to return');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async (days = 14) => {
    if (!selectedLoan) {
      toastError('Please select a resource');
      return;
    }
    setActionLoading(true);
    try {
      await extendLoan(selectedLoan.loanId, days);
      toastSuccess(`Extended ${days} days!`);
      setSelectedLoan(null);
      // Refresh loans
      const response = await getMemberLoans(uid);
      if (response.data?.activeLoans) {
        setActiveLoans(response.data.activeLoans.map(loan => ({
          id: loan.loanId || loan.id,
          loanId: loan.loanId || loan.id,
          resourceId: loan.resourceId,
          resourceTitle: loan.resourceTitle || 'Unknown Resource',
          borrowDate: loan.borrowDate,
          dueDate: loan.dueDate,
          status: loan.status,
        })));
      }
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to extend');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Return Resource</h1>
        <p className="text-gray-600">Return or extend a borrowed resource</p>
      </div>

      {/* Success / Result Message */}
      {returnResult && (
        <Card className={`border-2 ${returnResult.fine > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {returnResult.fine > 0 ? (
                <MdWarning style={{ fontSize: '2rem', color: '#b45309' }} />
              ) : (
                <MdCheckCircle style={{ fontSize: '2rem', color: '#15803d' }} />
              )}
              <div>
                <h3 className="font-bold">{returnResult.fine > 0 ? 'Returned with Fine' : 'Returned!'}</h3>
                <p>{returnResult.message}</p>
                {returnResult.fine > 0 && <p className="font-semibold">Fine: ZMW {returnResult.fine}</p>}
                {returnResult.nextReservedUser && (
                  <Badge variant="success" className="mt-2">
                    Next: {returnResult.nextReservedUser.name}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Loan Return/Extend Panel */}
      {selectedLoan && (
        <Card className="bg-blue-50 border-blue-300">
          <CardHeader><CardTitle>Return Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="font-semibold">{selectedLoan.resourceTitle}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-600">Borrowed</p><p>{formatDate(selectedLoan.borrowDate)}</p></div>
              <div>
                <p className="text-sm text-gray-600">Due</p>
                <p className={isOverdue(selectedLoan.dueDate) ? 'text-red-600 font-bold' : ''}>
                  {formatDate(selectedLoan.dueDate)}
                  {isOverdue(selectedLoan.dueDate) && ' (OVERDUE)'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleReturn} disabled={actionLoading}>
                {actionLoading ? 'Processing...' : 'Return Resource'}
              </Button>
              <Button variant="outline" onClick={() => handleExtend(14)} disabled={actionLoading}>
                Extend 14 Days
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setSelectedLoan(null)}>Cancel</Button>
          </CardContent>
        </Card>
      )}

      {/* Active Loans List */}
      <div>
        <h2 className="text-xl font-bold mb-4">Your Active Loans ({activeLoans.length})</h2>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded"></div>)}
          </div>
        ) : activeLoans.length > 0 ? (
          <div className="grid gap-4">
            {activeLoans.map(loan => (
              <Card
                key={loan.loanId}
                className={`${selectedLoan?.loanId === loan.loanId ? 'ring-2 ring-blue-500' : ''} ${isOverdue(loan.dueDate) ? 'border-red-300' : ''}`}
                onClick={() => setSelectedLoan(loan)}
              >
                <CardContent className="p-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{loan.resourceTitle}</h3>
                    <p className={`text-sm ${isOverdue(loan.dueDate) ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                      Due: {formatDate(loan.dueDate)}
                      {isOverdue(loan.dueDate) && ' (OVERDUE)'}
                    </p>
                  </div>
                  <Button variant={selectedLoan?.loanId === loan.loanId ? 'default' : 'outline'}>
                    {selectedLoan?.loanId === loan.loanId ? 'Selected' : 'Select to Return'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <p>No active loans found.</p>
              <p className="text-sm mt-2">Resources you borrow will appear here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ReturnResourcePage;


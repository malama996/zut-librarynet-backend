import React, { useState, useEffect } from 'react';
import { MdWarning, MdCheckCircle } from 'react-icons/md';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { toastSuccess, toastError } from '../lib/toast';
import { getMemberLoans, returnResource, extendLoan } from '../api/api';
import { updateResourceAvailability, updateLoanStatus } from '../firebase';
import { sendReservationEmail } from '../services/emailService';
import { useAuth } from '../hooks/useAuth';

function ReturnResourcePage() {
  const { uid } = useAuth();
  const [activeLoans, setActiveLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [returnResult, setReturnResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (uid) fetchLoans();
  }, [uid]);

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const response = await getMemberLoans(uid);
      if (response.data?.activeLoans) setActiveLoans(response.data.activeLoans);
      else if (Array.isArray(response.data)) setActiveLoans(response.data);
    } catch {
      toastError('Failed to load loans');
    } finally {
      setIsLoading(false);
    }
  };

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
      await updateLoanStatus(selectedLoan.loanId, 'RETURNED', data.fineAmount || 0);
      await updateResourceAvailability(selectedLoan.resourceId, true);

      // Send email notification to next reserved user
      if (data.nextReservedUser) {
        await sendReservationEmail(
          { name: data.nextReservedUser.name, email: data.nextReservedUser.email },
          { title: selectedLoan.resourceTitle }
        );
      }

      setSelectedLoan(null);
      fetchLoans();

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
      fetchLoans();
      setSelectedLoan(null);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to extend');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Return Resource</h1>
        <p className="text-gray-600">Return a borrowed resource</p>
      </div>

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

      {selectedLoan && (
        <Card className="bg-blue-50 border-blue-300">
          <CardHeader><CardTitle>Return Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="font-semibold">{selectedLoan.resourceTitle}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-600">Borrowed</p><p>{formatDate(selectedLoan.borrowDate)}</p></div>
              <div><p className="text-sm text-gray-600">Due</p><p>{formatDate(selectedLoan.dueDate)}</p></div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleReturn} disabled={actionLoading}>
                {actionLoading ? 'Processing...' : 'Return'}
              </Button>
              <Button variant="outline" onClick={() => handleExtend(14)} disabled={actionLoading}>
                Extend 14 Days
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setSelectedLoan(null)}>Cancel</Button>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Your Active Loans</h2>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded"></div>)}
          </div>
        ) : activeLoans.length > 0 ? (
          <div className="grid gap-4">
            {activeLoans.map(loan => (
              <Card
                key={loan.loanId}
                className={`${selectedLoan?.loanId === loan.loanId ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setSelectedLoan(loan)}
              >
                <CardContent className="p-6 flex justify-between">
                  <div>
                    <h3 className="font-semibold">{loan.resourceTitle}</h3>
                    <p className="text-sm text-gray-600">Due: {formatDate(loan.dueDate)}</p>
                  </div>
                  <Button variant={selectedLoan?.loanId === loan.loanId ? 'default' : 'outline'}>
                    {selectedLoan?.loanId === loan.loanId ? 'Selected' : 'Select'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-12 text-center text-gray-500">No active loans</CardContent></Card>
        )}
      </div>
    </div>
  );
}

export default ReturnResourcePage;


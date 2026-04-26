import React, { useState, useEffect } from 'react';
import { MdCheckCircle } from 'react-icons/md';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { toastSuccess, toastError } from '../lib/toast';
import { borrowResource, createReservation, syncBorrow } from '../api/api';
import { subscribeToCollection, COLLECTIONS } from '../firebase/firestoreService';
import { useAuth } from '../hooks/useAuth';

function BorrowResourcePage() {
  const { uid } = useAuth();
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);
  const [borrowedResource, setBorrowedResource] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToCollection(
      COLLECTIONS.RESOURCES,
      (data) => {
        const borrowable = data.filter(r => (r.type || r.resourceType) !== 'Digital');
        setResources(borrowable);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleBorrow = async (resource) => {
    if (!uid) {
      toastError('Please log in to borrow');
      return;
    }
    setSelectedResource(resource);
    setActionLoading(resource.id);
    try {
      const response = await borrowResource(uid, resource.id);
      const loanData = response.data;
      setBorrowedResource({ ...resource, dueDate: loanData?.dueDate });
      toastSuccess(`Successfully borrowed "${resource.title}"!`);
      try {
        await syncBorrow(loanData, { id: resource.id });
      } catch (syncErr) {
        console.warn('[BorrowPage] Firestore sync failed:', syncErr);
      }
      setTimeout(() => setBorrowedResource(null), 5000);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to borrow';
      if (message.includes('on loan') || message.includes('not available')) {
        toastError(message);
        handleReserve(resource);
      } else {
        toastError(message);
      }
      setSelectedResource(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReserve = async (resource) => {
    if (!uid) { toastError('Please log in to reserve'); return; }
    setActionLoading(resource.id);
    try {
      await createReservation(uid, resource.id);
      toastSuccess(`Reserved "${resource.title}". You'll be notified when available.`);
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to reserve');
    } finally {
      setActionLoading(null);
      setSelectedResource(null);
    }
  };

  const formatDueDate = (dueDateStr) => {
    if (!dueDateStr) return '14 days from now';
    try {
      return new Date(dueDateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return '14 days from now'; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Borrow Resource</h1>
        <p className="text-gray-600">Select a resource to borrow from the library</p>
      </div>
      {borrowedResource && (
        <Card className="bg-green-50 border-2 border-green-300">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <MdCheckCircle style={{ fontSize: '2rem', color: '#15803d', flexShrink: 0 }} />
              <div>
                <h3 className="font-bold text-green-900 mb-2">Borrow Successful!</h3>
                <p className="text-green-700">You have successfully borrowed:</p>
                <p className="font-semibold text-green-900 mt-2">{borrowedResource.title}</p>
                <p className="text-sm text-green-700 mt-1">Due back by: {formatDueDate(borrowedResource.dueDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))
        ) : resources.length > 0 ? (
          resources.map((resource) => (
            <Card key={resource.id} className={selectedResource?.id === resource.id ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader><CardTitle className="text-lg">{resource.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><p className="text-sm text-gray-500">Type</p><Badge>{resource.type || resource.resourceType}</Badge></div>
                {resource.isbn && <div><p className="text-sm text-gray-500">ISBN</p><p className="font-mono text-sm">{resource.isbn}</p></div>}
                {resource.author && <div><p className="text-sm text-gray-500">Author</p><p className="text-sm">{resource.author}</p></div>}
                <div><p className="text-sm text-gray-500">Status</p><Badge variant={resource.available ? 'success' : 'destructive'}>{resource.available ? 'Available' : 'Unavailable'}</Badge></div>
                <Button className="w-full" onClick={() => handleBorrow(resource)} disabled={actionLoading === resource.id || !resource.available}>
                  {actionLoading === resource.id ? 'Processing...' : resource.available ? 'Borrow This Resource' : 'Reserve'}
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">No resources available. Check back later.</p>
              <Button className="mt-4" onClick={() => window.location.reload()}>Refresh</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default BorrowResourcePage;

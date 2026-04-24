import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Form';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { SkeletonTableRow } from '../components/ui/Skeleton';
import { toastSuccess, toastError } from '../lib/toast';
import {
  getAllResources, searchResources, borrowResource, createReservation
} from '../api/api';
import { updateResourceAvailability, addLoanToFirestore, addReservationToFirestore } from '../firebase';
import { useAuth } from '../hooks/useAuth';

function AvailableResourcesPage() {
  const { uid } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch resources from API
  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const response = await getAllResources();
      if (response.data?.resources) {
        setResources(response.data.resources);
      } else if (Array.isArray(response.data)) {
        setResources(response.data);
      }
    } catch (error) {
      toastError('Failed to load resources');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search resources
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchResources();
      return;
    }
    setIsLoading(true);
    try {
      const response = await searchResources(searchQuery);
      if (response.data?.results) {
        setResources(response.data.results);
      } else if (Array.isArray(response.data)) {
        setResources(response.data);
      }
    } catch {
      toastError('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle borrow with Firestore sync
  const handleBorrow = async (resource) => {
    if (!uid) {
      toastError('Please log in to borrow');
      return;
    }
    setActionLoading(resource.id);
    try {
      const response = await borrowResource(uid, resource.id);
      const loanData = response.data;

      toastSuccess(`Successfully borrowed "${resource.title}"!`);

      // Sync to Firestore for real-time updates
      await addLoanToFirestore({
        loanId: loanData.loanId,
        userId: uid,
        resourceId: resource.id,
        resourceTitle: resource.title,
        borrowDate: new Date().toISOString(),
        dueDate: loanData.dueDate,
        status: 'ACTIVE'
      });
      await updateResourceAvailability(resource.id, false);

      fetchResources();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to borrow';
      toastError(message);

      if (message.includes('on loan') || message.includes('not available')) {
        handleReserve(resource);
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reserve with Firestore sync
  const handleReserve = async (resource) => {
    if (!uid) {
      toastError('Please log in to reserve');
      return;
    }
    setActionLoading(resource.id);
    try {
      const response = await createReservation(uid, resource.id);
      const reservationData = response.data;

      toastSuccess(`Reserved "${resource.title}". You'll be notified when available.`);

      // Sync to Firestore
      await addReservationToFirestore({
        reservationId: reservationData.reservationId,
        userId: uid,
        resourceId: resource.id,
        resourceTitle: resource.title,
        status: 'PENDING'
      });

      fetchResources();
    } catch (error) {
      toastError(error.response?.data?.message || 'Failed to reserve');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter resources
  const filteredResources = resources.filter(r =>
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.publisher?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Resources</h1>
        <p className="text-gray-600">Browse and borrow from our collection</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search by title, author, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Publisher</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => <SkeletonTableRow key={i} />)
            ) : filteredResources?.length > 0 ? (
              filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">{resource.title}</TableCell>
                  <TableCell><Badge>{resource.type}</Badge></TableCell>
                  <TableCell>{resource.publisher}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={resource.available ? 'success' : 'destructive'}>
                      {resource.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {resource.available ? (
                        <Button
                          size="sm"
                          disabled={actionLoading === resource.id}
                          onClick={() => handleBorrow(resource)}
                        >
                          {actionLoading === resource.id ? 'Borrowing...' : 'Borrow'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === resource.id}
                          onClick={() => handleReserve(resource)}
                        >
                          {actionLoading === resource.id ? 'Reserving...' : 'Reserve'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan="5" className="text-center py-8 text-gray-500">
                  {isLoading ? 'Loading...' : 'No resources found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default AvailableResourcesPage;


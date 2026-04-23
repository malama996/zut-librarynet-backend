import React, { useState, useEffect } from 'react';
import { MdCheckCircle } from 'react-icons/md';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { toastSuccess, toastError } from '../lib/toast';
import { getAllResources, borrowResource, createReservation } from '../api/api';

function BorrowResourcePage() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);
  const [borrowedResource, setBorrowedResource] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const memberId = localStorage.getItem('memberId');

  // Fetch resources on mount
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

  const handleBorrow = async (resource) => {
    if (!memberId) {
      toastError('Please log in to borrow');
      return;
    }

    setSelectedResource(resource);
    setActionLoading(resource.id);

    try {
      const response = await borrowResource(memberId, resource.id);
      setBorrowedResource({
        ...resource,
        dueDate: response.data?.dueDate,
      });
      toastSuccess(`Successfully borrowed "${resource.title}"!`);

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setBorrowedResource(null);
      }, 5000);

      // Refresh resources
      fetchResources();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to borrow';

      // If not available, offer to reserve
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
    if (!memberId) {
      toastError('Please log in to reserve');
      return;
    }

    setActionLoading(resource.id);

    try {
      await createReservation(memberId, resource.id);
      toastSuccess(`Reserved "${resource.title}". You'll be notified when available.`);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reserve';
      toastError(message);
    } finally {
      setActionLoading(null);
      setSelectedResource(null);
    }
  };

  // Format due date
  const formatDueDate = (dueDateStr) => {
    if (!dueDateStr) return '14 days from now';
    try {
      return new Date(dueDateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '14 days from now';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Borrow Resource</h1>
        <p className="text-gray-600">Select a resource to borrow from the library</p>
      </div>

      {/* Success Message */}
      {borrowedResource && (
        <Card className="bg-green-50 border-2 border-green-300">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <MdCheckCircle style={{ fontSize: '2rem', color: '#15803d', flexShrink: 0 }} />
              <div>
                <h3 className="font-bold text-green-900 mb-2">Borrow Successful!</h3>
                <p className="text-green-700">You have successfully borrowed:</p>
                <p className="font-semibold text-green-900 mt-2">{borrowedResource.title}</p>
                <p className="text-sm text-green-700 mt-1">
                  Due back by: {formatDueDate(borrowedResource.dueDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeleton
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
            <Card
              key={resource.id}
              className={selectedResource?.id === resource.id ? 'ring-2 ring-blue-500' : ''}
            >
              <CardHeader>
                <CardTitle className="text-lg">{resource.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <Badge>{resource.type || resource.resourceType}</Badge>
                </div>
                {resource.isbn && (
                  <div>
                    <p className="text-sm text-gray-500">ISBN</p>
                    <p className="font-mono text-sm">{resource.isbn}</p>
                  </div>
                )}
                {resource.author && (
                  <div>
                    <p className="text-sm text-gray-500">Author</p>
                    <p className="text-sm">{resource.author}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={resource.available ? 'success' : 'destructive'}>
                    {resource.available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleBorrow(resource)}
                  disabled={actionLoading === resource.id || !resource.available}
                >
                  {actionLoading === resource.id ? 'Processing...' :
                    resource.available ? 'Borrow This Resource' : 'Reserve'}
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">No resources available. Check back later.</p>
              <Button className="mt-4" onClick={fetchResources}>
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default BorrowResourcePage;
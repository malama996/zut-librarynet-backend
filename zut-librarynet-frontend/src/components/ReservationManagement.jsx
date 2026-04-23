import React, { useState, useEffect } from 'react';
import { getAllResources, getMemberReservations, createReservation, cancelReservation, syncReservation } from '../api/api';
import { sendReservationEmail } from '../firebase/index';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MdEvent, MdRefresh, MdAdd, MdClose, MdCheckCircle } from 'react-icons/md';
import toast from 'react-hot-toast';

const ReservationManagement = () => {
    const [memberId, setMemberId] = useState('');
    const [resources, setResources] = useState([]);
    const [selectedResource, setSelectedResource] = useState(null);
    const [memberReservations, setMemberReservations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const storedId = localStorage.getItem('userId');
        if (storedId) setMemberId(storedId);
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [resRes, revRes] = await Promise.all([
                getAllResources(),
                getMemberReservations(localStorage.getItem('userId') || memberId),
            ]);
            setResources(resRes.data?.resources || []);
            if (memberId) {
                setMemberReservations(revRes.data?.reservations || []);
            }
        } catch (error) {
            console.error('[Reservations] Load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateReservation = async () => {
        if (!memberId.trim()) {
            toast.error('Member ID required');
            return;
        }
        if (!selectedResource) {
            toast.error('Select a resource to reserve');
            return;
        }

        try {
            setLoading(true);
            const response = await createReservation(memberId, selectedResource.id);
            const reservationData = response.data.reservation || response.data;

            // Firestore sync
            try {
                await syncReservation({
                    id: reservationData.reservationId || reservationData.id,
                    memberId,
                    resourceId: selectedResource.id,
                    resourceTitle: reservationData.resourceTitle || selectedResource.title,
                    status: 'PENDING',
                });
            } catch (_) {}

            // EmailJS notification
            try {
                await sendReservationEmail(
                    { name: localStorage.getItem('userName'), email: localStorage.getItem('userEmail') },
                    { title: selectedResource.title }
                );
            } catch (_) {}

            toast.success(`Reserved "${selectedResource.title}" successfully!`);
            setShowForm(false);
            setSelectedResource(null);
            const revRes = await getMemberReservations(memberId);
            setMemberReservations(revRes.data?.reservations || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create reservation');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (reservationId, title) => {
        if (!confirm(`Cancel reservation for "${title}"?`)) return;
        try {
            setLoading(true);
            await cancelReservation(reservationId);
            try {
                const fs = await import('../firebase/firestoreService');
                await (fs.updateReservationStatus || fs.updateDocument)('reservations', reservationId, { status: 'CANCELLED' });
            } catch (_) {}
            toast.success('Reservation cancelled');
            const revRes = await getMemberReservations(memberId);
            setMemberReservations(revRes.data?.reservations || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to cancel');
        } finally {
            setLoading(false);
        }
    };

    const statusConfig = {
        PENDING:   { color: 'bg-amber-100 text-amber-800', label: 'Pending' },
        READY:     { color: 'bg-blue-100 text-blue-800',   label: 'Ready' },
        FULFILLED: { color: 'bg-green-100 text-green-800', label: 'Fulfilled' },
        CANCELLED: { color: 'bg-gray-100 text-gray-600',  label: 'Cancelled' },
        EXPIRED:   { color: 'bg-red-100 text-red-800',      label: 'Expired' },
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>
                    <p className="text-sm text-gray-500">Reserve resources that are currently on loan</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadAll} className="flex items-center gap-2">
                        <MdRefresh size={16} /> Refresh
                    </Button>
                    <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
                        <MdAdd size={16} /> New Reservation
                    </Button>
                </div>
            </div>

            {/* Reservation Form */}
            {showForm && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <MdEvent className="text-cyan-600" size={20} />
                                Reserve a Resource
                            </CardTitle>
                            <button onClick={() => { setShowForm(false); setSelectedResource(null); }}
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Member ID
                            </label>
                            <input
                                type="text"
                                value={memberId}
                                onChange={e => setMemberId(e.target.value)}
                                placeholder="e.g. STU1234"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select a Resource
                            </label>
                            {loading && resources.length === 0 ? (
                                <p className="text-gray-400 text-sm">Loading resources...</p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {resources.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => setSelectedResource(r)}
                                            className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                                                selectedResource?.id === r.id
                                                    ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500'
                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">{r.title}</p>
                                                    <p className="text-xs text-gray-500">{r.type} · {r.author || r.publisher || 'No author'}</p>
                                                </div>
                                                <Badge variant={r.available ? 'success' : 'secondary'}
                                                    className="text-xs shrink-0">
                                                    {r.available ? 'Available' : 'On Loan'}
                                                </Badge>
                                            </div>
                                        </button>
                                    ))}
                                    {resources.length === 0 && (
                                        <p className="text-gray-400 text-sm text-center py-4">No resources available</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedResource && (
                            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                                <p className="text-sm text-cyan-800">
                                    <strong>Selected:</strong> {selectedResource.title}
                                    <span className="mx-1">·</span>
                                    <span className="text-cyan-600">{selectedResource.type}</span>
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleCreateReservation}
                                disabled={loading || !memberId.trim() || !selectedResource}
                                className="flex items-center gap-2"
                            >
                                <MdCheckCircle size={16} />
                                {loading ? 'Reserving...' : 'Confirm Reservation'}
                            </Button>
                            <Button variant="outline" onClick={() => { setShowForm(false); setSelectedResource(null); }}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Reservations List */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Reservations ({memberReservations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : memberReservations.length === 0 ? (
                        <div className="text-center py-12">
                            <MdEvent className="mx-auto mb-4" size={48} color="#d1d5db" />
                            <p className="text-gray-500 font-medium">No reservations yet</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Reserve a resource that's currently on loan — you'll be notified when it's available.
                            </p>
                            <Button className="mt-4" onClick={() => setShowForm(true)}>
                                Make a Reservation
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {memberReservations.map(res => {
                                const cfg = statusConfig[res.status] || statusConfig.PENDING;
                                return (
                                    <div key={res.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-semibold text-gray-900 text-sm truncate">
                                                    {res.resourceTitle || res.title}
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} shrink-0`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                {res.reservationDate && (
                                                    <span>Reserved: {new Date(res.reservationDate).toLocaleDateString()}</span>
                                                )}
                                                {res.expiryDate && (
                                                    <span>Expires: {new Date(res.expiryDate).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            {res.status === 'PENDING' || res.status === 'READY' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCancel(res.id, res.resourceTitle || res.title)}
                                                    className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                                                >
                                                    <MdClose size={14} /> Cancel
                                                </Button>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">
                                                    {res.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ReservationManagement;
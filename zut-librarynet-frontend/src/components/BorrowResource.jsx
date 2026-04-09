import React, { useState, useEffect } from 'react';
import { getAllMembers, getAllResources, borrowResource, getAvailableResources } from '../api/api';
import toast from 'react-hot-toast';

const BorrowResource = () => {
    const [members, setMembers] = useState([]);
    const [resources, setResources] = useState([]);
    const [selectedMember, setSelectedMember] = useState('');
    const [selectedResource, setSelectedResource] = useState('');
    const [loading, setLoading] = useState(false);
    const [memberDetails, setMemberDetails] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [membersRes, resourcesRes] = await Promise.all([
                getAllMembers(),
                getAvailableResources()
            ]);
            setMembers(membersRes.data.members || []);
            setResources(resourcesRes.data.resources || []);
        } catch (error) {
            toast.error('Failed to load data');
        }
    };

    const handleMemberSelect = async (memberId) => {
        setSelectedMember(memberId);
        try {
            const response = await getAllMembers();
            const member = response.data.members.find(m => m.id === memberId);
            setMemberDetails(member);
        } catch (error) {
            console.error('Failed to load member details');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMember || !selectedResource) {
            toast.error('Please select both member and resource');
            return;
        }

        setLoading(true);
        try {
            const response = await borrowResource(selectedMember, selectedResource);
            toast.success(`Successfully borrowed: ${response.data.resourceTitle}`);
            // Refresh available resources
            const resourcesRes = await getAvailableResources();
            setResources(resourcesRes.data.resources || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Borrow failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>📖 Borrow Resource</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Select Member *</label>
                    <select
                        value={selectedMember}
                        onChange={(e) => handleMemberSelect(e.target.value)}
                        required
                    >
                        <option value="">-- Select Member --</option>
                        {members.map(member => (
                            <option key={member.id} value={member.id}>
                                {member.name} ({member.memberType})
                            </option>
                        ))}
                    </select>
                </div>

                {memberDetails && (
                    <div className="info-box">
                        <h4>Member Details</h4>
                        <p><strong>Type:</strong> {memberDetails.memberType}</p>
                        <p><strong>Active Loans:</strong> {memberDetails.activeLoans}</p>
                        <p><strong>Max Borrow Limit:</strong> {memberDetails.maxBorrowLimit}</p>
                        <p><strong>Total Fines:</strong> ZMW {memberDetails.totalFines}</p>
                        <p><strong>Can Borrow:</strong> {memberDetails.canBorrow ? '✅ Yes' : '❌ No'}</p>
                    </div>
                )}

                <div className="form-group">
                    <label>Select Resource *</label>
                    <select
                        value={selectedResource}
                        onChange={(e) => setSelectedResource(e.target.value)}
                        required
                    >
                        <option value="">-- Select Resource --</option>
                        {resources.map(resource => (
                            <option key={resource.id} value={resource.id}>
                                {resource.title} ({resource.type})
                            </option>
                        ))}
                    </select>
                </div>

                <button type="submit" disabled={loading || !memberDetails?.canBorrow}>
                    {loading ? 'Processing...' : 'Borrow Resource'}
                </button>
            </form>
        </div>
    );
};

export default BorrowResource;
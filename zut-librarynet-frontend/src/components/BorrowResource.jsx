import React, { useState, useEffect } from 'react';
import { MdLibraryBooks } from 'react-icons/md';
import { getAllMembers, getAllResources, borrowResource, getAvailableResources, getMember, syncBorrow } from '../api/api';
import { getErrorInfo, validateMemberStatus, formatMemberDisplay, getMemberRestrictions } from '../utils/errorUtils.js';
import toast from 'react-hot-toast';

const BorrowResource = () => {
    const [members, setMembers] = useState([]);
    const [resources, setResources] = useState([]);
    const [selectedMember, setSelectedMember] = useState('');
    const [selectedResource, setSelectedResource] = useState('');
    const [loading, setLoading] = useState(false);
    const [memberDetails, setMemberDetails] = useState(null);
    const [memberErrors, setMemberErrors] = useState([]);

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
            const errorInfo = getErrorInfo(error);
            toast.error(errorInfo.message);
        }
    };

    const handleMemberSelect = async (memberId) => {
        setSelectedMember(memberId);
        setSelectedResource('');
        setMemberErrors([]);

        try {
            const response = await getMember(memberId);
            const member = response.data;
            setMemberDetails(member);

            // Validate member status
            const { canBorrow, warnings } = validateMemberStatus(member);
            
            if (warnings.length > 0) {
                setMemberErrors(warnings);
                warnings.forEach(w => {
                    const toastType = w.severity === 'danger' ? 'error' : 'warning';
                    toast[toastType](w.message);
                });
            }
        } catch (error) {
            const errorInfo = getErrorInfo(error);
            toast.error(errorInfo.message);
            setMemberDetails(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMember || !selectedResource) {
            toast.error('Please select both member and resource');
            return;
        }

        // Pre-submission validation
        const { canBorrow } = validateMemberStatus(memberDetails);
        if (!canBorrow) {
            toast.error('This member cannot borrow right now. Please resolve issues above.');
            return;
        }

        setLoading(true);
        try {
            const response = await borrowResource(selectedMember, selectedResource);
            toast.success(`Successfully borrowed: ${response.data.resourceTitle}`);

            // Sync loan + update resource availability in Firestore (real-time)
            await syncBorrow(response.data, { id: selectedResource });
            setSelectedMember('');
            setSelectedResource('');
            setMemberDetails(null);
            setMemberErrors([]);
            // Refresh available resources
            const resourcesRes = await getAvailableResources();
            setResources(resourcesRes.data.resources || []);
        } catch (error) {
            const errorInfo = getErrorInfo(error);
            toast.error(errorInfo.message);
        } finally {
            setLoading(false);
        }
    };

    // Polymorphic display without hardcoding
    const formattedMember = memberDetails ? formatMemberDisplay(memberDetails) : null;
    const memberRestrictions = memberDetails ? getMemberRestrictions(memberDetails.memberType) : null;
    const availableForMember = memberDetails 
        ? resources.filter(r => getMemberRestrictions(memberDetails.memberType).borrowTypes.includes(r.type))
        : resources;

    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <MdLibraryBooks style={{ fontSize: '1.75rem', color: '#1e40af' }} />
                <h2 style={{ margin: 0 }}>Borrow Resource</h2>
            </div>

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

                {memberDetails && formattedMember && (
                    <div className="info-box">
                        <h4>{formattedMember.displayName}</h4>
                        
                        {/* Polymorphic display - no hardcoded member type checks */}
                        {formattedMember.typeSpecificInfo && (
                            <>
                                <p><strong>ID:</strong> {formattedMember.typeSpecificInfo.id}</p>
                                <p><strong>Category:</strong> {formattedMember.typeSpecificInfo.category}</p>
                                <p><strong>Details:</strong> {formattedMember.typeSpecificInfo.detail}</p>
                            </>
                        )}

                        {/* Borrowing Rules - Data-driven, not hardcoded */}
                        {memberRestrictions && (
                            <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                                <strong>Borrowing Policy:</strong> {memberRestrictions.description}
                            </div>
                        )}

                        {/* Member Status Grid */}
                        <div className="stats-grid" style={{ marginTop: '1rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="stat-card">
                                <div className="stat-icon">
                                    <MdLibraryBooks style={{ fontSize: '2rem', color: '#1e40af' }} />
                                </div>
                                <div className="stat-value">{memberDetails.activeLoans}</div>
                                <div className="stat-label">Active Loans</div>
                            </div>
                            <div className={`stat-card ${memberDetails.totalFines > 50 ? 'danger' : ''}`}>
                                <div className="stat-icon">💰</div>
                                <div className="stat-value">ZMW {memberDetails.totalFines.toFixed(2)}</div>
                                <div className="stat-label">Fines</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">{memberDetails.canBorrow ? '✅' : '❌'}</div>
                                <div className="stat-value">{memberDetails.canBorrow ? 'Yes' : 'No'}</div>
                                <div className="stat-label">Can Borrow</div>
                            </div>
                        </div>
                        
                        {/* Display member errors/warnings */}
                        {memberErrors.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                {memberErrors.map((error, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`alert alert-${error.severity === 'danger' ? 'danger' : 'warning'}`}
                                    >
                                        ⚠️ {error.message}
                                    </div>
                                ))}
                            </div>
                        )}
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
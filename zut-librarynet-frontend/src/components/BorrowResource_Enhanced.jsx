import React, { useState, useEffect } from 'react';
import { getAllMembers, getAvailableResources, borrowResource, getMember } from '../api/api';
import { getErrorInfo, validateMemberStatus, formatMemberDisplay, getMemberRestrictions } from '../utils/errorUtils.js';
import toast from 'react-hot-toast';

const BorrowResource = () => {
    const [members, setMembers] = useState([]);
    const [resources, setResources] = useState([]);
    const [selectedMember, setSelectedMember] = useState('');
    const [selectedResource, setSelectedResource] = useState('');
    const [loading, setLoading] = useState(false);
    const [memberDetails, setMemberDetails] = useState(null);
    const [resourceDetails, setResourceDetails] = useState(null);
    const [memberErrors, setMemberErrors] = useState([]);
    const [resourceFilter, setResourceFilter] = useState('ALL');

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

            // Validate member status - shows warnings if any
            const { canBorrow, warnings } = validateMemberStatus(member);
            
            if (warnings.length > 0) {
                setMemberErrors(warnings);
                warnings.forEach(w => {
                    const toastType = w.severity === 'danger' ? 'error' : 'warning';
                    toast[toastType](w.message);
                });
            }

            // Filter available resources by member type
            const memberRestrictions = getMemberRestrictions(member.memberType);
            const filteredByType = resources.filter(r => 
                memberRestrictions.borrowTypes.includes(r.type)
            );
            
            // If resources filtered, show info
            if (filteredByType.length < resources.length) {
                toast.success(
                    `Showing ${filteredByType.length} resources available for your member type.`
                );
            }

        } catch (error) {
            const errorInfo = getErrorInfo(error);
            toast.error(errorInfo.message);
            setMemberDetails(null);
        }
    };

    const handleResourceSelect = (resourceId) => {
        setSelectedResource(resourceId);
        const resource = resources.find(r => r.id === resourceId);
        setResourceDetails(resource);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMember || !selectedResource) {
            toast.error('Please select both member and resource');
            return;
        }

        // Pre-submission validation
        const { canBorrow, warnings } = validateMemberStatus(memberDetails);
        if (!canBorrow) {
            toast.error('This member cannot borrow right now. Please resolve the issues above.');
            return;
        }

        setLoading(true);
        try {
            const response = await borrowResource(selectedMember, selectedResource);
            toast.success(`Successfully borrowed: ${response.data.resourceTitle}`);
            
            // Reset form
            setSelectedMember('');
            setSelectedResource('');
            setMemberDetails(null);
            setResourceDetails(null);
            
            // Reload resources
            const resourcesRes = await getAvailableResources();
            setResources(resourcesRes.data.resources || []);
        } catch (error) {
            const errorInfo = getErrorInfo(error);
            toast.error(errorInfo.message);
            if (errorInfo.helpText) {
                toast.loading(errorInfo.helpText);
            }
        } finally {
            setLoading(false);
        }
    };

    // Format member display using utility (no hardcoding)
    const formattedMember = memberDetails ? formatMemberDisplay(memberDetails) : null;
    const memberRestrictions = memberDetails ? getMemberRestrictions(memberDetails.memberType) : null;

    // Filter resources by member type
    const availableForMember = memberDetails 
        ? resources.filter(r => getMemberRestrictions(memberDetails.memberType).borrowTypes.includes(r.type))
        : resources;

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
                        className="form-control"
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
                        
                        {/* Polymorphic display - no if/else checks */}
                        {formattedMember.typeSpecificInfo && (
                            <>
                                <p><strong>ID:</strong> {formattedMember.typeSpecificInfo.id}</p>
                                <p><strong>Category:</strong> {formattedMember.typeSpecificInfo.category}</p>
                                <p><strong>Details:</strong> {formattedMember.typeSpecificInfo.detail}</p>
                            </>
                        )}

                        {/* Borrowing Rules */}
                        {memberRestrictions && (
                            <div className="alert alert-info">
                                <strong>Borrowing Rules:</strong> {memberRestrictions.description}
                            </div>
                        )}

                        {/* Member Status Indicators */}
                        <div className="stats-grid" style={{ marginTop: '1rem' }}>
                            <div className="stat-card">
                                <div className="stat-icon">📚</div>
                                <div className="stat-value">{memberDetails.activeLoans}</div>
                                <div className="stat-label">Active Loans</div>
                            </div>
                            <div className="stat-card warning">
                                <div className="stat-icon">💰</div>
                                <div className="stat-value">ZMW {memberDetails.totalFines.toFixed(2)}</div>
                                <div className="stat-label">Outstanding Fines</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">✅</div>
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
                                        {error.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="form-group">
                    <label>Select Resource *</label>
                    {memberDetails && (
                        <small style={{ color: '#7f8c8d', display: 'block', marginBottom: '0.5rem' }}>
                            Showing {availableForMember.length} resources available for {memberDetails.memberType}
                        </small>
                    )}
                    <select
                        value={selectedResource}
                        onChange={(e) => handleResourceSelect(e.target.value)}
                        required
                        className="form-control"
                        disabled={!selectedMember}
                    >
                        <option value="">-- Select Resource --</option>
                        {availableForMember.map(resource => (
                            <option key={resource.id} value={resource.id}>
                                {resource.title} ({resource.type})
                            </option>
                        ))}
                    </select>
                </div>

                {resourceDetails && (
                    <div className="info-box">
                        <h4>{resourceDetails.title}</h4>
                        <p><strong>Type:</strong> {resourceDetails.type}</p>
                        <p><strong>Publisher:</strong> {resourceDetails.publisher}</p>
                        
                        {/* Display type-specific fields polymorphically */}
                        {resourceDetails.author && (
                            <p><strong>Author:</strong> {resourceDetails.author}</p>
                        )}
                        {resourceDetails.isbn && (
                            <p><strong>ISBN:</strong> {resourceDetails.isbn}</p>
                        )}
                        {resourceDetails.issn && (
                            <p><strong>ISSN:</strong> {resourceDetails.issn}</p>
                        )}
                        
                        <p className="statement">{resourceDetails.statement}</p>
                    </div>
                )}

                <div className="btn-group">
                    <button 
                        type="submit" 
                        disabled={loading || !selectedMember || !selectedResource || (memberDetails && !memberDetails.canBorrow)}
                        className="btn btn-primary"
                    >
                        {loading ? '⏳ Processing...' : '📚 Borrow Resource'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedMember('');
                            setSelectedResource('');
                            setMemberDetails(null);
                            setResourceDetails(null);
                            setMemberErrors([]);
                        }}
                        className="btn btn-secondary"
                    >
                        Clear
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BorrowResource;

import React, { useState, useEffect } from 'react';
import { MdRefresh, MdCheckCircle, MdWarning, MdLaunch } from 'react-icons/md';
import { getAvailableResources } from '../api/api';
import toast from 'react-hot-toast';

const AvailableResources = () => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadResources();
    }, []);

    const loadResources = async () => {
        try {
            setLoading(true);
            const response = await getAvailableResources();
            setResources(response.data.resources || []);
        } catch (error) {
            toast.error('Failed to load available resources');
            setResources([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="header-row">
                <h2>Available Resources</h2>
                <button onClick={loadResources} disabled={loading} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MdRefresh style={{ fontSize: '1.25rem' }} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <p>Loading available resources...</p>
            ) : (
                <>
                    <p className="info-text">Total Available: {resources.length}</p>
                    {resources.length === 0 ? (
                        <p className="empty-message">No resources currently available for borrowing</p>
                    ) : (
                        <div className="resources-grid">
                            {resources.map((resource) => (
                                <div key={resource.id} className="resource-card">
                                    <div className="resource-type-badge">{resource.type}</div>
                                    <h3>{resource.title}</h3>
                                    <p><strong>Publisher:</strong> {resource.publisher}</p>
                                    
                                    {resource.author && (
                                        <p><strong>Author:</strong> {resource.author}</p>
                                    )}
                                    {resource.isbn && (
                                        <p><strong>ISBN:</strong> {resource.isbn}</p>
                                    )}
                                    {resource.issn && (
                                        <p><strong>ISSN:</strong> {resource.issn}</p>
                                    )}
                                    {resource.volume && (
                                        <p><strong>Volume:</strong> {resource.volume}</p>
                                    )}
                                    {resource.issue && (
                                        <p><strong>Issue:</strong> {resource.issue}</p>
                                    )}
                                    {resource.url && (
                                        <p className="url-link">
                                            <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <MdLaunch style={{ fontSize: '1rem' }} />
                                                Access Online
                                            </a>
                                        </p>
                                    )}
                                    {resource.licenceValid === false && (
                                        <p className="warning" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
                                            <MdWarning style={{ fontSize: '1.25rem', flexShrink: 0 }} />
                                            Licence expired on {resource.licenceExpiry}
                                        </p>
                                    )}
                                    
                                    <p className="statement">{resource.statement}</p>
                                    <p className="availability" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d' }}>
                                        <MdCheckCircle style={{ fontSize: '1.25rem', flexShrink: 0 }} />
                                        Available for immediate borrowing
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AvailableResources;

import React, { useState } from 'react';
import { addResource } from '../api/api';
import toast from 'react-hot-toast';

const ResourceManagement = () => {
    const [resourceType, setResourceType] = useState('book');
    const [formData, setFormData] = useState({
        type: 'book',
        title: '',
        publisher: '',
        isbn: '',
        author: '',
        edition: '',
        issn: '',
        volume: 1,
        issue: 1,
        url: '',
        licenceExpiry: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleResourceTypeChange = (type) => {
        setResourceType(type);
        setFormData({ ...formData, type });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!formData.title.trim() || !formData.publisher.trim()) {
                toast.error('Title and Publisher are required');
                setLoading(false);
                return;
            }

            const data = { ...formData };
            const response = await addResource(data);
            toast.success(`${data.type} added successfully: ${response.data.title}`);
            // Reset form
            setFormData({
                type: resourceType,
                title: '',
                publisher: '',
                isbn: '',
                author: '',
                edition: '',
                issn: '',
                volume: 1,
                issue: 1,
                url: '',
                licenceExpiry: ''
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add resource');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>Add New Library Resource</h2>

            <div className="resource-type-selector">
                <button
                    className={resourceType === 'book' ? 'active' : ''}
                    onClick={() => handleResourceTypeChange('book')}
                >
                    📖 Book
                </button>
                <button
                    className={resourceType === 'journal' ? 'active' : ''}
                    onClick={() => handleResourceTypeChange('journal')}
                >
                    📰 Journal
                </button>
                <button
                    className={resourceType === 'digital' ? 'active' : ''}
                    onClick={() => handleResourceTypeChange('digital')}
                >
                    💻 Digital
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Title *</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        placeholder="Enter resource title"
                    />
                </div>

                <div className="form-group">
                    <label>Publisher *</label>
                    <input
                        type="text"
                        name="publisher"
                        value={formData.publisher}
                        onChange={handleChange}
                        required
                        placeholder="Enter publisher name"
                    />
                </div>

                {resourceType === 'book' && (
                    <>
                        <div className="form-group">
                            <label>ISBN</label>
                            <input
                                type="text"
                                name="isbn"
                                value={formData.isbn}
                                onChange={handleChange}
                                placeholder="Enter ISBN"
                            />
                        </div>
                        <div className="form-group">
                            <label>Author</label>
                            <input
                                type="text"
                                name="author"
                                value={formData.author}
                                onChange={handleChange}
                                placeholder="Enter author name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Edition</label>
                            <input
                                type="text"
                                name="edition"
                                value={formData.edition}
                                onChange={handleChange}
                                placeholder="Enter edition"
                            />
                        </div>
                    </>
                )}

                {resourceType === 'journal' && (
                    <>
                        <div className="form-group">
                            <label>ISSN</label>
                            <input
                                type="text"
                                name="issn"
                                value={formData.issn}
                                onChange={handleChange}
                                placeholder="Enter ISSN"
                            />
                        </div>
                        <div className="form-group">
                            <label>Volume</label>
                            <input
                                type="number"
                                name="volume"
                                value={formData.volume}
                                onChange={handleChange}
                                min="1"
                            />
                        </div>
                        <div className="form-group">
                            <label>Issue</label>
                            <input
                                type="number"
                                name="issue"
                                value={formData.issue}
                                onChange={handleChange}
                                min="1"
                            />
                        </div>
                    </>
                )}

                {resourceType === 'digital' && (
                    <>
                        <div className="form-group">
                            <label>URL *</label>
                            <input
                                type="url"
                                name="url"
                                value={formData.url}
                                onChange={handleChange}
                                required
                                placeholder="https://example.com/resource"
                            />
                        </div>
                        <div className="form-group">
                            <label>Licence Expiry Date *</label>
                            <input
                                type="date"
                                name="licenceExpiry"
                                value={formData.licenceExpiry}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </>
                )}

                <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? 'Adding...' : 'Add Resource'}
                </button>
            </form>
        </div>
    );
};

export default ResourceManagement;

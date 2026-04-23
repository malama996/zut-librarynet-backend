import React, { useState } from 'react';
import { searchResources } from '../api/api';
import toast from 'react-hot-toast';

const SearchResources = () => {
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!keyword.trim()) {
            toast.error('Please enter a search keyword');
            return;
        }

        setLoading(true);
        try {
            const response = await searchResources(keyword);
            setResults(response.data.results || []);
            toast.success(`Found ${response.data.count} results`);
        } catch (error) {
            toast.error('Search failed');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>🔍 Search Resources (Cherry Challenge 3)</h2>
            <p className="description">
                Search with relevance scoring: exact title matches first, then partial matches,
                then author matches. Results sorted by relevance.
            </p>

            <form onSubmit={handleSearch} className="search-form">
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Search by title, author, or keyword..."
                    className="search-input"
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {results.length > 0 && (
                <div className="results">
                    <h3>Results ({results.length})</h3>
                    {results.map(resource => (
                        <div key={resource.id} className="result-item">
                            <h4>{resource.title}</h4>
                            <p><strong>Type:</strong> {resource.type}</p>
                            <p><strong>Status:</strong> {resource.available ? 'Available' : 'On Loan'}</p>
                            {resource.author && <p><strong>Author:</strong> {resource.author}</p>}
                            {resource.isbn && <p><strong>ISBN:</strong> {resource.isbn}</p>}
                            {resource.issn && <p><strong>ISSN:</strong> {resource.issn}</p>}
                            <p className="statement">{resource.statement}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchResources;

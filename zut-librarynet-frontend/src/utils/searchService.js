// ============================================================================
// Advanced Search Service with Relevance Scoring
// Implements the "Cherry" feature: prioritize exact matches > partial > fuzzy
// ============================================================================

import axios from 'axios';

const API_BASE_URL = 'http://localhost:7070/api';

/**
 * Scores search relevance for a resource
 * Prioritizes: exact title match > title starts with > partial title > author/publisher
 * @param {Object} resource - Resource object
 * @param {String} query - Search query string
 * @returns {Number} Relevance score (higher = more relevant)
 */
function calculateRelevanceScore(resource, query) {
  if (!query || !resource) return 0;

  const queryLower = query.toLowerCase().trim();
  const title = (resource.title || '').toLowerCase();
  const author = (resource.author || '').toLowerCase();
  const publisher = (resource.publisher || '').toLowerCase();

  let score = 0;

  // Exact title match (100 points)
  if (title === queryLower) {
    score += 100;
  }
  // Title starts with query (80 points)
  else if (title.startsWith(queryLower)) {
    score += 80;
  }
  // Title contains query as complete word (60 points)
  else if (title.match(new RegExp(`\\b${queryLower}\\b`))) {
    score += 60;
  }
  // Title contains query as substring (40 points)
  else if (title.includes(queryLower)) {
    score += 40;
  }

  // Author match (30 points)
  if (author.includes(queryLower)) {
    score += 30;
  }

  // Publisher match (10 points)
  if (publisher.includes(queryLower)) {
    score += 10;
  }

  // ISSN/ISBN match for journals/books (20 points)
  if (resource.issn?.includes(queryLower)) {
    score += 20;
  }
  if (resource.isbn?.includes(queryLower)) {
    score += 20;
  }

  return score;
}

/**
 * Performs advanced search with relevance ranking
 * @param {String} query - Search query
 * @returns {Promise<Array>} Results sorted by relevance (highest first)
 */
export async function performAdvancedSearch(query) {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    // Fetch all resources
    const response = await axios.get(`${API_BASE_URL}/resources/search`, {
      params: { q: query.trim() },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': localStorage.getItem('authToken') || '',
      },
    });

    const results = response.data.results || [];

    // Score and sort by relevance
    const scoredResults = results.map((resource) => ({
      ...resource,
      _relevanceScore: calculateRelevanceScore(resource, query),
      _matchType: getMatchType(resource, query),
    }));

    // Sort by relevance score (descending) then by title alphabetically
    return scoredResults.sort((a, b) => {
      if (b._relevanceScore !== a._relevanceScore) {
        return b._relevanceScore - a._relevanceScore;
      }
      return (a.title || '').localeCompare(b.title || '');
    });
  } catch (error) {
    console.error('Advanced search failed:', error);
    return [];
  }
}

/**
 * Determines the type of match for display purposes
 * @param {Object} resource - Resource object
 * @param {String} query - Search query
 * @returns {String} Match type: 'exact', 'title', 'author', 'isbn', 'other'
 */
function getMatchType(resource, query) {
  const queryLower = query.toLowerCase().trim();
  const title = (resource.title || '').toLowerCase();
  const author = (resource.author || '').toLowerCase();

  if (title === queryLower) return 'exact';
  if (title.includes(queryLower)) return 'title';
  if (author.includes(queryLower)) return 'author';
  if (resource.isbn?.includes(queryLower) || resource.issn?.includes(queryLower)) return 'isbn';

  return 'other';
}

/**
 * Highlights search query in results for display
 * @param {String} text - Text to highlight
 * @param {String} query - Query string to highlight
 * @returns {String} HTML with highlighted terms
 */
export function highlightSearchQuery(text, query) {
  if (!text || !query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Groups search results by type
 * @param {Array} results - Search results
 * @returns {Object} Grouped by resource type
 */
export function groupResultsByType(results) {
  return results.reduce((acc, result) => {
    const type = result.type || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(result);
    return acc;
  }, {});
}

/**
 * Filters results by member-appropriate resource types
 * @param {Array} results - Search results
 * @param {String} memberType - STUDENT, LECTURER, or RESEARCHER
 * @returns {Array} Filtered results
 */
export function filterByMemberType(results, memberType) {
  const allowedTypes = {
    STUDENT: ['BOOK', 'JOURNAL'],
    LECTURER: ['BOOK', 'JOURNAL'],
    RESEARCHER: ['JOURNAL'],
  };

  const allowed = allowedTypes[memberType] || allowedTypes.STUDENT;
  return results.filter((r) => allowed.includes(r.type));
}

export default {
  performAdvancedSearch,
  highlightSearchQuery,
  groupResultsByType,
  filterByMemberType,
};

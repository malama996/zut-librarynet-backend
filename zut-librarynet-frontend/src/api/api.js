import axios from 'axios';

const API_BASE_URL = 'http://localhost:7070/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

// Member APIs
export const registerMember = (memberData) => api.post('/members/register', memberData);
export const getMember = (memberId) => api.get(`/members/${memberId}`);
export const getAllMembers = () => api.get('/members');
export const getMemberLoans = (memberId) => api.get(`/members/${memberId}/loans`);
export const getMemberFines = (memberId) => api.get(`/members/${memberId}/fines`);
export const payFine = (memberId, fineId) => api.post(`/members/${memberId}/fines/${fineId}/pay`);

// Resource APIs
export const addResource = (resourceData) => api.post('/resources/add', resourceData);
export const getResource = (resourceId) => api.get(`/resources/${resourceId}`);
export const getAllResources = () => api.get('/resources');
export const getAvailableResources = () => api.get('/resources/available');
export const getResourcesByType = (type) => api.get(`/resources/type/${type}`);
export const searchResources = (keyword) => api.get(`/resources/search?q=${encodeURIComponent(keyword)}`);

// Loan APIs
export const borrowResource = (memberId, resourceId) =>
    api.post('/loans/borrow', { memberId, resourceId });
export const returnResource = (loanId) => api.post(`/loans/${loanId}/return`);

// Reservation APIs
export const createReservation = (memberId, resourceId) =>
    api.post('/reservations', { memberId, resourceId });
export const getMemberReservations = (memberId) => api.get(`/members/${memberId}/reservations`);
export const cancelReservation = (reservationId) => api.delete(`/reservations/${reservationId}`);

// Report APIs
export const getOverdueReport = () => api.get('/reports/overdue');
export const getStatistics = () => api.get('/statistics');
export const healthCheck = () => api.get('/health');

export default api;

import axios from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL.trim().replace(/\/$/, '') + '/api')
    : 'http://localhost:7070/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================
api.interceptors.request.use(
    (config) => {
        // Public endpoints - skip auth
        const publicEndpoints = [
            '/auth/login',
            '/auth/register/member',
            '/auth/register/admin'
        ];
        const isPublic = publicEndpoints.some(ep => config.url?.includes(ep));
        if (isPublic) return config;

        // Add token
        const token = localStorage.getItem('authToken');
        if (token) config.headers.Authorization = token;
        return config;
    },
    (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userName');
        }
        console.error('API Error:', error.response?.data?.message || error.message);
        return Promise.reject(error);
    }
);

// ============================================================
// AUTH APIs
// ============================================================

/**
 * Login - Single endpoint for all users
 * @returns {Promise<{user: {id, name, email, role}, token: string}>}
 */
export const login = (email, password) =>
    api.post('/auth/login', { email, password });

/**
 * Register as member (Student, Lecturer, Researcher).
 * Full payload: name, email, password, type, idSecret, phone, and type-specific fields.
 *
 * @param {Object} data — { name, email, password, type, idSecret, phone, ...typeFields }
 *   type:       'STUDENT' | 'LECTURER' | 'RESEARCHER'
 *   idSecret:   studentId | employeeId | researcherId
 */
export const registerMember = (data) =>
    api.post('/auth/register/member', data);

/**
 * Register as admin (requires secret)
 */
export const registerAdmin = (name, email, password, adminSecret) =>
    api.post('/auth/register/admin', { name, email, password, adminSecret });

/**
 * Logout
 */
export const logout = () => api.post('/auth/logout');

// ============================================================
// RESOURCE APIs
// ============================================================
export const addResource = (data) => api.post('/resources', data);
export const getResource = (id) => api.get(`/resources/${id}`);
export const getAllResources = () => api.get('/resources');
export const getAvailableResources = () => api.get('/resources/available');
export const getResourcesByType = (type) => api.get(`/resources/type/${type}`);
export const searchResources = (q) => api.get(`/resources/search?q=${encodeURIComponent(q || '')}`);

// ============================================================
// LOAN APIs
// ============================================================
export const borrowResource = (memberId, resourceId) =>
    api.post('/loans/borrow', { memberId, resourceId });

export const returnResource = (loanId) =>
    api.post(`/loans/${loanId}/return`);

export const extendLoan = (loanId, days) =>
    api.post(`/loans/${loanId}/extend`, { days });

export const getLoan = (loanId) =>
    api.get(`/loans/${loanId}`);

// ============================================================
// MEMBER APIs
// ============================================================
export const getMember = (id) => api.get(`/members/${id}`);
export const getMemberLoans = (id) => api.get(`/members/${id}/loans`);
export const getMemberFines = (id) => api.get(`/members/${id}/fines`);
export const payFine = (memberId, fineId) => api.post(`/members/${memberId}/fines/${fineId}/pay`);
export const getMemberReservations = (id) => api.get(`/members/${id}/reservations`);
export const getNextWaitingMember = (resourceId) => api.get(`/resources/${resourceId}/next-waiting`);
export const getAllMembers = () => api.get('/members');

// ============================================================
// RESERVATION APIs
// ============================================================
export const createReservation = (memberId, resourceId) =>
    api.post('/reservations', { memberId, resourceId });

export const cancelReservation = (reservationId) =>
    api.delete(`/reservations/${reservationId}`);

export const getReservationPosition = (reservationId) =>
    api.get(`/reservations/${reservationId}/queue-position`);

// ============================================================
// STATS APIs
// ============================================================
export const getStatistics = () => api.get('/statistics');
export const getOverdueReport = () => api.get('/reports/overdue');

// ============================================================
// ADMIN APIs (all require ADMIN role)
// ============================================================

// Resources
export const adminGetAllResources = () => api.get('/admin/resources');
export const adminCreateResource = (data) => api.post('/admin/resources', data);
export const adminUpdateResource = (id, data) => api.put(`/admin/resources/${id}`, data);
export const adminDeleteResource = (id) => api.delete(`/admin/resources/${id}`);

// Users
export const adminGetAllUsers = () => api.get('/admin/users');
export const adminUpdateUser = (id, data) => api.put(`/admin/users/${id}`, data);

// Loans
export const adminGetAllLoans = () => api.get('/admin/loans');

// Reservations
export const adminGetAllReservations = () => api.get('/admin/reservations');

// Statistics
export const adminGetStats = () => api.get('/admin/stats');

// ============================================================
// FIRESTORE SYNC (Lazy import)
// ============================================================
let firestore = null;

async function getFirestore() {
    if (!firestore) {
        try {
            firestore = await import('../firebase/firestoreService');
        } catch (e) {
            console.log('[API] Firestore not available');
        }
    }
    return firestore;
}

// Sync after borrow
export async function syncBorrow(loanData, resourceData) {
    const fs = await getFirestore();
    if (!fs) return;
    try {
        await fs.syncBorrowAction(
            loanData.memberId,
            {
                loanId:       loanData.loanId || loanData.id,
                resourceId:   loanData.resourceId || resourceData?.id,
                resourceTitle: loanData.resourceTitle,
                memberId:     loanData.memberId,
                borrowDate:   loanData.borrowDate,
                dueDate:      loanData.dueDate,
            },
            { id: loanData.resourceId || resourceData?.id }
        );
    } catch (e) {
        console.error('[API] Firestore sync error:', e);
    }
}

// Sync after return
export async function syncReturn(loanId, resourceId, returnData) {
    const fs = await getFirestore();
    if (!fs) return;
    try {
        await fs.syncReturnAction(loanId, resourceId, returnData);
    } catch (e) {
        console.error('[API] Firestore sync error:', e);
    }
}

// Sync member after registration
export async function syncMember(memberData) {
    const fs = await getFirestore();
    if (!fs) return;
    try {
        await fs.setDocument(fs.COLLECTIONS.MEMBERS, memberData.id, {
            id:         memberData.id,
            name:       memberData.name,
            email:      memberData.email,
            memberType: memberData.memberType || memberData.memberType,
            createdAt:  new Date().toISOString(),
        });
        console.log('[API] Member synced to Firestore:', memberData.email);
    } catch (e) {
        console.error('[API] Member sync error:', e);
    }
}

// Sync reservation after creation
export async function syncReservation(reservationData) {
    const fs = await getFirestore();
    if (!fs) return;
    try {
        await fs.syncReservationAction(reservationData);
        console.log('[API] Reservation synced to Firestore');
    } catch (e) {
        console.error('[API] Reservation sync error:', e);
    }
}

export default api;
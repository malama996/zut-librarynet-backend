import axios from 'axios';
import { auth } from '../firebase/config';

const API_BASE_URL =
    import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL.trim().replace(/\/$/, '') + '/api')
    : 'http://localhost:7070/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// ============================================================
// REQUEST INTERCEPTOR - Attach Firebase ID Token
// ============================================================
api.interceptors.request.use(
    async (config) => {
        // Public endpoints - skip auth
        const publicEndpoints = [
            '/auth/verify',
            '/auth/register-profile',
        ];
        const isPublic = publicEndpoints.some(ep => config.url?.includes(ep));
        if (isPublic) return config;

        // Attach Firebase ID token
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const idToken = await currentUser.getIdToken();
                config.headers.Authorization = `Bearer ${idToken}`;
            } catch (err) {
                console.error('[API] Failed to get ID token:', err);
            }
        }
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
            // Token invalid or expired — AuthContext will handle state
            console.warn('[API] 401 Unauthorized');
        }
        return Promise.reject(error);
    }
);

// ============================================================
// AUTH APIs
// ============================================================

/**
 * Verify Firebase token and get user profile from backend
 */
export const verifyToken = () => api.post('/auth/verify');

/**
 * Register member profile in backend after Firebase Auth signup
 */
export const registerMemberProfile = (data) =>
    api.post('/auth/register-profile', data);

/**
 * Logout (frontend handles Firebase signOut)
 */
export const logout = () => Promise.resolve({ data: { success: true } });

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
export const adminGetAllResources = () => api.get('/admin/resources');
export const adminCreateResource = (data) => api.post('/admin/resources', data);
export const adminUpdateResource = (id, data) => api.put(`/admin/resources/${id}`, data);
export const adminDeleteResource = (id) => api.delete(`/admin/resources/${id}`);
export const adminGetAllUsers = () => api.get('/admin/users');
export const adminUpdateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const adminGetAllLoans = () => api.get('/admin/loans');
export const adminGetAllReservations = () => api.get('/admin/reservations');
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

export async function syncBorrow(loanData, resourceData) {
    const fs = await getFirestore();
    if (!fs) return;
    try {
        await fs.syncBorrowAction(
            loanData.memberId,
            {
                loanId: loanData.loanId || loanData.id,
                resourceId: loanData.resourceId || resourceData?.id,
                resourceTitle: loanData.resourceTitle,
                memberId: loanData.memberId,
                borrowDate: loanData.borrowDate,
                dueDate: loanData.dueDate,
            },
            { id: loanData.resourceId || resourceData?.id }
        );
    } catch (e) {
        console.error('[API] Firestore sync error:', e);
    }
}

export async function syncReturn(loanId, resourceId, returnData) {
    const fs = await getFirestore();
    if (!fs) return;
    try {
        await fs.syncReturnAction(loanId, resourceId, returnData);
    } catch (e) {
        console.error('[API] Firestore sync error:', e);
    }
}

export async function syncMember(memberData) {
    const fs = await getFirestore();
    if (!fs) return;
    try {
        await fs.setDocument(fs.COLLECTIONS.MEMBERS, memberData.id, {
            id: memberData.id,
            name: memberData.name,
            email: memberData.email,
            memberType: memberData.memberType || memberData.memberType,
            createdAt: new Date().toISOString(),
        });
        console.log('[API] Member synced to Firestore:', memberData.email);
    } catch (e) {
        console.error('[API] Member sync error:', e);
    }
}

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


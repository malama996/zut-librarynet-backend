/**
 * Firestore Service
 *
 * Handles real-time sync between backend and UI.
 *
 * COLLECTIONS:
 * - users: User profiles keyed by Firebase UID
 * - resources: All library resources
 * - loans: Active loans
 * - reservations: Active reservations
 *
 * Flow:
 * 1. API call succeeds
 * 2. Backend processes
 * 3. Frontend updates Firestore
 * 4. UI listeners update instantly
 */

import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from './config';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  RESOURCES: 'resources',
  LOANS: 'loans',
  RESERVATIONS: 'reservations',
  BORROW_LOGS: 'borrowLogs'
};

// ============================================================
// CORE CRUD OPERATIONS
// ============================================================

/**
 * Add or update a document in Firestore
 */
export async function setDocument(collectionName, id, data) {
  const { db } = getFirebaseServices();
  if (!db) return null;

  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firestore] Document ${id} updated in ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`[Firestore] Error setting document:`, error);
    return null;
  }
}

/**
 * Update specific fields in a document
 */
export async function updateDocument(collectionName, id, data) {
  const { db } = getFirebaseServices();
  if (!db) return null;

  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    console.log(`[Firestore] Document ${id} updated in ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`[Firestore] Error updating document:`, error);
    return null;
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(collectionName, id) {
  const { db } = getFirebaseServices();
  if (!db) return null;

  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    console.log(`[Firestore] Document ${id} deleted from ${collectionName}`);
    return true;
  } catch (error) {
    console.error(`[Firestore] Error deleting document:`, error);
    return null;
  }
}

/**
 * Get a single document
 */
export async function getDocument(collectionName, id) {
  const { db } = getFirebaseServices();
  if (!db) return null;

  try {
    const docRef = doc(db, collectionName, id);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {
    console.error(`[Firestore] Error getting document:`, error);
    return null;
  }
}

// ============================================================
// USER PROFILE OPERATIONS
// ============================================================

/**
 * Create or update a user profile in Firestore (users/{uid})
 */
export async function syncUserProfile(uid, data) {
  return setDocument(COLLECTIONS.USERS, uid, {
    uid,
    ...data,
    createdAt: serverTimestamp()
  });
}

/**
 * Get a user profile by UID
 */
export async function getUserProfile(uid) {
  return getDocument(COLLECTIONS.USERS, uid);
}

// ============================================================
// REAL-TIME LISTENERS
// ============================================================

/**
 * Listen to a collection in real-time
 * Returns unsubscribe function
 */
export function subscribeToCollection(collectionName, callback, filters = {}) {
  const { db } = getFirebaseServices();
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    let q = collection(db, collectionName);

    if (filters.where) {
      q = query(q, where(...filters.where));
    }
    if (filters.orderBy) {
      q = query(q, orderBy(...filters.orderBy));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
      console.error(`[Firestore] Listener error:`, error);
    });

    return unsubscribe;
  } catch (error) {
    console.error(`[Firestore] Error setting up listener:`, error);
    callback([]);
    return () => {};
  }
}

/**
 * Listen to a single document
 */
export function subscribeToDocument(collectionName, id, callback) {
  const { db } = getFirebaseServices();
  if (!db) {
    callback(null);
    return () => {};
  }

  try {
    const docRef = doc(db, collectionName, id);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    });

    return unsubscribe;
  } catch (error) {
    console.error(`[Firestore] Error setting up listener:`, error);
    callback(null);
    return () => {};
  }
}

// ============================================================
// LIBRARY-SPECIFIC OPERATIONS
// ============================================================

export async function addResourceToFirestore(resource) {
  return setDocument(COLLECTIONS.RESOURCES, resource.id, {
    title: resource.title,
    type: resource.type || resource.resourceType,
    publisher: resource.publisher,
    available: true,
    availableCount: resource.available ? 1 : 0,
    ...resource
  });
}

export async function updateResourceAvailability(resourceId, isAvailable) {
  return updateDocument(COLLECTIONS.RESOURCES, resourceId, {
    available: isAvailable,
    lastUpdated: new Date().toISOString()
  });
}

export async function addLoanToFirestore(loan) {
  return setDocument(COLLECTIONS.LOANS, loan.loanId || loan.id, {
    userId: loan.userId || loan.memberId,
    resourceId: loan.resourceId,
    resourceTitle: loan.resourceTitle,
    borrowDate: loan.borrowDate,
    dueDate: loan.dueDate,
    status: 'ACTIVE',
    createdAt: serverTimestamp()
  });
}

export async function updateLoanStatus(loanId, status, fineAmount = 0) {
  return updateDocument(COLLECTIONS.LOANS, loanId, {
    status,
    fineAmount,
    returnDate: status === 'RETURNED' ? serverTimestamp() : null
  });
}

export async function addReservationToFirestore(reservation) {
  return setDocument(COLLECTIONS.RESERVATIONS, reservation.reservationId || reservation.id, {
    userId: reservation.userId || reservation.memberId,
    resourceId: reservation.resourceId,
    resourceTitle: reservation.resourceTitle,
    status: 'PENDING',
    createdAt: serverTimestamp()
  });
}

export async function updateReservationStatus(reservationId, status) {
  return updateDocument(COLLECTIONS.RESERVATIONS, reservationId, {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function addBorrowLog(log) {
  const logId = `log_${Date.now()}`;
  return setDocument(COLLECTIONS.BORROW_LOGS, logId, {
    userId: log.userId,
    resourceId: log.resourceId,
    action: log.action, // BORROW / RETURN / RESERVE
    timestamp: serverTimestamp()
  });
}

// ============================================================
// SYNC FUNCTIONS (Call after API success)
// ============================================================

export async function syncBorrowAction(userId, loanData, resourceData) {
  const promises = [];

  if (loanData.loanId || loanData.id) {
    promises.push(addLoanToFirestore({ ...loanData, userId }));
  }

  if (resourceData.id) {
    promises.push(updateResourceAvailability(resourceData.id, false));
  }

  promises.push(addBorrowLog({
    userId,
    resourceId: resourceData.id || loanData.resourceId,
    action: 'BORROW'
  }));

  await Promise.all(promises);
}

export async function syncReturnAction(loanId, resourceId, userId, loanData) {
  const promises = [];

  promises.push(updateLoanStatus(loanId, 'RETURNED', loanData?.fineAmount || 0));
  promises.push(updateResourceAvailability(resourceId, true));
  promises.push(addBorrowLog({
    userId,
    resourceId,
    action: 'RETURN'
  }));

  await Promise.all(promises);
}

export async function syncReservationAction(userId, reservationData) {
  const promises = [];

  if (reservationData.reservationId || reservationData.id) {
    promises.push(addReservationToFirestore({ ...reservationData, userId }));
  }

  promises.push(addBorrowLog({
    userId,
    resourceId: reservationData.resourceId,
    action: 'RESERVE'
  }));

  await Promise.all(promises);
}

export default {
  COLLECTIONS,
  setDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  syncUserProfile,
  getUserProfile,
  subscribeToCollection,
  subscribeToDocument,
  addResourceToFirestore,
  updateResourceAvailability,
  addLoanToFirestore,
  updateLoanStatus,
  addReservationToFirestore,
  updateReservationStatus,
  addBorrowLog,
  syncBorrowAction,
  syncReturnAction,
  syncReservationAction
};


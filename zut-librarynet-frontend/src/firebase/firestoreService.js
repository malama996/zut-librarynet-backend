/**
 * Firestore Service
 *
 * Handles real-time sync between backend and UI.
 *
 * COLLECTIONS:
 * - resources: All library resources
 * - loans: Active loans
 * - reservations: Active reservations
 * - members: Member data
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
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from './config';

// Collection names
export const COLLECTIONS = {
  RESOURCES: 'resources',
  LOANS: 'loans',
  RESERVATIONS: 'reservations',
  MEMBERS: 'members'
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
// REAL-TIME LISTENERS
// ============================================================

/**
 * Listen to a collection in real-time
 * Returns unsubscribe function
 *
 * Usage:
 *   const unsubscribe = subscribeToCollection('resources', (data) => setResources(data));
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

/**
 * Add a new resource to Firestore
 */
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

/**
 * Update resource availability in Firestore
 */
export async function updateResourceAvailability(resourceId, isAvailable) {
  return updateDocument(COLLECTIONS.RESOURCES, resourceId, {
    available: isAvailable,
    lastUpdated: new Date().toISOString()
  });
}

/**
 * Add a loan to Firestore
 */
export async function addLoanToFirestore(loan) {
  return setDocument(COLLECTIONS.LOANS, loan.loanId || loan.id, {
    memberId: loan.memberId,
    resourceId: loan.resourceId,
    resourceTitle: loan.resourceTitle,
    borrowDate: loan.borrowDate,
    dueDate: loan.dueDate,
    status: 'ACTIVE',
    createdAt: serverTimestamp()
  });
}

/**
 * Update loan status in Firestore
 */
export async function updateLoanStatus(loanId, status, fineAmount = 0) {
  return updateDocument(COLLECTIONS.LOANS, loanId, {
    status,
    fineAmount,
    returnDate: status === 'RETURNED' ? serverTimestamp() : null
  });
}

/**
 * Add a reservation to Firestore
 */
export async function addReservationToFirestore(reservation) {
  return setDocument(COLLECTIONS.RESERVATIONS, reservation.reservationId || reservation.id, {
    memberId: reservation.memberId,
    resourceId: reservation.resourceId,
    resourceTitle: reservation.resourceTitle,
    status: 'PENDING',
    createdAt: serverTimestamp()
  });
}

/**
 * Update reservation status in Firestore
 */
export async function updateReservationStatus(reservationId, status) {
  return updateDocument(COLLECTIONS.RESERVATIONS, reservationId, {
    status,
    updatedAt: serverTimestamp()
  });
}

// ============================================================
// SYNC FUNCTIONS (Call after API success)
// ============================================================

/**
 * Sync after borrowing a resource
 * Call this after successful borrowResource() API call
 */
export async function syncBorrowAction(memberId, loanData, resourceData) {
  const promises = [];

  // Update loan in Firestore
  if (loanData.loanId || loanData.id) {
    promises.push(addLoanToFirestore(loanData));
  }

  // Update resource availability
  if (resourceData.id) {
    promises.push(updateResourceAvailability(resourceData.id, false));
  }

  await Promise.all(promises);
}

/**
 * Sync after returning a resource
 * Call this after successful returnResource() API call
 */
export async function syncReturnAction(loanId, resourceId, loanData) {
  const promises = [];

  // Update loan status
  promises.push(updateLoanStatus(loanId, 'RETURNED', loanData?.fineAmount || 0));

  // Update resource availability
  promises.push(updateResourceAvailability(resourceId, true));

  await Promise.all(promises);
}

/**
 * Sync after creating a reservation
 * Call this after successful createReservation() API call
 */
export async function syncReservationAction(reservationData) {
  if (reservationData.reservationId || reservationData.id) {
    await addReservationToFirestore(reservationData);
  }
}

export default {
  COLLECTIONS,
  setDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  subscribeToCollection,
  subscribeToDocument,
  addResourceToFirestore,
  updateResourceAvailability,
  addLoanToFirestore,
  updateLoanStatus,
  addReservationToFirestore,
  updateReservationStatus,
  syncBorrowAction,
  syncReturnAction,
  syncReservationAction
};
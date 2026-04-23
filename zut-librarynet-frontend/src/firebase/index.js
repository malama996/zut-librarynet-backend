/**
 * Firebase Module - Re-exports all Firebase functionality
 *
 * Usage:
 * import firebase from '../firebase';
 * import { subscribeToCollection, syncBorrowAction } from '../firebase';
 */

// Configuration
export { default as firebase, initializeFirebase, getFirebaseServices, isFirebaseConfigured } from './config';

// Firestore service
export {
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
} from './firestoreService';

export { sendReservationEmail, simulateEmailNotification } from '../services/emailService';
export { default as emailService } from '../services/emailService';
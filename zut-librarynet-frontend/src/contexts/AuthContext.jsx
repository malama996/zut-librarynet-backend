/**
 * AuthContext
 *
 * Firebase Authentication State Management
 *
 * - Listens to onAuthStateChanged for persistent sessions
 * - Fetches user role from Firestore users/{uid} after login
 * - Provides { user, uid, role, name, email, loading, logout }
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [uid, setUid] = useState(null);
  const [role, setRole] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUid(firebaseUser.uid);
        setName(firebaseUser.displayName || '');
        setEmail(firebaseUser.email || '');

        // Fetch role from Firestore users/{uid}
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role || 'student');
            if (data.name) setName(data.name);
          } else {
            // No Firestore profile yet — default to student
            setRole('student');
          }
        } catch (err) {
          console.error('[AuthContext] Error fetching user role:', err);
          setRole('student');
        }
      } else {
        setUser(null);
        setUid(null);
        setRole(null);
        setName('');
        setEmail('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[AuthContext] Logout error:', err);
    }
  };

  const value = {
    user,
    uid,
    role,
    name,
    email,
    loading,
    isLoggedIn: !!user,
    isAdmin: role === 'admin',
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export default AuthContext;


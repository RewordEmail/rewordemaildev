import { createContext, useContext, useEffect, useState } from 'react';
import { auth, provider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign in successful:', result.user.email);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setUserData(null); // Clear user data immediately
      console.log('User signed out');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  async function updateUsageCount(uid, newCount) {
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, { usageCount: newCount }, { merge: true });
      setUserData(prev => ({ ...prev, usageCount: newCount }));
    } catch (error) {
      console.error('Error updating usage count:', error);
    }
  }

  // Separate function to load user data
  async function loadUserData(user) {
    if (!user) return;
    
    setDataLoading(true);
    console.log('Loading user data for:', user.uid);
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let data;
      if (userDoc.exists()) {
        console.log('User document found');
        data = userDoc.data();
      } else {
        console.log('Creating new user document');
        data = {
          email: user.email,
          googleId: user.uid,
          subscriptionStatus: 'free',
          usageCount: 0,
          stripeCustomerId: null,
          subscriptionId: null,
          createdAt: new Date()
        };
        await setDoc(userDocRef, data);
        console.log('User document created');
      }
      
      setUserData(data);
      console.log('User data set:', data);
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set default data on error
      setUserData({
        email: user.email,
        googleId: user.uid,
        subscriptionStatus: 'free',
        usageCount: 0,
        stripeCustomerId: null,
        subscriptionId: null,
        createdAt: new Date()
      });
    } finally {
      setDataLoading(false);
    }
  }

  // Simple auth state listener - no async operations here
  useEffect(() => {
    console.log('Setting up auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? `Logged in: ${user.email}` : 'Logged out');
      setCurrentUser(user);
      setLoading(false); // Always set loading to false immediately
      
      if (!user) {
        setUserData(null);
      }
    });

    return unsubscribe;
  }, []);

  // Separate effect to load user data when currentUser changes
  useEffect(() => {
    if (currentUser && !loading) {
      loadUserData(currentUser);
    }
  }, [currentUser, loading]);

  const value = {
    currentUser,
    userData,
    loading: loading || dataLoading, // Show loading if either auth or data is loading
    signInWithGoogle,
    logout,
    updateUsageCount
  };

  console.log('Auth provider state:', { 
    currentUser: currentUser?.email || 'none', 
    userData: userData ? 'loaded' : 'not loaded',
    loading,
    dataLoading
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

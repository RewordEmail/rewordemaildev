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

  async function createUserDocument(user) {
    try {
      console.log('Creating user document for:', user.uid);
      const userDocRef = doc(db, 'users', user.uid);
      const newUserData = {
        email: user.email,
        googleId: user.uid,
        subscriptionStatus: 'free',
        usageCount: 0,
        stripeCustomerId: null,
        subscriptionId: null,
        createdAt: new Date()
      };
      
      await setDoc(userDocRef, newUserData);
      console.log('User document created successfully');
      return newUserData;
    } catch (error) {
      console.error('Error creating user document:', error);
      // Return default data even if creation fails
      return {
        email: user.email,
        googleId: user.uid,
        subscriptionStatus: 'free',
        usageCount: 0,
        stripeCustomerId: null,
        subscriptionId: null,
        createdAt: new Date()
      };
    }
  }

  async function getUserData(uid) {
    try {
      console.log('Fetching user data for:', uid);
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        console.log('User document found');
        return userDoc.data();
      }
      console.log('User document does not exist');
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

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

  useEffect(() => {
    console.log('Setting up auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? `Logged in: ${user.email}` : 'Logged out');
      
      setCurrentUser(user);
      
      if (user) {
        // Handle user data loading separately to avoid blocking the UI
        setTimeout(async () => {
          try {
            let data = await getUserData(user.uid);
            
            if (!data) {
              data = await createUserDocument(user);
            }
            
            console.log('Setting user data:', data);
            setUserData(data);
          } catch (error) {
            console.error('Error in user data flow:', error);
            // Set minimal working data
            setUserData({
              email: user.email,
              googleId: user.uid,
              subscriptionStatus: 'free',
              usageCount: 0,
              stripeCustomerId: null,
              subscriptionId: null,
              createdAt: new Date()
            });
          }
        }, 100); // Small delay to ensure UI updates first
      } else {
        setUserData(null);
      }
      
      // Always set loading to false immediately when auth state changes
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signInWithGoogle,
    logout,
    updateUsageCount,
    getUserData
  };

  console.log('Auth provider rendering:', { 
    currentUser: currentUser?.email || 'none', 
    userData: userData ? 'loaded' : 'not loaded',
    loading 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

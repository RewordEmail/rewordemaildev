import { createContext, useContext, useEffect, useState } from 'react';
import { auth, provider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Mock mode - set to false for real Firebase integration
const MOCK_MODE = false;

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Mock user data for testing
  const mockUserData = {
    email: 'test@example.com',
    googleId: 'mock-user-id',
    subscriptionStatus: 'free',
    usageCount: 0, // Start with 0 since they already used 1 anonymous generation
    stripeCustomerId: null,
    subscriptionId: null,
    createdAt: new Date()
  };

  async function signInWithGoogle() {
    if (MOCK_MODE) {
      // Mock sign in
      const mockUser = {
        uid: 'mock-user-id',
        email: 'test@example.com',
        displayName: 'Test User'
      };
      setCurrentUser(mockUser);
      setUserData(mockUserData);
      return mockUser;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore, if not create them
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userDocRef, {
          email: user.email,
          googleId: user.uid,
          subscriptionStatus: 'free',
          usageCount: 0,
          stripeCustomerId: null,
          subscriptionId: null,
          createdAt: new Date()
        });
      }
      
      return user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }

  async function logout() {
    if (MOCK_MODE) {
      setCurrentUser(null);
      setUserData(null);
      return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  async function getUserData(uid) {
    if (MOCK_MODE) {
      return mockUserData;
    }

    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  async function updateUsageCount(uid, newCount) {
    if (MOCK_MODE) {
      setUserData(prev => ({ ...prev, usageCount: newCount }));
      return;
    }

    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, { usageCount: newCount }, { merge: true });
      // Update local state
      setUserData(prev => ({ ...prev, usageCount: newCount }));
    } catch (error) {
      console.error('Error updating usage count:', error);
    }
  }

  useEffect(() => {
    if (MOCK_MODE) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'User logged out');
      
      setCurrentUser(user);
      
      if (user) {
        try {
          console.log('Fetching user data for:', user.uid);
          let data = await getUserData(user.uid);
          
          // If user data doesn't exist (new user), create it
          if (!data) {
            console.log('Creating new user document for:', user.uid);
            setLoading(true); // Keep loading while creating user
            
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
            data = newUserData;
            console.log('New user document created successfully');
          }
          
          console.log('Setting user data:', data);
          setUserData(data);
          
        } catch (error) {
          console.error('Error handling user data:', error);
          // Set default data even if there's an error
          const defaultData = {
            email: user.email,
            googleId: user.uid,
            subscriptionStatus: 'free',
            usageCount: 0,
            stripeCustomerId: null,
            subscriptionId: null,
            createdAt: new Date()
          };
          console.log('Setting default user data due to error');
          setUserData(defaultData);
        }
      } else {
        console.log('No user, clearing user data');
        setUserData(null);
      }
      
      console.log('Setting loading to false');
      setLoading(false);
      setInitialized(true);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    initialized,
    signInWithGoogle,
    logout,
    updateUsageCount,
    getUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 
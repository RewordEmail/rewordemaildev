import { createContext, useContext, useEffect, useState } from 'react';
import { auth, provider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function signInWithGoogle() {
    try {
      setError(null);
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign in successful:', result.user.email);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError(error.message);
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

  useEffect(() => {
    console.log('Setting up auth listener...');
    let timeoutId;
    
    // Set a timeout to force loading to false if listener never fires
    timeoutId = setTimeout(() => {
      console.log('Auth listener timeout - proceeding without auth state');
      setLoading(false);
    }, 3000);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? `Logged in: ${user.email}` : 'Logged out');
      clearTimeout(timeoutId); // Cancel timeout since listener fired
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Mock user data for now - we'll add Firestore back once auth is working
  const userData = currentUser ? {
    email: currentUser.email,
    googleId: currentUser.uid,
    subscriptionStatus: 'free',
    usageCount: 0,
    stripeCustomerId: null,
    subscriptionId: null,
    createdAt: new Date()
  } : null;

  const updateUsageCount = (uid, newCount) => {
    // Mock update for now
    console.log('Mock usage count update:', uid, newCount);
  };

  const value = {
    currentUser,
    userData,
    loading,
    error,
    signInWithGoogle,
    logout,
    updateUsageCount
  };

  console.log('Auth provider rendering:', { 
    currentUser: currentUser?.email || 'none', 
    loading, 
    error 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

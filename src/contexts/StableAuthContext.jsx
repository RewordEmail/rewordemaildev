import { createContext, useContext, useEffect, useState } from 'react';
import { auth, provider, db, signUpWithEmail, signInWithEmail } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('StableAuthContext: Setting up auth listener...');
    
    // Timeout fallback - this is NORMAL and expected occasionally
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('StableAuthContext: ⏱️ Auth listener timeout (this is normal) - proceeding with fallback');
        setLoading(false);
      }
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('StableAuthContext: Auth state changed:', user ? `✅ ${user.email}` : '❌ No user');
      clearTimeout(timeoutId);
      setCurrentUser(user);
      setError(null);
      
      if (user) {
        // Load user data from Firestore
        await loadUserData(user);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    }, (authError) => {
      console.error('StableAuthContext: Auth error:', authError);
      clearTimeout(timeoutId);
      setError(`Authentication error: ${authError.message}`);
      setLoading(false);
    });

    return () => {
      console.log('StableAuthContext: Cleaning up auth listener');
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  async function loadUserData(user) {
    try {
      console.log('StableAuthContext: Loading user data for:', user.email);
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('StableAuthContext: User data loaded:', data);
        
        // Check for anonymous usage and merge it
        const anonymousUsage = parseInt(localStorage.getItem('anonymousEmailUsage') || '0', 10);
        if (anonymousUsage > 0) {
          console.log('StableAuthContext: Found anonymous usage:', anonymousUsage);
          const newTotalUsage = (data.usageCount || 0) + anonymousUsage;
          
          // Update the user's usage count to include anonymous usage
          await updateDoc(userDocRef, {
            usageCount: newTotalUsage,
            lastLogin: new Date()
          });
          
          // Clear anonymous usage from localStorage
          localStorage.removeItem('anonymousEmailUsage');
          
          // Update local state with merged data
          const mergedData = { ...data, usageCount: newTotalUsage };
          setUserData(mergedData);
          console.log('StableAuthContext: Anonymous usage merged, new total:', newTotalUsage);
        } else {
          setUserData(data);
        }
      } else {
        // Create new user document
        console.log('StableAuthContext: Creating new user document');
        
        // Check for anonymous usage
        const anonymousUsage = parseInt(localStorage.getItem('anonymousEmailUsage') || '0', 10);
        console.log('StableAuthContext: Anonymous usage for new user:', anonymousUsage);
        
        const newUserData = {
          email: user.email,
          subscriptionStatus: 'free',
          usageCount: anonymousUsage, // Start with anonymous usage count
          createdAt: new Date(),
          lastLogin: new Date()
        };
        
        await setDoc(userDocRef, newUserData);
        console.log('StableAuthContext: New user document created with usage:', anonymousUsage);
        
        // Clear anonymous usage from localStorage
        localStorage.removeItem('anonymousEmailUsage');
        
        setUserData(newUserData);
      }
    } catch (error) {
      console.error('StableAuthContext: Error loading user data:', error);
      // Fallback to basic user data if Firestore fails
      setUserData({
        email: user.email,
        subscriptionStatus: 'free',
        usageCount: 0
      });
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      console.log('StableAuthContext: Starting Google sign-in...');
      const result = await signInWithPopup(auth, provider);
      console.log('StableAuthContext: Google sign-in successful:', result.user.email);
      return result.user;
    } catch (err) {
      console.error('StableAuthContext: Google sign-in error:', err);
      setError(`Sign-in failed: ${err.message}`);
      setLoading(false);
      throw err;
    }
  }

  async function logout() {
    setLoading(true);
    setError(null);
    try {
      console.log('StableAuthContext: Signing out...');
      await signOut(auth);
      console.log('StableAuthContext: Sign out successful');
    } catch (err) {
      console.error('StableAuthContext: Sign out error:', err);
      setError(`Logout failed: ${err.message}`);
      setLoading(false);
      throw err;
    }
  }

  async function updateUsageCount(newCount) {
    if (!currentUser || !userData) return false;
    
    try {
      console.log('StableAuthContext: Updating usage count to:', newCount);
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { 
        usageCount: newCount,
        lastUsed: new Date()
      });
      
      setUserData(prev => ({ ...prev, usageCount: newCount }));
      console.log('StableAuthContext: Usage count updated successfully');
      return true;
    } catch (error) {
      console.error('StableAuthContext: Error updating usage count:', error);
      // Update locally even if Firestore fails
      setUserData(prev => ({ ...prev, usageCount: newCount }));
      return false;
    }
  }

  const value = {
    currentUser,
    userData,
    loading,
    error,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    logout,
    updateUsageCount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

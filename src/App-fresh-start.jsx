import { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState('Clearing cached auth state...');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const clearAndRestart = async () => {
      try {
        setStatus('🧹 Clearing localStorage...');
        localStorage.clear();
        
        setStatus('🧹 Clearing sessionStorage...');
        sessionStorage.clear();
        
        setStatus('🧹 Clearing IndexedDB...');
        if ('indexedDB' in window) {
          try {
            const databases = await indexedDB.databases();
            await Promise.all(
              databases.map(db => {
                if (db.name && db.name.includes('firebase')) {
                  return new Promise((resolve) => {
                    const deleteReq = indexedDB.deleteDatabase(db.name);
                    deleteReq.onsuccess = () => resolve();
                    deleteReq.onerror = () => resolve(); // Continue even if error
                  });
                }
              })
            );
          } catch (e) {
            console.log('IndexedDB clear skipped:', e.message);
          }
        }
        
        setStatus('🔥 Initializing fresh Firebase...');
        
        // Dynamic import to ensure fresh Firebase instance
        const { initializeApp } = await import('firebase/app');
        const { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } = await import('firebase/auth');
        
        const firebaseConfig = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        
        setStatus('🔍 Checking auth state...');
        
        // Force sign out first to clear any stuck state
        try {
          await signOut(auth);
          setStatus('✅ Signed out any existing session');
        } catch (e) {
          setStatus('✅ No existing session to clear');
        }
        
        setStatus('👂 Setting up auth listener...');
        
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            setStatus(`✅ Fresh auth state: Logged in as ${user.email}`);
          } else {
            setStatus('✅ Fresh auth state: No user logged in');
          }
          setReady(true);
        });
        
        // Store auth functions globally for the ready state
        window.freshAuth = { signInWithPopup, auth, provider, signOut };
        
        // Timeout fallback
        setTimeout(() => {
          if (!ready) {
            setStatus('⚠️ Auth listener timeout - proceeding anyway');
            setReady(true);
          }
        }, 3000);
        
      } catch (error) {
        setStatus(`❌ Error: ${error.message}`);
        setReady(true);
      }
    };

    clearAndRestart();
  }, []);

  const handleSignIn = async () => {
    try {
      setStatus('🔑 Signing in with Google...');
      const result = await window.freshAuth.signInWithPopup(window.freshAuth.auth, window.freshAuth.provider);
      setStatus(`✅ Signed in as ${result.user.email}`);
    } catch (error) {
      setStatus(`❌ Sign in error: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      setStatus('🚪 Signing out...');
      await window.freshAuth.signOut(window.freshAuth.auth);
      setStatus('✅ Signed out');
    } catch (error) {
      setStatus(`❌ Sign out error: ${error.message}`);
    }
  };

  const handleReloadApp = () => {
    window.location.href = window.location.origin + window.location.pathname;
  };

  return (
    <div style={{ padding: '2rem', background: 'white', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔧 Fresh Start - Auth Reset</h1>
      
      <div style={{ 
        background: ready ? '#d4edda' : '#fff3cd', 
        border: `1px solid ${ready ? '#c3e6cb' : '#ffeaa7'}`, 
        padding: '1rem', 
        borderRadius: '4px',
        margin: '1rem 0'
      }}>
        <strong>Status:</strong> {status}
      </div>

      {ready && (
        <div style={{ margin: '2rem 0' }}>
          <button 
            onClick={handleSignIn}
            style={{ 
              padding: '1rem 2rem', 
              fontSize: '16px', 
              backgroundColor: '#4285f4', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '1rem'
            }}
          >
            🔑 Sign In with Google
          </button>
          
          <button 
            onClick={handleSignOut}
            style={{ 
              padding: '1rem 2rem', 
              fontSize: '16px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '1rem'
            }}
          >
            🚪 Sign Out
          </button>
          
          <button 
            onClick={handleReloadApp}
            style={{ 
              padding: '1rem 2rem', 
              fontSize: '16px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Load Full App
          </button>
        </div>
      )}

      <div style={{ marginTop: '2rem', fontSize: '14px', color: '#666' }}>
        <p><strong>What this does:</strong></p>
        <ul>
          <li>Clears all localStorage, sessionStorage, and Firebase IndexedDB</li>
          <li>Forces a fresh Firebase initialization</li>
          <li>Clears any stuck authentication state</li>
          <li>Tests basic auth functionality</li>
        </ul>
      </div>
    </div>
  );
}

export default App;

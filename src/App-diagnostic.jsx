import { useState, useEffect } from 'react';

function App() {
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);

  const addLog = (message, type = 'info') => {
    console.log(message);
    setDiagnostics(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  useEffect(() => {
    const runDiagnostics = async () => {
      addLog('🔍 Starting Firebase diagnostics...');
      
      // Check environment variables
      addLog('📋 Checking environment variables...');
      const envVars = {
        VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID
      };

      for (const [key, value] of Object.entries(envVars)) {
        if (value) {
          addLog(`✅ ${key}: Set (${value.substring(0, 20)}...)`, 'success');
        } else {
          addLog(`❌ ${key}: Missing`, 'error');
        }
      }

      // Test Firebase imports
      try {
        addLog('📦 Testing Firebase imports...');
        const { initializeApp } = await import('firebase/app');
        addLog('✅ Firebase app import successful', 'success');
        
        const { getAuth, GoogleAuthProvider, onAuthStateChanged } = await import('firebase/auth');
        addLog('✅ Firebase auth import successful', 'success');

        // Test Firebase initialization
        addLog('🔥 Testing Firebase initialization...');
        const firebaseConfig = {
          apiKey: envVars.VITE_FIREBASE_API_KEY,
          authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: envVars.VITE_FIREBASE_PROJECT_ID,
          storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: envVars.VITE_FIREBASE_APP_ID
        };

        const app = initializeApp(firebaseConfig);
        addLog('✅ Firebase app initialized', 'success');

        const auth = getAuth(app);
        addLog('✅ Firebase auth initialized', 'success');

        // Test auth state listener
        addLog('👂 Testing auth state listener...');
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            addLog(`✅ Auth state changed: User logged in (${user.email})`, 'success');
          } else {
            addLog('✅ Auth state changed: No user', 'success');
          }
          setLoading(false);
        });

        // Set a timeout in case the listener never fires
        setTimeout(() => {
          if (loading) {
            addLog('⚠️ Auth state listener timeout - this may indicate a Firebase config issue', 'error');
            setLoading(false);
          }
        }, 5000);

        return () => unsubscribe();

      } catch (error) {
        addLog(`❌ Firebase error: ${error.message}`, 'error');
        setLoading(false);
      }
    };

    runDiagnostics();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', background: 'white', minHeight: '100vh' }}>
      <h1>🔍 Firebase Diagnostics</h1>
      
      {loading && (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
          <strong>⏳ Running diagnostics...</strong>
        </div>
      )}

      <div style={{ maxHeight: '500px', overflow: 'auto', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
        {diagnostics.map((log, index) => (
          <div key={index} style={{ 
            marginBottom: '0.5rem',
            color: log.type === 'error' ? 'red' : log.type === 'success' ? 'green' : 'black'
          }}>
            <strong>{log.time}</strong>: {log.message}
          </div>
        ))}
      </div>

      {!loading && (
        <div style={{ marginTop: '2rem' }}>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '1rem 2rem', fontSize: '16px', cursor: 'pointer' }}
          >
            Run Diagnostics Again
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

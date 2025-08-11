import { useAuth } from './contexts/SimpleAuthContext'

function App() {
  const { currentUser, loading, error, signInWithGoogle, logout } = useAuth()

  console.log('App rendering:', { 
    currentUser: currentUser?.email || 'none', 
    loading, 
    error 
  });

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'white', minHeight: '100vh' }}>
        <h1>🔄 Loading...</h1>
        <p>Setting up authentication...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'white', minHeight: '100vh' }}>
        <h1>❌ Error</h1>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', background: 'white', minHeight: '100vh' }}>
      <h1>🎉 RewordEmail - Minimal Test</h1>
      
      <div style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0', borderRadius: '8px' }}>
        <h3>Authentication Status:</h3>
        <p><strong>User:</strong> {currentUser ? '✅ Logged in' : '❌ Not logged in'}</p>
        {currentUser && (
          <>
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>Name:</strong> {currentUser.displayName}</p>
            <p><strong>UID:</strong> {currentUser.uid}</p>
          </>
        )}
      </div>

      <div style={{ margin: '2rem 0' }}>
        {!currentUser ? (
          <button 
            onClick={signInWithGoogle}
            style={{ 
              padding: '1rem 2rem', 
              fontSize: '16px', 
              backgroundColor: '#4285f4', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign in with Google
          </button>
        ) : (
          <button 
            onClick={logout}
            style={{ 
              padding: '1rem 2rem', 
              fontSize: '16px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        )}
      </div>

      {currentUser && (
        <div style={{ border: '1px solid green', padding: '1rem', borderRadius: '8px' }}>
          <h3>✅ Success!</h3>
          <p>Authentication is working perfectly. You can now add back the Firestore integration.</p>
        </div>
      )}
    </div>
  )
}

export default App

import { useState } from 'react';
import { useAuth } from '../contexts/StableAuthContext';
import { signUpWithEmail, signInWithEmail } from '../firebase';

export default function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signInWithGoogle } = useAuth();

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (error) {
      console.error('Email auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h3>{isSignUp ? 'Create Account' : 'Sign In'}</h3>
          <button className="auth-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="auth-modal-content">
          {/* Google Sign In */}
          <button 
            onClick={handleGoogleSignIn}
            className="auth-google-btn"
            disabled={loading}
          >
            <span>🔍</span>
            Continue with Google
          </button>

          <div className="or-divider">
            <div className="line"></div>
            <span className="or-text">or</span>
            <div className="line"></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="auth-form">
            <div className="auth-input-group">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="auth-input"
              />
            </div>
            
            <div className="auth-input-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="auth-input"
                minLength={6}
              />
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Toggle between sign in and sign up */}
          <div className="auth-toggle">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button 
                  onClick={() => setIsSignUp(false)}
                  className="auth-toggle-btn"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button 
                  onClick={() => setIsSignUp(true)}
                  className="auth-toggle-btn"
                >
                  Create Account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

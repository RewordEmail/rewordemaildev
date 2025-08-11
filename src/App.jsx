import { useState, useEffect } from 'react'
import { useAuth } from './contexts/StableAuthContext'
import Subscription from './components/Subscription'
import AuthModal from './components/AuthModal'



function App() {
  const [originalEmail, setOriginalEmail] = useState('')
  const [formalizedEmail, setFormalizedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [showCopiedMessage, setShowCopiedMessage] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [copyButtonPressed, setCopyButtonPressed] = useState(false)
  const [anonymousUsage, setAnonymousUsage] = useState(0) // Track anonymous usage
  const [showAuthModal, setShowAuthModal] = useState(false)
  const authContext = useAuth()
  
  // Load anonymous usage from localStorage
  useEffect(() => {
    const savedAnonymousUsage = localStorage.getItem('anonymousEmailUsage') || '0';
    setAnonymousUsage(parseInt(savedAnonymousUsage, 10));
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Auth context changed:', {
      currentUser: authContext?.currentUser ? 'Logged in' : 'Not logged in',
      userData: authContext?.userData ? 'Loaded' : 'Not loaded',
      loading: authContext?.loading
    })
    
    // Additional debugging for userData
    if (authContext?.userData) {
      console.log('User data details:', {
        usageCount: authContext.userData.usageCount,
        subscriptionStatus: authContext.userData.subscriptionStatus,
        email: authContext.userData.email
      })
    }
  }, [authContext])
  
  // Safety check for auth context
  if (!authContext) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🔄 Loading authentication...</h1>
    </div>
  }
  
  const { currentUser, userData, updateUsageCount } = authContext
  
  // Show loading state while auth is initializing
  if (authContext.loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🔄 Initializing...</h1>
      <p>Setting up your session...</p>
    </div>
  }

  // Show loading state while user data is being fetched
  if (currentUser && !userData) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🔄 Loading your account...</h1>
      <p>Setting up your free generations...</p>
    </div>
  }

  const resetGeneration = () => {
    setOriginalEmail('')
    setFormalizedEmail('')
    setIsGenerated(false)
    setShowCopiedMessage(false)
    setCopyButtonPressed(false)
  }

  const handleSubscribeAction = () => {
    if (!currentUser) {
      // If not logged in, prompt to login first
      alert('Please sign in first to subscribe to Email+');
      return;
    }
    
    // If logged in, trigger the subscription flow
    // This will use the existing subscription component logic
    const subscribeBtn = document.querySelector('.subscribe-btn');
    if (subscribeBtn) {
      subscribeBtn.click();
    } else {
      alert('Please use the subscription button in the header to upgrade to Email+');
    }
  }

  const handleLoginPrompt = () => {
    setShowAuthModal(true);
  }



  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(formalizedEmail);
      setCopyButtonPressed(true);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 4000);
      // Keep the button pressed state for 4 seconds
      setTimeout(() => setCopyButtonPressed(false), 4000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  const formalizeEmail = async () => {
    if (!originalEmail.trim()) return
    
    // Check if user can generate
    if (currentUser && userData && userData.subscriptionStatus === 'free' && userData.usageCount >= 3) {
      alert('You have used all your free generations. Please upgrade to continue.');
      return;
    }
    
    if (!currentUser && anonymousUsage >= 1) {
      alert('You have used your free generation. Please sign in to get 3 total free generations!');
      return;
    }
    
    setIsLoading(true)
    


    try {
      // All users (anonymous and logged in) use the real API
      const requestBody = currentUser 
        ? { email: originalEmail, userId: currentUser.uid }
        : { email: originalEmail, isAnonymous: true };

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/formalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Failed to formalize email')
      }

      const data = await response.json()
      setFormalizedEmail(data.formalizedEmail)
      setIsGenerated(true);
      
      // Scroll to show the generated content
      setTimeout(() => {
        const outputCard = document.querySelector('.output-card');
        if (outputCard) {
          outputCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
      
      // Update usage count
      if (currentUser && userData) {
        const newCount = userData.usageCount + 1;
        updateUsageCount(newCount);
      } else if (data.isAnonymous) {
        // Track anonymous usage
        const newAnonymousUsage = anonymousUsage + 1;
        setAnonymousUsage(newAnonymousUsage);
        localStorage.setItem('anonymousEmailUsage', newAnonymousUsage.toString());
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to formalize email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const canGenerate = () => {
    if (!currentUser) {
      // Anonymous users can generate if they haven't used their free generation
      return anonymousUsage < 1;
    }
    if (!userData) {
      return false; // Can't generate while loading user data
    }
    // Logged in users get 3 free generations total (including anonymous usage)
    const totalUsage = (userData.usageCount || 0) + anonymousUsage;
    const subscriptionStatus = userData.subscriptionStatus || 'free';
    return subscriptionStatus === 'premium' || totalUsage < 3;
  };

  const isOutOfGenerations = () => {
    if (!currentUser) {
      // Anonymous users are out of generations if they've used their free one
      return anonymousUsage >= 1;
    }
    if (!userData) {
      return false; // Not out of generations while loading
    }
    // Check total usage (logged in + anonymous)
    const totalUsage = (userData.usageCount || 0) + anonymousUsage;
    const subscriptionStatus = userData.subscriptionStatus || 'free';
    return subscriptionStatus === 'free' && totalUsage >= 3;
  };

  const getUsageText = () => {
    if (!currentUser) {
      const remaining = Math.max(0, 1 - anonymousUsage);
      return `${remaining} free generation${remaining !== 1 ? 's' : ''} remaining, sign in to get 3 total`;
    }
    if (!userData) {
      return 'Loading your account...';
    }
    
    // Safety check for usageCount - default to 0 if undefined/null/NaN
    let usageCount = userData.usageCount;
    if (usageCount === undefined || usageCount === null || isNaN(usageCount)) {
      usageCount = 0;
    }
    
    const subscriptionStatus = userData.subscriptionStatus || 'free';
    
    if (subscriptionStatus === 'premium') {
      // Debug logging
      console.log('App component userData:', userData);
      console.log('subscriptionEndDate in App:', userData.subscriptionEndDate);
      console.log('subscriptionEndDate type in App:', typeof userData.subscriptionEndDate);
      
      // Check if subscription is cancelled but still active
      let endDateObj = null;
      
      if (userData.subscriptionEndDate) {
        // Handle Firebase Timestamp objects
        if (userData.subscriptionEndDate.toDate) {
          // It's a Firebase Timestamp
          endDateObj = userData.subscriptionEndDate.toDate();
          console.log('App: Firebase Timestamp detected, converted to:', endDateObj);
        } else if (userData.subscriptionEndDate.seconds) {
          // It's a Firebase Timestamp with seconds
          endDateObj = new Date(userData.subscriptionEndDate.seconds * 1000);
          console.log('App: Firebase Timestamp with seconds detected, converted to:', endDateObj);
        } else {
          // Try regular Date parsing
          endDateObj = new Date(userData.subscriptionEndDate);
          console.log('App: Regular Date parsing result:', endDateObj);
        }
      }
      
      const currentDate = new Date();
      
      console.log('App: Raw subscriptionEndDate:', userData.subscriptionEndDate);
      console.log('App: Parsed endDateObj:', endDateObj);
      console.log('App: Current date:', currentDate);
      console.log('App: Date comparison result:', endDateObj && endDateObj > currentDate);
      
      if (userData.subscriptionEndDate && endDateObj && endDateObj > currentDate) {
        // Use the already converted endDateObj instead of parsing again
        const formattedDate = endDateObj.toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
        console.log('App: Setting cancelled subscription text:', `Unlimited generations - Until ${formattedDate}`);
        return `Unlimited generations - Until ${formattedDate}`;
      }
      console.log('App: Setting active subscription text: Unlimited generations');
      return 'Unlimited generations';
    }
    
    // Calculate remaining including anonymous usage
    const totalUsage = usageCount + anonymousUsage;
    const remaining = Math.max(0, 3 - totalUsage);
    
    return `${remaining} free generation${remaining !== 1 ? 's' : ''} remaining, sign up for free to unlock more`;
  };

  return (
    <div>
      <header>
        <div className="container">
          <div className="logo">
            <img src="/src/assets/RewordEmailLogo.png" alt="RewordEmail Logo" className="logo-image" />
          </div>
          <Subscription />
        </div>
      </header>

      <main>
        <div className="container">
          {/* Input Section */}
          <section className="input-section" aria-label="Email Input">
            <h1>Remix your Email</h1>
            
            <div className="email-input-container">
              <label htmlFor="email-input" className="sr-only">Email to formalize</label>
              <textarea
                id="email-input"
                value={originalEmail}
              onChange={(e) => {
                if (!isGenerated) {
                  setOriginalEmail(e.target.value);
                  // Auto-resize the pill box smoothly
                  e.target.style.height = 'auto';
                  const newHeight = Math.min(Math.max(e.target.scrollHeight, 32), 300);
                  e.target.style.height = newHeight + 'px';
                }
              }}
              placeholder="Paste your casual email in here..."
              className="textarea"
              disabled={isGenerated}
              style={{ 
                resize: 'none',
                width: '100%'
              }}
            />

            </div>
            
            <div className="usage-info">
              {getUsageText()}
            </div>

            <button
              key="generate-email-btn"
              onClick={isGenerated ? resetGeneration : isOutOfGenerations() ? (currentUser ? handleSubscribeAction : handleLoginPrompt) : formalizeEmail}
              disabled={!isGenerated && !isOutOfGenerations() && (!canGenerate() || isLoading || !originalEmail.trim())}
              className={`transform-btn ${isOutOfGenerations() ? 'subscribe-state' : ''}`}
            >
              {isGenerated 
                ? 'New Generation' 
                : isLoading 
                  ? 'Generating...' 
                  : isOutOfGenerations()
                    ? (currentUser ? 'Subscribe to Email+' : 'Sign in for more')
                    : !originalEmail.trim()
                      ? 'Waiting...' 
                      : 'Generate Email'}
            </button>

            {showCopiedMessage && (
              <div className="copied-message">
                ✅ Email copied to clipboard!
              </div>
            )}
          </section>

          {/* Output Section - Separate Container */}
          {formalizedEmail && (
            <div className="output-section">
              <div className="output-card">
                <div className="output-header">
                  <h3 className="output-title">Formalized Email</h3>
                  <button
                    onClick={handleCopyClick}
                    className={`copy-btn ${copyButtonPressed ? 'copy-btn-pressed' : ''}`}
                  >
                    {copyButtonPressed ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="output-content">{formalizedEmail}</div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Auth Modal for Sign In */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
      
      {/* Bottom spacer for breathing room */}
      <div className="bottom-spacer"></div>
    </div>
  )
}

export default App

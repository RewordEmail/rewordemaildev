import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/StableAuthContext';
import { loadStripe } from '@stripe/stripe-js';
import AuthModal from './AuthModal';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Subscription = () => {
  const { currentUser, userData, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSubscribe = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          email: currentUser.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { id } = await response.json();
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: id });

      if (error) {
        console.error('Stripe error:', error);
        alert('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    console.log('Manage subscription clicked. User data:', userData);
    
    if (!currentUser) {
      alert('Please sign in to manage your subscription.');
      return;
    }
    
    if (!userData?.stripeCustomerId && !userData?.subscriptionId) {
      alert('No active subscription found. Please contact support if you believe this is an error.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to open subscription management. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    console.log('Sign in button clicked, setting modal to true');
    setShowAuthModal(true);
    console.log('Modal state after setting:', showAuthModal);
  };

  const handleReinstateSubscription = async () => {
    console.log('Reinstate subscription clicked');
    
    if (!currentUser) {
      alert('Please sign in to reinstate your subscription.');
      return;
    }
    
    setIsLoading(true);
    try {
      // Redirect to Stripe checkout to create a new subscription
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          email: currentUser.email,
          isReinstating: true, // Flag to indicate this is a reinstatement
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { id } = await response.json();
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: id });

      if (error) {
        console.error('Stripe error:', error);
        alert('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to reinstate subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.account-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  if (!currentUser) {
    console.log('No current user, showing sign in button. Modal state:', showAuthModal);
    return (
      <>
        <div className="subscription-section">
          <button onClick={handleSignIn} className="signin-btn">
            Sign In
          </button>
        </div>
        
        {/* Auth Modal for Sign In */}
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </>
    );
  }

  const isPremium = userData?.subscriptionStatus === 'premium';
  const usageCount = userData?.usageCount || 0;
  
  // Debug logging
  console.log('Subscription component userData:', userData);
  console.log('subscriptionEndDate:', userData?.subscriptionEndDate);
  console.log('subscriptionEndDate type:', typeof userData?.subscriptionEndDate);
  
  // Check if premium user has cancelled subscription
  let endDateObj = null;
  
  if (userData?.subscriptionEndDate) {
    // Handle Firebase Timestamp objects
    if (userData.subscriptionEndDate.toDate) {
      // It's a Firebase Timestamp
      endDateObj = userData.subscriptionEndDate.toDate();
      console.log('Firebase Timestamp detected, converted to:', endDateObj);
    } else if (userData.subscriptionEndDate.seconds) {
      // It's a Firebase Timestamp with seconds
      endDateObj = new Date(userData.subscriptionEndDate.seconds * 1000);
      console.log('Firebase Timestamp with seconds detected, converted to:', endDateObj);
    } else {
      // Try regular Date parsing
      endDateObj = new Date(userData.subscriptionEndDate);
      console.log('Regular Date parsing result:', endDateObj);
    }
  }
  
  const currentDate = new Date();
  
  console.log('Raw subscriptionEndDate:', userData?.subscriptionEndDate);
  console.log('Parsed endDateObj:', endDateObj);
  console.log('Current date:', currentDate);
  console.log('Date comparison result:', endDateObj && endDateObj > currentDate);
  
  const hasCancelledSubscription = userData?.subscriptionEndDate && endDateObj && endDateObj > currentDate;
  console.log('hasCancelledSubscription:', hasCancelledSubscription);
  
  let generationsLeft;
  if (isPremium) {
    if (hasCancelledSubscription) {
      // Use the already converted endDateObj instead of parsing again
      const formattedDate = endDateObj.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      generationsLeft = `Unlimited Generations - Until ${formattedDate}`;
      console.log('Setting cancelled subscription text:', generationsLeft);
    } else {
      generationsLeft = 'Unlimited Generations';
      console.log('Setting active subscription text:', generationsLeft);
    }
  } else {
    generationsLeft = Math.max(0, 3 - usageCount);
    console.log('Setting free plan text:', generationsLeft);
  }

  return (
    <div className="subscription-section">
      <div className="subscription-info">
        <span className="plan-text">
          {isPremium ? '👑 Premium Plan' : 'Free Plan'}
        </span>
        {!isPremium && (
          <span className="generations-text">
            {generationsLeft} generations left
          </span>
        )}
      </div>
      
      <div className="subscription-actions">
        {!isPremium && (
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="subscribe-btn"
          >
            {isLoading ? 'Loading...' : 'Upgrade to Email+'}
          </button>
        )}
        
        {isPremium && hasCancelledSubscription && (
          <button
            onClick={handleReinstateSubscription}
            disabled={isLoading}
            className="reinstate-btn"
          >
            {isLoading ? 'Loading...' : 'Reinstate Subscription'}
          </button>
        )}
        
        <div className="account-dropdown">
          <button 
            onClick={() => setShowDropdown(!showDropdown)} 
            className="account-icon-btn"
            aria-label="Account menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
            </svg>
          </button>
          
          {showDropdown && (
            <div className="dropdown-menu">
              <button 
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="dropdown-item"
              >
                {isLoading ? 'Loading...' : 'Manage Subscription'}
              </button>
              <button 
                onClick={logout} 
                className="dropdown-item"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Subscription; 
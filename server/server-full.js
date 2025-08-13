const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const OpenAI = require('openai');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firebase Admin
try {
  // Use environment variables instead of JSON file for Vercel deployment
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  console.log('✅ Firebase Admin initialized with environment variables');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.log('🔧 Running without Firebase - some features will be limited');
}

const db = admin.firestore();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Webhook endpoint needs raw body - must come BEFORE express.json()
app.use('/api/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      firebase: !!admin.apps.length
    }
  });
});

// Email formalization endpoint
app.post('/api/formalize', async (req, res) => {
  try {
    const { email, userId, isAnonymous } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email content is required' });
    }

    // Handle anonymous users (no userId required, but track differently)
    if (isAnonymous) {
      // For anonymous users, we'll track by IP or session (simplified approach)
      // In production, you might want to use a more sophisticated tracking method
      console.log('Anonymous user generating email');
      
      // Generate the email using OpenAI (GPT-3.5-turbo for anonymous users)
      const prompt = `Transform this casual email into professional, business-appropriate language while maintaining the original meaning and intent:

Original: ${email}

Please provide only the formalized version without any explanations or additional text.`;

      console.log('Anonymous user using GPT-3.5-turbo');

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional email writing assistant. Transform casual emails into formal, business-appropriate language while preserving the original meaning and intent."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const formalizedEmail = completion.choices[0].message.content.trim();
      
      res.json({ formalizedEmail, isAnonymous: true });
      return;
    }

    // Handle authenticated users
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required. Please sign in to generate emails.' });
    }

    // Check user limits for authenticated users
    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Database not available' });
    }

    let userData;
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      userData = userDoc.data();
      
      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (userData.subscriptionStatus === 'free' && userData.usageCount >= 3) {
        return res.status(403).json({ error: 'Usage limit exceeded. Please upgrade to Email+ for unlimited generations.' });
      }
    } catch (firebaseError) {
      console.error('Firebase check failed:', firebaseError.message);
      return res.status(500).json({ error: 'Failed to verify user limits' });
    }

    const prompt = `Transform this casual email into professional, business-appropriate language while maintaining the original meaning and intent:

Original: ${email}

Please provide only the formalized version without any explanations or additional text.`;

    // Use GPT-4o Mini for premium users, GPT-3.5-turbo for free users
    const model = userData.subscriptionStatus === 'premium' ? 'gpt-4o-mini' : 'gpt-3.5-turbo';
    console.log(`Using ${model} for user ${userId} (${userData.subscriptionStatus})`);

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a professional email writing assistant. Transform casual emails into formal, business-appropriate language while preserving the original meaning and intent."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const formalizedEmail = completion.choices[0].message.content.trim();

    // Update usage count if Firebase is available
    if (userId && admin.apps.length) {
      try {
        await db.collection('users').doc(userId).update({
          usageCount: admin.firestore.FieldValue.increment(1),
          lastUsed: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (firebaseError) {
        console.warn('Failed to update usage count:', firebaseError.message);
      }
    }

    res.json({ formalizedEmail });
  } catch (error) {
    console.error('Error formalizing email:', error);
    res.status(500).json({ error: 'Failed to formalize email' });
  }
});







// Create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userId, email, isReinstating } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'User ID and email are required' });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase not configured' });
    }

    // Create or retrieve Stripe customer
    let customer;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(userData.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          firebaseUserId: userId
        }
      });

      // Save Stripe customer ID to Firestore
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customer.id
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'RewordEmail Premium',
              description: 'Unlimited email formalization',
            },
            unit_amount: 299, // £2.99 in pence
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}&reinstated=${isReinstating ? 'true' : 'false'}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        firebaseUserId: userId
      }
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook handler
app.post('/api/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        let userId = subscription.metadata.firebaseUserId;
        
        // If no userId in subscription metadata, try to get it from the customer
        if (!userId && subscription.customer) {
          try {
            const customer = await stripe.customers.retrieve(subscription.customer);
            userId = customer.metadata.firebaseUserId;
          } catch (err) {
            console.error('Error retrieving customer:', err);
          }
        }
        
        if (userId && admin.apps.length) {
          let subscriptionStatus = 'free';
          let subscriptionEndDate = null;
          
          if (subscription.status === 'active') {
            subscriptionStatus = 'premium';
            // Check if subscription is cancelled but still active until period end
            if (subscription.cancel_at_period_end === true) {
              // Try different approaches to get the end date
              if (subscription.current_period_end) {
                subscriptionEndDate = new Date(subscription.current_period_end * 1000);
              } else if (subscription.created) {
                // Calculate end date from creation + 1 month (since it's monthly)
                const createdDate = new Date(subscription.created * 1000);
                subscriptionEndDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // +30 days
              }
            } else {
              // New active subscription (not cancelled) - clear any end date
              subscriptionEndDate = null;
            }
          } else if (subscription.status === 'canceled') {
            subscriptionStatus = 'premium'; // Still premium until period ends
            // Calculate end date from current period end
            if (subscription.current_period_end) {
              subscriptionEndDate = new Date(subscription.current_period_end * 1000);
            }
          }
          
          await db.collection('users').doc(userId).update({
            subscriptionStatus: subscriptionStatus,
            subscriptionId: subscription.id,
            subscriptionEndDate: subscriptionEndDate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          if (subscriptionEndDate) {
            console.log(`✅ Updated subscription for user ${userId} to premium (cancelled) - ends ${subscriptionEndDate}`);
          } else if (subscription.status === 'canceled') {
            console.log(`✅ Updated subscription for user ${userId} to premium (cancelled) - ends ${subscriptionEndDate}`);
          } else {
            console.log(`✅ Updated subscription for user ${userId} to ${subscriptionStatus}`);
          }
        } else {
          console.log(`❌ No userId found for subscription ${subscription.id}`);
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        let deletedUserId = deletedSubscription.metadata.firebaseUserId;
        
        // If no userId in subscription metadata, try to get it from the customer
        if (!deletedUserId && deletedSubscription.customer) {
          try {
            const customer = await stripe.customers.retrieve(deletedSubscription.customer);
            deletedUserId = customer.metadata.firebaseUserId;
          } catch (err) {
            console.error('Error retrieving customer for deleted subscription:', err);
          }
        }
        
        if (deletedUserId && admin.apps.length) {
          await db.collection('users').doc(deletedUserId).update({
            subscriptionStatus: 'free',
            subscriptionId: null,
            subscriptionEndDate: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`✅ Downgraded user ${deletedUserId} to free after subscription cancellation`);
        } else {
          console.log(`❌ No userId found for deleted subscription ${deletedSubscription.id}`);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Create Stripe Customer Portal session
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { userId, customerId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase not configured' });
    }

    // Get user data from Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    let stripeCustomerId = customerId || userData.stripeCustomerId;

    // If no customer ID provided, try to get it from subscription
    if (!stripeCustomerId && userData.subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(userData.subscriptionId);
        stripeCustomerId = subscription.customer;
        
        // Update Firebase with the customer ID if we found it
        if (stripeCustomerId) {
          await db.collection('users').doc(userId).update({
            stripeCustomerId: stripeCustomerId
          });
        }
      } catch (err) {
        console.error('Error retrieving subscription:', err);
      }
    }

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer ID found' });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}`,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
    });

    console.log(`✅ Created portal session for user ${userId}, customer ${stripeCustomerId}`);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Force add subscription end date to Firebase
app.post('/api/force-add-end-date', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase not configured' });
    }

    // Calculate end date (September 10, 2025)
    const endDate = new Date('2025-09-10T15:49:33.000Z');
    
    // Force update Firebase with the end date
    await db.collection('users').doc(userId).update({
      subscriptionEndDate: endDate,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Force added subscription end date to Firebase for user ${userId}: ${endDate}`);
    
    res.json({
      success: true,
      message: 'End date added to Firebase',
      subscriptionEndDate: endDate
    });
  } catch (error) {
    console.error('Error adding end date:', error);
    res.status(500).json({ error: 'Failed to add end date' });
  }
});

// Manually update subscription data for testing
app.post('/api/update-subscription-data', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase not configured' });
    }

    // Get user data from Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    if (userData.subscriptionId) {
      try {
        // Get subscription from Stripe with expanded data
        const subscription = await stripe.subscriptions.retrieve(userData.subscriptionId, {
          expand: ['latest_invoice']
        });
        
        console.log('Stripe subscription data:', {
          id: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: subscription.current_period_end,
          current_period_start: subscription.current_period_start,
          created: subscription.created,
          trial_end: subscription.trial_end
        });
        
        let subscriptionEndDate = null;
        if (subscription.cancel_at_period_end === true) {
          // Try different approaches to get the end date
          if (subscription.current_period_end) {
            subscriptionEndDate = new Date(subscription.current_period_end * 1000);
          } else if (subscription.created) {
            // Calculate end date from creation + 1 month (since it's monthly)
            const createdDate = new Date(subscription.created * 1000);
            subscriptionEndDate = new Date(createdDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // +30 days
          }
        }
        
        // Update Firebase with correct data
        await db.collection('users').doc(userId).update({
          subscriptionEndDate: subscriptionEndDate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Manually updated subscription data for user ${userId}, end date: ${subscriptionEndDate}`);
        
        res.json({
          success: true,
          subscriptionEndDate: subscriptionEndDate,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end,
          currentPeriodStart: subscription.current_period_start,
          subscriptionStatus: subscription.status
        });
      } catch (err) {
        console.error('Error retrieving subscription from Stripe:', err);
        res.status(500).json({ error: 'Failed to retrieve subscription from Stripe' });
      }
    } else {
      res.status(400).json({ error: 'No subscription ID found' });
    }
  } catch (error) {
    console.error('Error updating subscription data:', error);
    res.status(500).json({ error: 'Failed to update subscription data' });
  }
});

// Check current subscription status from Stripe
app.post('/api/check-subscription-status', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase not configured' });
    }

    // Get user data from Firebase
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    console.log('Firebase user data:', userData);
    let stripeStatus = 'unknown';

    // Check subscription status in Stripe
    if (userData.subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(userData.subscriptionId);
        stripeStatus = subscription.status;
        console.log(`✅ Stripe subscription status for ${userId}: ${stripeStatus}`);
      } catch (err) {
        console.error('Error retrieving subscription from Stripe:', err);
        stripeStatus = 'error';
      }
    }

    res.json({
      firebaseStatus: userData.subscriptionStatus || 'free',
      stripeStatus: stripeStatus,
      subscriptionId: userData.subscriptionId,
      stripeCustomerId: userData.stripeCustomerId
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

// Get user subscription status
app.get('/api/user/:userId/subscription', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!admin.apps.length) {
      return res.json({
        subscriptionStatus: 'free',
        usageCount: 0,
        stripeCustomerId: null
      });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    res.json({
      subscriptionStatus: userData.subscriptionStatus || 'free',
      usageCount: userData.usageCount || 0,
      stripeCustomerId: userData.stripeCustomerId,
      subscriptionEndDate: userData.subscriptionEndDate,
      subscriptionId: userData.subscriptionId
    });
  } catch (error) {
    console.error('Error getting user subscription:', error);
    res.status(500).json({ error: 'Failed to get user subscription' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔥 Firebase: ${admin.apps.length ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});

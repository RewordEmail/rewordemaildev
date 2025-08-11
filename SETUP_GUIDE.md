# 🚀 RewordEmail Complete Setup Guide

This guide will help you set up your email formalizer with all real services: Firebase, Stripe, and OpenAI.

## 📋 Prerequisites

- ✅ OpenAI API Key (already configured)
- 🔄 Firebase Project Setup
- 🔄 Stripe Account Setup
- 🔄 Domain Configuration (rewordemail.com)

## 🔥 Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it "rewordemail" or similar
4. Enable Google Analytics (optional)
5. Wait for project creation

### 1.2 Enable Authentication
1. In Firebase Console → Authentication → Sign-in method
2. Enable "Google" provider
3. Add your domain: `rewordemail.com` and `localhost`
4. Note your Web API Key and Auth Domain

### 1.3 Setup Firestore Database
1. In Firebase Console → Firestore Database
2. Click "Create database"
3. Start in **production mode**
4. Choose your preferred location
5. Create collection called `users`

### 1.4 Setup Firebase Admin (Backend)
1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `firebase-service-account.json`
5. Place it in your `/server/` directory

### 1.5 Get Firebase Config
1. Project Settings → General → Your apps
2. Click Web app icon (</>)
3. Register app as "rewordemail-web"
4. Copy the config object

## 💳 Step 2: Stripe Setup

### 2.1 Create Stripe Account
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create account or sign in
3. Complete business verification

### 2.2 Get API Keys
1. Developers → API Keys
2. Copy **Publishable key** (starts with `pk_`)
3. Copy **Secret key** (starts with `sk_`)

### 2.3 Setup Webhooks
1. Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://rewordemail.com/api/webhook`
3. Events to send:
   - `customer.subscription.created`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
4. Copy the **Webhook Secret** (starts with `whsec_`)

### 2.4 Create Product
1. Products → Add Product
2. Name: "RewordEmail Premium"
3. Pricing: £2.99/month recurring
4. Copy the **Price ID** (starts with `price_`)

## 🔧 Step 3: Configure Environment Variables

### 3.1 Frontend Environment (.env in /src/)
```bash
# Create /src/.env file
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 3.2 Backend Environment (/server/.env)
```bash
# OpenAI (already configured)
OPENAI_API_KEY=sk-proj-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase
FIREBASE_PROJECT_ID=your-project-id

# Server
PORT=3001
CLIENT_URL=https://rewordemail.com
```

## 📝 Step 4: Update Configuration Files

### 4.1 Update Firebase Config
Edit `/src/firebase.js`:
```javascript
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)
```

### 4.2 Update Stripe Integration
Edit `/src/components/Subscription.jsx` to use real Stripe keys.

## 🌐 Step 5: Domain & Hosting Setup

### 5.1 Build for Production
```bash
# Frontend
cd /Users/danielwalpole/email-formalizer/src
npm run build

# Backend
cd /Users/danielwalpole/email-formalizer/server
# Ensure all dependencies are installed
npm install
```

### 5.2 Deploy to Hosting
**Option A: Vercel (Recommended)**
1. Install Vercel CLI: `npm i -g vercel`
2. In project root: `vercel`
3. Configure domain: `vercel domains add rewordemail.com`

**Option B: GoDaddy Hosting**
1. Upload built files to GoDaddy hosting
2. Configure Node.js app for backend
3. Set up SSL certificate

### 5.3 Update Redirect URIs
1. Firebase Console → Authentication → Settings
2. Add authorized domains: `rewordemail.com`
3. Update Google OAuth settings if needed

## 🧪 Step 6: Testing Checklist

### 6.1 Local Testing
- [ ] Frontend loads without errors
- [ ] Google sign-in works
- [ ] Email generation works with OpenAI
- [ ] Stripe checkout creates sessions
- [ ] Webhooks receive events (use ngrok for local testing)

### 6.2 Production Testing
- [ ] Domain resolves correctly
- [ ] SSL certificate works
- [ ] All authentication flows work
- [ ] Payment processing works
- [ ] Email generation works
- [ ] Usage limits enforce correctly

## 🔧 Troubleshooting

### Common Issues:
1. **CORS errors**: Ensure Firebase has correct authorized domains
2. **Stripe webhook failures**: Verify endpoint URL and webhook secret
3. **Firebase permissions**: Check Firestore security rules
4. **OpenAI rate limits**: Monitor usage and upgrade plan if needed

## 📞 Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [OpenAI Documentation](https://platform.openai.com/docs)

---

## 🚀 Quick Start Commands

```bash
# Start development servers
cd /Users/danielwalpole/email-formalizer/server && node simple-server.js &
cd /Users/danielwalpole/email-formalizer/src && npm run dev

# Build for production
npm run build

# Deploy
vercel --prod
```

Once you complete these steps, your RewordEmail app will be fully functional with real authentication, payments, and AI processing!

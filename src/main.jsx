import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  FacebookAuthProvider 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase with error handling
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Try to get existing app if initialization fails
  try {
    const { getApp } = await import('firebase/app');
    app = getApp();
    console.log('Using existing Firebase app');
  } catch (e) {
    console.error('Could not get existing Firebase app:', e);
    throw new Error('Failed to initialize Firebase');
  }
}

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Set auth persistence
try {
  await setPersistence(auth, browserLocalPersistence);
  console.log('Auth persistence set to LOCAL');
} catch (error) {
  console.warn('Failed to set auth persistence:', error);
}

// Initialize Facebook provider
export const facebookProvider = new FacebookAuthProvider();
// Add the Instagram Graph API permissions
facebookProvider.addScope('instagram_basic');
facebookProvider.addScope('pages_show_list');
facebookProvider.addScope('instagram_manage_insights');

export { auth, db, app as firebaseApp };

// Get the root element
const container = document.getElementById('root');

if (!container) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(container);

// Render the app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

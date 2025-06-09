// Firebase configuration - replace these values with your actual Firebase config
// These values should be set in your environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID // Optional, only if you use Analytics
};

// App ID for Firestore paths
const appId = import.meta.env.VITE_APP_ID || 'local-dev-app';

// For development purposes only - enable Google sign-in
// Make sure to enable Google sign-in in your Firebase Authentication settings
const enableGoogleSignIn = import.meta.env.VITE_ENABLE_GOOGLE_SIGN_IN !== 'false'; // Defaults to true

export { firebaseConfig, appId, enableGoogleSignIn };

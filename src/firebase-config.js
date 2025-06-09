// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// App ID for your application
const appId = import.meta.env.VITE_APP_ID || 'instaconnect-app';

// Enable Google Sign-In
const enableGoogleSignIn = import.meta.env.VITE_ENABLE_GOOGLE_SIGN_IN === 'true';

export { firebaseConfig, appId, enableGoogleSignIn };

/// <reference types="vite/client" />

// Import environment variables for TypeScript support
declare namespace NodeJS {
  interface ImportMetaEnv {
    VITE_FIREBASE_API_KEY: string;
    VITE_FIREBASE_AUTH_DOMAIN: string;
    VITE_FIREBASE_PROJECT_ID: string;
    VITE_FIREBASE_STORAGE_BUCKET: string;
    VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    VITE_FIREBASE_APP_ID: string;
    VITE_FIREBASE_MEASUREMENT_ID?: string;
    VITE_APP_ID: string;
    VITE_ENABLE_GOOGLE_SIGN_IN: string;
  }
}

// Global variables for Canvas environment
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string | null;

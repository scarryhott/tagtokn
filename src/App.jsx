import React, { createContext, Suspense, useContext } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Loader2 } from 'lucide-react';
import { auth, db, facebookProvider } from './main';
import TokenomicsUI from './components/TokenomicsUI';

// Create context for Firebase
const FirebaseContext = createContext(null);

// Custom hook to use Firebase
export const useFirebase = () => {
  const firebase = useContext(FirebaseContext);
  if (!firebase) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return firebase;
};

// Firebase provider component
const FirebaseProvider = ({ children }) => {
  return (
    <FirebaseContext.Provider value={{ auth, db, facebookProvider }}>
      {children}
    </FirebaseContext.Provider>
  );
};

// Error fallback component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" className="p-4 max-w-2xl mx-auto mt-10 bg-red-50 rounded-lg">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <pre className="mt-2 text-sm text-red-600">{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Suspense fallback={<LoadingFallback />}>
        <FirebaseProvider>
          <div className="min-h-screen bg-gray-50">
            <TokenomicsUI />
          </div>
        </FirebaseProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;

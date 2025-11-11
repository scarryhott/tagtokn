import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleInstagramCallback } from '../services/instagramAuth';

const InstagramCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Connecting to Instagram...');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Function to clear all auth state
  const clearAuthState = () => {
    // Clear both storage locations for thorough cleanup
    localStorage.removeItem('oauth_state');
    sessionStorage.removeItem('instagram_oauth_state');
    sessionStorage.removeItem('preOAuthUrl');
    sessionStorage.removeItem('connect_redirect');
    
    console.log('Cleared all auth state from storage');
  };

  // Function to handle retry logic
  const handleRetry = () => {
    // Clear any stored state and redirect to connect page
    localStorage.removeItem('oauth_state');
    sessionStorage.removeItem('instagram_oauth_state');
    window.location.href = '/connect-instagram';
  };

  useEffect(() => {
    const processCallback = async () => {
      // Log all URL parameters for debugging
      const params = Object.fromEntries(searchParams.entries());
      console.log('Instagram callback URL parameters:', params);
      
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorReason = searchParams.get('error_reason');;
      const errorDescription = searchParams.get('error_description');

      // Clean up the URL by removing the OAuth response parameters and #_=_ fragment
      if (window.history.replaceState) {
        // Remove the fragment if it's just #_=_
        if (window.location.hash === '#_=_') {
          // Remove the fragment without causing a page reload
          window.history.replaceState(
            '', 
            document.title, 
            window.location.pathname + window.location.search
          );
        } else if (window.location.search) {
          // Just clean the parameters but keep the fragment if it's not #_=_
          const cleanUrl = window.location.pathname + (window.location.hash || '');
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
      
      // Check for OAuth errors first
      if (error) {
        const errorMessage = `OAuth Error: ${errorDescription || errorReason || error}`;
        console.error(errorMessage);
        setError(errorMessage);
        clearAuthState();
        return;
      }

      if (!code || !state) {
        const errorMessage = 'Missing required authentication parameters. Please try again.';
        console.error(errorMessage, { code, state });
        setError(errorMessage);
        clearAuthState();
        return;
      }
      
      console.log('Processing OAuth callback with state:', state.substring(0, 8) + '...');

      try {
        setStatus('Verifying authentication...');
        
        // Log all storage for debugging
        console.log('Session storage:', JSON.stringify(sessionStorage, null, 2));
        console.log('Local storage:', JSON.stringify(localStorage, null, 2));
        
        // Get the state from sessionStorage
        const sessionState = sessionStorage.getItem('instagram_oauth_state');
        
        if (!sessionState) {
          throw new Error('No active OAuth session found. The session may have expired or the page was refreshed. Please try again.');
        }
        
        // Verify the state matches
        if (sessionState !== state) {
          console.error('State mismatch:', {
            stored: sessionState,
            received: state,
            sessionStorage: JSON.stringify(sessionStorage, null, 2)
          });
          throw new Error('Invalid session state. Possible CSRF attempt or expired session.');
        }

        // Check if we have an expiration time
        const expiresAt = sessionStorage.getItem('instagram_oauth_expires');
        if (expiresAt && Date.now() > parseInt(expiresAt, 10)) {
          clearAuthState();
          throw new Error('Session expired. Please try again.');
        }

        // Call the backend to exchange the code for a token
        setStatus('Finalizing connection...');
        const result = await handleInstagramCallback(code, state);

        if (result && result.error) {
          throw new Error(result.error);
        }

        // Clear the stored state on success
        localStorage.removeItem('oauth_state');
        sessionStorage.removeItem('instagram_oauth_state');

        // Redirect to the dashboard or previous page
        const redirectTo = localStorage.getItem('preOAuthUrl') || sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
        localStorage.removeItem('preOAuthUrl');
        sessionStorage.removeItem('redirectAfterLogin');
        
        console.log('Authentication successful, redirecting to:', redirectTo);
        window.location.href = redirectTo;

      } catch (err) {
        console.error('Error in Instagram callback:', err);
        
        // Format error message for display
        let errorMessage = err.message || 'An error occurred during authentication';
        
        // Handle specific error cases
        if (errorMessage.includes('state') && errorMessage.includes('mismatch')) {
          errorMessage = 'Security validation failed. The connection attempt could not be verified.';
          
          // Auto-retry once if it's a state mismatch
          if (retryCount === 0) {
            console.log('Retrying Instagram connection...');
            setRetryCount(1);
            // Small delay before retry
            setTimeout(() => {
              handleRetry();
            }, 1000);
            return;
          }
        }
        
        setError(errorMessage);
        
        // Store the error in session storage
        sessionStorage.setItem('instagramAuthError', errorMessage);
      }
    };

    processCallback();
    
    // Cleanup function in case component unmounts
    return () => {
      // Clear any stored state if needed
    };
  }, [searchParams, navigate, retryCount]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {error ? 'Connection Error' : 'Connecting to Instagram...'}
          </h2>
          
          <div className="mt-4">
            {error ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {error}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    This error usually occurs when:
                  </p>
                  <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                    <li>The connection attempt took too long and timed out</li>
                    <li>You've already connected this account</li>
                    <li>There was an issue with the authentication process</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="text-gray-600">{status}</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 space-y-4">
            <button
              onClick={handleRetry}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Try Connecting Again
            </button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500 mt-2">
                Still having trouble?{' '}
                <a 
                  href="/support" 
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Contact support
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstagramCallback;

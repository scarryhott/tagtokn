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
    localStorage.removeItem('oauth_state');
    sessionStorage.removeItem('instagram_oauth_state');
    sessionStorage.removeItem('connect_redirect');
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
        
        // First check sessionStorage (more reliable for OAuth flows)
        const sessionState = sessionStorage.getItem('instagram_oauth_state');
        const storedStateData = localStorage.getItem('oauth_state');
        
        console.log('Stored state information:', {
          sessionState: sessionState ? `FOUND (${sessionState.substring(0, 8)}...)` : 'NOT FOUND',
          storedState: storedStateData ? 'FOUND' : 'NOT FOUND',
          receivedState: state.substring(0, 8) + '...',
          url: window.location.href
        });

        // Log all sessionStorage keys for debugging
        console.log('Session storage keys:', Object.keys(sessionStorage));
        console.log('Local storage keys:', Object.keys(localStorage));

        // Verify state from sessionStorage first (most reliable)
        if (!sessionState) {
          // Check if we have a stored state in localStorage as fallback
          if (!storedStateData) {
            throw new Error('No active OAuth session found. The session may have expired. Please try again.');
          }
          
          // Try to parse the stored state
          let storedStateObj;
          try {
            storedStateObj = JSON.parse(storedStateData);
          } catch (e) {
            console.error('Error parsing stored state:', e);
            throw new Error('Invalid session data. Please try again.');
          }
          
          // Verify the state matches
          if (storedStateObj.state !== state) {
            throw new Error('Invalid session state. Possible CSRF attempt or expired session.');
          }
          
          // Check if state has expired
          if (storedStateObj.expiresAt && Date.now() > storedStateObj.expiresAt) {
            clearAuthState();
            throw new Error('Session expired. Please try again.');
          }
        } else if (sessionState !== state) {
          // State from sessionStorage doesn't match
          throw new Error('Invalid session state. Possible CSRF attempt or expired session.');
        }

        // Check if state has expired
        if (storedStateObj.expiresAt && Date.now() > storedStateObj.expiresAt) {
          // Clear expired state
          localStorage.removeItem('oauth_state');
          sessionStorage.removeItem('instagram_oauth_state');
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

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleInstagramCallback } from '../services/instagramAuth';

const InstagramCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Connecting to Instagram...');
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

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
      const errorReason = searchParams.get('error_reason');
      const errorDescription = searchParams.get('error_description');
      
      // Check for OAuth errors first
      if (error) {
        const errorMessage = `OAuth Error: ${errorDescription || errorReason || error}`;
        console.error(errorMessage);
        setError(errorMessage);
        return;
      }

      if (!code || !state) {
        const errorMessage = 'Missing required parameters. Please try again.';
        console.error(errorMessage, { code, state });
        setError(errorMessage);
        return;
      }

      try {
        setStatus('Verifying authentication...');
        
        // Get the stored state from localStorage or sessionStorage
        const storedState = localStorage.getItem('oauth_state') || sessionStorage.getItem('instagram_oauth_state');
        if (!storedState) {
          throw new Error('No OAuth state found. The session may have expired. Please try again.');
        }

        let storedStateObj;
        try {
          storedStateObj = JSON.parse(storedState);
        } catch (e) {
          console.error('Error parsing stored state:', e);
          throw new Error('Invalid session data. Please try again.');
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">
          {error ? 'Connection Failed' : 'Connecting Instagram'}
        </h1>
        
        {error ? (
          <div className="space-y-4">
            <div className="p-4 text-red-700 bg-red-50 rounded-md">
              <p className="font-medium">Error: {error}</p>
              <p className="mt-2 text-sm">
                Please try again or contact support if the issue persists.
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-center text-gray-600">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstagramCallback;

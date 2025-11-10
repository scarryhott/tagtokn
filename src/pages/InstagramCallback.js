import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleInstagramCallback } from '../services/instagramAuth';

const InstagramCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Connecting to Instagram...');
  const [error, setError] = useState(null);

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
      
      // Handle OAuth errors from Instagram
      if (error) {
        const errorMessage = errorDescription || errorReason || error;
        const errorMsg = `Instagram authentication failed: ${errorMessage}`;
        console.error(errorMsg, { error, errorReason, errorDescription });
        setError(errorMsg);
        // Redirect to error page or login page with error
        navigate('/login', { state: { error: errorMsg } });
        return;
      }
      
      if (!code) {
        const errMsg = 'Missing authorization code in the callback URL';
        console.error(errMsg);
        setError(errMsg);
        navigate('/login', { state: { error: errMsg } });
        return;
      }
      
      if (!state) {
        const errMsg = 'Missing state parameter in the callback URL. Please try connecting your Instagram account again.';
        console.error(errMsg, { urlParams: Object.fromEntries(searchParams.entries()) });
        setError(errMsg);
        navigate('/login', { 
          state: { 
            error: 'Connection failed',
            errorDescription: 'Missing required authentication parameters. Please try connecting your Instagram account again.'
          } 
        });
        return;
      }

      try {
        setStatus('Authenticating with Instagram...');
        
        // Handle the Instagram OAuth callback with both code and state
        const result = await handleInstagramCallback(code, state);
        
        if (result.success && result.token) {
          console.log('Successfully authenticated with Instagram', result);
          setStatus('Success! Redirecting...');
          
          // Redirect to the stored URL or dashboard
          const redirectTo = result.redirectUrl || sessionStorage.getItem('redirectAfterLogin') || '/';
          console.log('Redirecting to:', redirectTo);
          window.location.href = redirectTo;
        } else {
          const errorMsg = result.error || 'Failed to authenticate with Instagram';
          console.error('Authentication failed:', errorMsg);
          throw new Error(errorMsg);
        }
      } catch (err) {
        console.error('Error in Instagram callback:', err);
        
        // Handle state parameter errors specifically
        if (err.message.includes('state parameter') || err.message.includes('CSRF')) {
          const errorMsg = 'Security validation failed. Please try connecting your Instagram account again.';
          console.error('State validation error:', errorMsg);
          setError(errorMsg);
          navigate('/login', { 
            state: { 
              error: 'Security Check Failed',
              errorDescription: 'The connection attempt could not be verified. This might be due to an expired session or a security issue. Please try again.'
            } 
          });
          return;
        }
        const errorMessage = err.message || 'An error occurred during authentication';
        setError(errorMessage);
        
        // Store the error in session storage
        sessionStorage.setItem('instagramAuthError', errorMessage);
        
        // Redirect to login with error message
        const loginUrl = `/login?error=${encodeURIComponent(errorMessage)}`;
        if (window.location.pathname !== loginUrl) {
          window.location.href = loginUrl;
        }
      }
    };

    processCallback();
    
    // Cleanup function in case component unmounts
    return () => {
      // Clear any stored state
      sessionStorage.removeItem('instagram_oauth_user_id');
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {error ? 'Connection Failed' : status.includes('Success') ? 'Connected!' : 'Connecting to Instagram'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {status}
          </p>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
              <p className="font-medium">Error:</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
              >
                Try again
              </button>
            </div>
          )}

          {!error && (
            <div className="mt-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramCallback;

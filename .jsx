import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleInstagramCallback } from '../services/instagramAuth';
import { auth } from '../firebase';

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
        return;
      }
      
      if (!code) {
        const errMsg = 'Missing authorization code in the callback URL';
        console.error(errMsg);
        setError(errMsg);
        return;
      }
      
      if (!state) {
        const errMsg = 'Missing state parameter in the callback URL';
        console.error(errMsg);
        setError(errMsg);
        return;
      }

      try {
        setStatus('Authenticating with Instagram...');
        
        // Handle the Instagram OAuth callback with both code and state
        const result = await handleInstagramCallback(code, state);
        
        if (result.token) {
          // If we got a token, sign in with it
          setStatus('Signing in with your Instagram account...');
          await auth.signInWithCustomToken(result.token);
          
          setStatus('Success! Your Instagram account has been connected.');
          // Redirect to dashboard after a short delay
          setTimeout(() => navigate('/dashboard?instagram_connected=true'), 1500);
        } else if (result.error) {
          // Handle API error response
          throw new Error(result.details || result.error || 'Failed to connect to Instagram');
        } else {
          // Unexpected response format
          throw new Error('Unexpected response from authentication service');
        }
      } catch (err) {
        console.error('Error in Instagram callback:', err);
        setError(err.message || 'An error occurred during authentication');
        
        // If it's an auth error, redirect to login
        if (err.code?.startsWith('auth/')) {
          const currentUrl = window.location.href;
          navigate(`/login?redirect_uri=${encodeURIComponent(currentUrl)}`);
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

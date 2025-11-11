import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { connectInstagram } from '../services/instagramAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ConnectInstagramPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const checkInstagramConnection = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has instagramId in their profile
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.instagramId || userData.instagramAccountId) {
            setIsConnected(true);
          }
        }
      } catch (err) {
        console.error('Error checking Instagram connection:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkInstagramConnection();
  }, [currentUser]);

  const handleConnect = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const { popup } = await connectInstagram();
      
      if (!popup) {
        throw new Error('Could not open authentication window. Please allow popups for this site.');
      }
      
      // Check if the popup was closed by the user
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setIsLoading(false);
          
          // Check if the authentication was successful
          const success = localStorage.getItem('instagram_auth_success');
          if (success) {
            localStorage.removeItem('instagram_auth_success');
            // Redirect to dashboard after successful connection
            navigate('/dashboard');
          }
        }
      }, 500);
      
    } catch (error) {
      console.error('Error initiating Instagram login:', error);
      setError(error.message || 'Failed to connect to Instagram. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking Instagram connection status...</p>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Instagram Connected</h2>
          <p className="mt-2 text-gray-600">Your Instagram account is successfully connected.</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Connect Your Instagram</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your Instagram account to start earning tokens for your engagement.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium text-white ${
              isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors duration-200`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
                </svg>
                Continue with Facebook
              </>
            )}
          </button>
          
          <p className="text-xs text-center text-gray-500 px-4">
            We'll redirect you through Facebook Login to link your Instagram account. 
            We will never post without your permission.
          </p>
          
          <p className="text-xs text-center text-gray-500">
            Don't have an Instagram account?{' '}
            <a 
              href="https://www.instagram.com/accounts/emailsignup/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Sign up
            </a>
          </p>
          
          <p className="text-xs text-center text-gray-400 mt-4">
            By connecting, you agree to our{' '}
            <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectInstagramPage;

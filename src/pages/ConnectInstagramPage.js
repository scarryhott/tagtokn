import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { connectInstagram } from '../services/instagramAuth';

const ConnectInstagramPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser !== undefined) {
      setIsLoading(false);
    }
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
          <p className="mt-4 text-gray-600">Loading account information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {currentUser?.instagramId ? 'Reconnect Instagram' : 'Connect Instagram'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Click the button below to connect your Instagram account.
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white ${
              isLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
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
                {currentUser?.instagramId ? 'Reconnect with Facebook' : 'Connect with Facebook'}
              </>
            )}
          </button>
          
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

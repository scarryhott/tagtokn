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
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isConnected ? 'Instagram Connected' : 'Connect Your Instagram Account'}
            </h2>
            <p className="text-gray-600 mb-8">
              {isConnected 
                ? 'Your Instagram account is connected via Instagram Basic Display API.' 
                : 'Connect your personal Instagram account using Instagram Basic Display API.'}
            </p>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    We use Instagram Basic Display API to securely connect to your personal Instagram account. No Facebook account or business verification required.
                  </p>
                </div>
              </div>
            </div>
            
            {isConnected ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5 mr-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    {isLoading ? 'Connecting...' : 'Connect with Instagram Basic Display'}
                  </button>
                </div>
                
                <div className="mt-6 text-center text-sm text-gray-500">
                  <p>We'll ask for permission to access your profile info and media.</p>
                  <p className="mt-1">Your login information is secure and private.</p>
                </div>
                
                <div className="mt-4 text-center">
                  <button
                    onClick={() => navigate(-1)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Back to previous page
                  </button>
                </div>
              </div>
            )}
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
            <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Connect Your Instagram</h2>
          <p className="mt-2 text-gray-600">
            Connect your personal Instagram account using Instagram Basic Display API.
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
                Continue with Instagram Basic Display
              </>
            )}
          </button>
          
          <p className="text-xs text-center text-gray-500 px-4">
            We'll redirect you through Instagram Basic Display API to link your Instagram account. 
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

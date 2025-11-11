import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Instagram } from 'lucide-react';
import { connectInstagram } from '../services/instagramAuth';

const InstagramLogin = ({ 
  onSuccess, 
  onFailure, 
  buttonText, 
  render,
  showInModal = false,
  onModalClose = () => {},
  user = {}
}) => {
  // Set default button text based on whether user has an Instagram ID
  const defaultButtonText = user?.instagramId 
    ? 'Reconnect Instagram' 
    : 'Connect with Instagram';
    
  buttonText = buttonText || defaultButtonText;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = () => {
    setIsLoading(true);
    setError(null);
    
    // Don't use async/await since we're redirecting
    console.log('Initiating Instagram connection...');
    
    // Call connectInstagram directly - it will handle the redirect
    connectInstagram()
      .then(() => {
        // This will only run if there's an error (since successful connect will redirect)
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error initiating Instagram login:', error);
        const errorMessage = error.message || 'Failed to connect to Instagram';
        setError(errorMessage);
        onFailure && onFailure(error);
        setIsLoading(false);
      });
  };

  if (render) {
    return render({ onClick: handleLogin, loading: isLoading, error });
  }

  // Info box about Basic Display API
  const infoBox = (
    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-blue-700">
            We use Instagram Basic Display API to securely connect to your personal Instagram account.
            No Facebook account or business verification required.
          </p>
        </div>
      </div>
    </div>
  );

  // If we're in a modal, show the full modal content
  if (showInModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Connect Instagram</h3>
            <button
              onClick={onModalClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mt-4">
            {infoBox}
            
            <p className="text-sm text-gray-500 mb-4">
              Connect your personal Instagram account using Instagram Basic Display API.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              <svg className="h-5 w-5 mr-2 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              {isLoading ? 'Connecting...' : buttonText}
            </button>
            
            <p className="mt-3 text-xs text-center text-gray-500">
              We'll ask for permission to access your profile info and media.
              Your login information is secure and private.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default non-modal button
  return (
    <div className="w-full">
      {infoBox}
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 ${className}`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {buttonText}
          </>
        ) : (
          <>
            <Instagram className="h-5 w-5 mr-2" />
            {buttonText}
          </>
        )}
      </button>
      
      <p className="mt-2 text-xs text-center text-gray-500">
        Using Instagram Basic Display API
      </p>
    </div>
  );
};

InstagramLogin.propTypes = {
  onSuccess: PropTypes.func,
  onFailure: PropTypes.func,
  render: PropTypes.func,
  buttonText: PropTypes.string,
  user: PropTypes.object
};

export default InstagramLogin;

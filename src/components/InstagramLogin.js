import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Instagram } from 'lucide-react';
import { connectInstagram } from '../services/instagramAuth';

const InstagramLogin = ({ onSuccess, onFailure, buttonText = 'Connect Instagram via Facebook', render }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Initiating Instagram connection...');
      // This will redirect to Instagram OAuth
      await connectInstagram();
      // Note: connectInstagram will redirect, so code after this won't run unless there's an error
    } catch (error) {
      console.error('Error initiating Instagram login:', error);
      const errorMessage = error.message || 'Failed to connect to Instagram';
      setError(errorMessage);
      onFailure && onFailure(error);
      setIsLoading(false);
    }
  };

  if (render) {
    return render({ onClick: handleLogin, loading: isLoading, error });
  }

  return (
    <div className="instagram-login text-center">
      <p className="mb-3 text-sm text-gray-600">
        We use Facebook Login to securely connect your Instagram account.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className={`flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity ${
          isLoading ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <Instagram className="w-4 h-4" />
            {buttonText}
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

InstagramLogin.propTypes = {
  onSuccess: PropTypes.func,
  onFailure: PropTypes.func,
  render: PropTypes.func,
  buttonText: PropTypes.string
};

export default InstagramLogin;

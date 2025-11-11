import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Instagram } from 'lucide-react';
import { connectInstagram } from '../services/instagramAuth';

const InstagramBusinessConnect = ({ 
  onSuccess, 
  onFailure, 
  buttonText, 
  render,
  showInModal = false,
  onModalClose = () => {},
  user = {},
  className = ''
}) => {
  const defaultButtonText = user?.instagramId 
    ? 'Reconnect Instagram Business Account (NEW)' 
    : 'Connect Instagram Business Account (NEW)';
    
  buttonText = buttonText || defaultButtonText;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = () => {
    setIsLoading(true);
    setError(null);
    
    console.log('Initiating Instagram connection...');
    
    connectInstagram()
      .then(() => {
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

  const helpText = !user?.instagramId && (
    <p className="mt-2 text-sm text-gray-500">
      Note: Only Instagram Business or Creator accounts can be connected.
    </p>
  );

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
            We use Instagram Graph API to securely connect to your Instagram Business or Creator account.
            A Facebook Business account is required to connect your Instagram account.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {showInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Connect Instagram Business</h3>
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
                Connect your Instagram Business or Creator account using Instagram Graph API.
                This requires a linked Facebook Business account.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Instagram className="w-5 h-5 mr-2" />
                    {buttonText}
                  </>
                )}
              </button>
              
              {helpText}
            </div>
          </div>
        </div>
      )}
      
      {!showInModal && (
        <div>
          {infoBox}
          
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <Instagram className="w-5 h-5 mr-2" />
                {buttonText}
              </>
            )}
          </button>
          
          {helpText}
        </div>
      )}
    </div>
  );
};

InstagramBusinessConnect.propTypes = {
  onSuccess: PropTypes.func,
  onFailure: PropTypes.func,
  render: PropTypes.func,
  buttonText: PropTypes.string,
  showInModal: PropTypes.bool,
  onModalClose: PropTypes.func,
  user: PropTypes.object,
  className: PropTypes.string
};

export default InstagramBusinessConnect;

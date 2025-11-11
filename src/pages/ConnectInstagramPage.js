import React, { useState, useEffect } from 'react';
import InstagramLogin from '../components/InstagramLogin';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ConnectInstagramPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showConnectButton, setShowConnectButton] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    // Wait for auth state to be determined
    if (currentUser !== undefined) {
      setIsLoading(false);
      setShowConnectButton(true);
    }
  }, [currentUser]);

  const handleSuccess = (response) => {
    console.log('Instagram connection successful:', response);
    // Redirect to dashboard after successful connection
    navigate('/dashboard');
  };

  const handleFailure = (error) => {
    console.error('Instagram connection failed:', error);
    setShowConnectButton(true);
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
            {currentUser?.instagramId ? 'Reconnect Instagram Account' : 'Connect Your Instagram Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {currentUser?.instagramId 
              ? 'Reconnect your Instagram account to continue.'
              : 'Connect your Instagram account to get started.'}
          </p>
        </div>

        {showConnectButton && (
          <div className="mt-8">
            <InstagramLogin 
              user={currentUser}
              onSuccess={handleSuccess}
              onFailure={handleFailure}
              showInModal={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectInstagramPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged as firebaseAuthStateChanged } from 'firebase/auth';
import InstagramFeed from '../components/InstagramFeed';
import InstagramLogin from '../components/InstagramLogin';

const InstagramFeedPage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = firebaseAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate, auth]);

  const handleLoginSuccess = () => {
    // Refresh the page to show the feed
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Your Instagram Feed</h1>
          <InstagramLogin 
            onSuccess={handleLoginSuccess}
            buttonText="Refresh Feed"
            className="w-auto"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <InstagramFeed />
        </div>
      </div>
    </div>
  );
};

export default InstagramFeedPage;

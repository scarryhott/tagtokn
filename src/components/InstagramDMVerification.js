import React, { useState, useEffect } from 'react';
import { startDMVerification, checkVerificationStatus } from '../services/instagramDMVerification';
import { useAuth } from '../contexts/AuthContext';
import { Copy, Check, AlertCircle } from 'lucide-react';

const InstagramDMVerification = ({ onSuccess, onError }) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'verifying' | 'verified' | 'error'
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 1 hour in seconds
  const [copied, setCopied] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const startVerification = async () => {
      try {
        setStatus('verifying');
        const result = await startDMVerification(currentUser.uid);
        setCode(result.code);
        setStatus('pending');
      } catch (error) {
        console.error('Error starting verification:', error);
        setError('Failed to start verification. Please try again.');
        setStatus('error');
        onError?.(error);
      }
    };

    startVerification();
  }, [currentUser.uid, onError]);

  useEffect(() => {
    if (status !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== 'pending') return;

    const checkStatus = async () => {
      try {
        const result = await checkVerificationStatus(currentUser.uid);
        
        if (result.status === 'verified') {
          setStatus('verified');
          onSuccess?.({
            instagramUsername: result.instagramUsername,
            instagramUserId: result.instagramUserId
          });
        } else if (result.status === 'expired') {
          setStatus('expired');
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [status, currentUser.uid, onSuccess]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700">Preparing verification...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <div className="flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>{error || 'An error occurred. Please try again.'}</p>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg">
        <p className="text-yellow-700">Verification code has expired. Please refresh the page to get a new code.</p>
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="p-4 bg-green-50 rounded-lg">
        <div className="flex items-center text-green-700">
          <Check className="w-5 h-5 mr-2" />
          <p>Successfully verified with Instagram!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Verify with Instagram</h3>
      <p className="text-gray-600 mb-4">
        To verify your Instagram account, please send the following code via direct message to @YourInstagramHandle:
      </p>
      
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md mb-4">
        <code className="text-2xl font-mono font-bold text-gray-800">{code}</code>
        <button
          onClick={handleCopyCode}
          className="ml-4 p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <Copy className="w-5 h-5" />
          )}
        </button>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Code expires in: {formatTime(timeLeft)}</span>
        <span className="animate-pulse text-blue-500">Verifying...</span>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h4 className="font-medium text-blue-800 mb-2">How to verify:</h4>
        <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm">
          <li>Open Instagram on your phone</li>
          <li>Go to Direct Messages</li>
          <li>Find @YourInstagramHandle in your messages</li>
          <li>Send the code above as a direct message</li>
        </ol>
      </div>
    </div>
  );
};

export default InstagramDMVerification;

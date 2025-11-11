import { db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

// Generate a random 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const startDMVerification = async (userId) => {
  try {
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Code expires in 1 hour

    const verificationData = {
      code,
      userId,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
      verifiedAt: null,
      instagramUsername: null,
      instagramUserId: null
    };

    // Store the verification data in Firestore
    const verificationRef = doc(db, 'instagramVerifications', userId);
    await setDoc(verificationRef, verificationData);

    return {
      success: true,
      code,
      expiresAt: verificationData.expiresAt
    };
  } catch (error) {
    console.error('Error starting DM verification:', error);
    throw new Error('Failed to start DM verification');
  }
};

export const checkVerificationStatus = async (userId) => {
  try {
    const verificationRef = doc(db, 'instagramVerifications', userId);
    const docSnap = await getDoc(verificationRef);
    
    if (!docSnap.exists()) {
      return { status: 'not_found' };
    }

    const data = docSnap.data();
    
    // Check if verification has expired
    if (new Date(data.expiresAt) < new Date()) {
      return { status: 'expired' };
    }

    return {
      status: data.status,
      instagramUsername: data.instagramUsername,
      instagramUserId: data.instagramUserId,
      expiresAt: data.expiresAt
    };
  } catch (error) {
    console.error('Error checking verification status:', error);
    throw new Error('Failed to check verification status');
  }
};

// This function will be called by the webhook when a DM is received
export const verifyDMCode = async (code, instagramUsername, instagramUserId) => {
  try {
    // Find the verification by code
    const verificationsRef = collection(db, 'instagramVerifications');
    const q = query(
      verificationsRef,
      where('code', '==', code),
      where('status', '==', 'pending'),
      where('expiresAt', '>', new Date().toISOString())
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Invalid or expired verification code' };
    }

    // Update the verification status
    const verificationDoc = querySnapshot.docs[0];
    await updateDoc(verificationDoc.ref, {
      status: 'verified',
      verifiedAt: serverTimestamp(),
      instagramUsername,
      instagramUserId
    });

    // Update the user's document with Instagram info
    const userRef = doc(db, 'users', verificationDoc.data().userId);
    await updateDoc(userRef, {
      instagram: {
        userId: instagramUserId,
        username: instagramUsername,
        verified: true,
        lastVerified: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    return { success: true, userId: verificationDoc.data().userId };
  } catch (error) {
    console.error('Error verifying DM code:', error);
    throw new Error('Failed to verify DM code');
  }
};

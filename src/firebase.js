import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  TwitterAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRRHERb06oi8x5X8CrCy0WufXYLPgwc5Y",
  authDomain: "tagtokn.firebaseapp.com",
  projectId: "tagtokn",
  storageBucket: "tagtokn.firebasestorage.app",
  messagingSenderId: "1087424771839",
  appId: "1:1087424771839:web:0d01bd2b5beeef78f87eca",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Initialize providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
const twitterProvider = new TwitterAuthProvider();

// Configure scopes if needed
googleProvider.addScope('profile');
googleProvider.addScope('email');
githubProvider.addScope('user:email');

// Common function to handle user data after authentication
const handleUserAuth = async (user, additionalData = {}) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  
  const userData = {
    uid: user.uid,
    displayName: user.displayName || additionalData.displayName || '',
    email: user.email || additionalData.email || '',
    photoURL: user.photoURL || additionalData.photoURL || '',
    // Instagram specific fields
    instagram: additionalData.instagram || null,
    instagramAccessToken: additionalData.instagramAccessToken || null,
    instagramUserId: additionalData.instagramUserId || null,
    instagramUsername: additionalData.instagramUsername || null,
    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    ...additionalData
  };
  
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      tokens: []
    });
    return { user, isNewUser: true };
  } else {
    await updateDoc(userRef, {
      ...userData,
      lastLogin: serverTimestamp()
    });
    return { user, isNewUser: false };
  }
};

// Function to sign in with Google
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await handleUserAuth(result.user);
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Function to sign in with GitHub
const signInWithGitHub = async () => {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    return await handleUserAuth(result.user);
  } catch (error) {
    console.error("Error signing in with GitHub:", error);
    throw error;
  }
};

// Function to sign in with Twitter
const signInWithTwitter = async () => {
  try {
    const result = await signInWithPopup(auth, twitterProvider);
    return await handleUserAuth(result.user, {
      // Twitter doesn't provide email by default
      email: result.user.email || `${result.user.uid}@twitter.com`,
      displayName: result.user.displayName || `Twitter User ${result.user.uid.slice(0, 6)}`
    });
  } catch (error) {
    console.error("Error signing in with Twitter:", error);
    throw error;
  }
};

// Function to sign in with email and password
const signInWithEmailAndPassword = async (email, password) => {
  try {
    const result = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return await handleUserAuth(result.user);
  } catch (error) {
    console.error("Error signing in with email and password:", error);
    throw error;
  }
};

// Function to create a new user with email and password
const createUserWithEmailAndPassword = async (email, password, displayName = '') => {
  try {
    const result = await firebaseCreateUserWithEmailAndPassword(auth, email, password);
    return await handleUserAuth(result.user, { displayName });
  } catch (error) {
    console.error("Error creating user with email and password:", error);
    throw error;
  }
};

// Function to sign out
const signOutUser = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Function to get current user
const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      reject
    );
  });
};

// Function to update Instagram user data
const updateInstagramData = async (userId, instagramData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      instagram: instagramData,
      instagramUserId: instagramData.id,
      instagramUsername: instagramData.username,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating Instagram data:', error);
    throw error;
  }
};

// Function to update user data
const updateUserData = async (userId, data) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating user data:", error);
    throw error;
  }
};

// Export auth methods
export {
  auth,
  db,
  functions,
  httpsCallable,
  // Auth methods
  signInWithGoogle,
  signInWithGitHub,
  signInWithTwitter,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOutUser as signOut,
  // Other utilities
  getCurrentUser,
  updateUserData,
  updateInstagramData,
  onAuthStateChanged,
  // Providers
  googleProvider,
  githubProvider,
  twitterProvider
};

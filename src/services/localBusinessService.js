import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'localBusinesses';

/**
 * Persist a new local business application to Firestore.
 * @param {object} payload - Business details gathered from the verification form.
 * @param {object|null} currentUser - Authenticated Firebase user (if any).
 * @returns {Promise<string>} The Firestore document id.
 */
export const submitLocalBusinessApplication = async (payload, currentUser = null) => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...payload,
    status: 'pending',
    verificationNotes: '',
    ownerUid: currentUser?.uid ?? null,
    ownerEmail: currentUser?.email ?? null,
    ownerDisplayName: currentUser?.displayName ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

/**
 * Subscribe to local business documents ordered by creation date.
 * @param {(businesses: object[]) => void} callback - Handler invoked with the latest data set.
 * @returns {() => void} unsubscribe function from Firestore.
 */
export const subscribeToLocalBusinesses = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const businesses = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(businesses);
  });
};

export const updateLocalBusiness = async (businessId, data) => {
  if (!businessId) throw new Error('businessId is required');
  const businessRef = doc(db, COLLECTION_NAME, businessId);
  await updateDoc(businessRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

/**
 * Update the verification status for a business.
 * @param {string} businessId - Firestore document id.
 * @param {'pending'|'verified'|'rejected'} status - New verification status.
 * @param {object} metadata - Additional data such as verifier notes.
 */
export const updateLocalBusinessStatus = async (
  businessId,
  status,
  metadata = {}
) => {
  const businessRef = doc(db, COLLECTION_NAME, businessId);
  const verificationMetadata = {
    verifierUid: metadata.verifierUid ?? null,
    verifierName: metadata.verifierName ?? null,
    verifierEmail: metadata.verifierEmail ?? null
  };

  if (status === 'verified') {
    verificationMetadata.verifiedAt = serverTimestamp();
  }

  if (status === 'rejected') {
    verificationMetadata.rejectedAt = serverTimestamp();
  }

  await updateDoc(businessRef, {
    status,
    verificationNotes: metadata.notes ?? '',
    verificationMetadata,
    updatedAt: serverTimestamp()
  });
};

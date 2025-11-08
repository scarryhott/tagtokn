import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'tokenTransactions';

const generateNftId = (prefix) => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${randomPart}`;
};

export const createTokenTransaction = async ({
  businessId,
  businessName,
  channel,
  tokenAmount,
  productType,
  itemName,
  description,
  eventDate,
  socialPostUrl
}) => {
  if (!businessId) {
    throw new Error('Business id is required to record a transaction.');
  }

  const buyerNft = {
    id: generateNftId('BUY'),
    mintedAt: serverTimestamp(),
    channel,
    metadata: {
      itemName,
      productType,
      socialPostUrl: socialPostUrl || null
    }
  };

  const sellerNft = {
    id: generateNftId('SELL'),
    mintedAt: serverTimestamp(),
    channel,
    metadata: {
      itemName,
      productType,
      socialPostUrl: socialPostUrl || null
    }
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    businessId,
    businessName,
    channel,
    tokenAmount,
    productType,
    itemName,
    description,
    eventDate: eventDate || null,
    socialPostUrl: socialPostUrl || null,
    buyerNft,
    sellerNft,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    id: docRef.id,
    buyerNft,
    sellerNft
  };
};

export const subscribeToTransactionsByBusiness = (businessId, callback) => {
  if (!businessId) return () => {};
  const q = query(
    collection(db, COLLECTION_NAME),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(transactions);
  });
};

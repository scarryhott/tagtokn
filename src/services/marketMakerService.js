import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION_NAME = 'marketMakers';

const getMarketMakerRef = (businessId) => doc(db, COLLECTION_NAME, businessId);

export const upsertMarketMakerConfig = async (businessId, payload) => {
  if (!businessId) throw new Error('businessId is required');
  await setDoc(
    getMarketMakerRef(businessId),
    {
      ...payload,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const subscribeToMarketMakerConfig = (businessId, callback) => {
  if (!businessId) return () => {};
  return onSnapshot(getMarketMakerRef(businessId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({
      id: snapshot.id,
      ...snapshot.data()
    });
  });
};

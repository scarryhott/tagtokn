import {
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';

const TAGTOKN_DOC_REF = doc(db, 'platformTokens', 'tagtokn');

const defaultTokenDoc = {
  name: 'TagTokn',
  symbol: 'TAG',
  priceUsd: 1,
  totalSupply: 0,
  circulatingSupply: 0,
  totalBought: 0,
  totalEarned: 0,
  treasuryUsd: 0,
  rewardPoolUsd: 0,
  lastLedgerEvent: null
};

const ensureDocumentExists = async () => {
  const snapshot = await getDoc(TAGTOKN_DOC_REF);
  if (!snapshot.exists()) {
    await setDoc(TAGTOKN_DOC_REF, {
      ...defaultTokenDoc,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
};

export const subscribeToTagtoknToken = (callback) => {
  return onSnapshot(TAGTOKN_DOC_REF, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({
      id: snapshot.id,
      ...defaultTokenDoc,
      ...snapshot.data()
    });
  });
};

export const bootstrapTagtoknTokenDocument = async () => {
  await setDoc(
    TAGTOKN_DOC_REF,
    {
      ...defaultTokenDoc,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const updateTagtoknToken = async (data) => {
  await ensureDocumentExists();
  await setDoc(
    TAGTOKN_DOC_REF,
    {
      ...data,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const recordTagtoknPurchase = async ({ tokens, usd, actor }) => {
  const numericTokens = Number(tokens) || 0;
  const numericUsd = Number(usd) || 0;
  if (numericTokens <= 0 || numericUsd < 0) {
    throw new Error('Purchase requires positive token amount and non-negative USD value.');
  }

  await ensureDocumentExists();
  await updateDoc(TAGTOKN_DOC_REF, {
    totalBought: increment(numericTokens),
    totalSupply: increment(numericTokens),
    circulatingSupply: increment(numericTokens),
    treasuryUsd: increment(numericUsd),
    lastLedgerEvent: {
      type: 'buy',
      tokens: numericTokens,
      usd: numericUsd,
      actorUid: actor?.uid ?? null,
      actorDisplayName: actor?.displayName ?? null,
      actorEmail: actor?.email ?? null,
      occurredAt: serverTimestamp()
    },
    updatedAt: serverTimestamp()
  });
};

export const recordTagtoknEarned = async ({ tokens, actor }) => {
  const numericTokens = Number(tokens) || 0;
  if (numericTokens <= 0) {
    throw new Error('Earned records require a positive token amount.');
  }

  await ensureDocumentExists();
  await updateDoc(TAGTOKN_DOC_REF, {
    totalEarned: increment(numericTokens),
    totalSupply: increment(numericTokens),
    circulatingSupply: increment(numericTokens),
    lastLedgerEvent: {
      type: 'earned',
      tokens: numericTokens,
      actorUid: actor?.uid ?? null,
      actorDisplayName: actor?.displayName ?? null,
      actorEmail: actor?.email ?? null,
      occurredAt: serverTimestamp()
    },
    updatedAt: serverTimestamp()
  });
};

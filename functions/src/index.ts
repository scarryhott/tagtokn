import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const platformTokenRef = db.collection('platformTokens').doc('tagtokn');

// Configure CORS
const corsHandler = cors({
  origin: ['https://tagtokn.com', 'http://localhost:3000'],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Create a custom token for the specified UID
export const createCustomToken = functions.https.onRequest((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsHandler(req, res, () => {
      res.status(204).send('');
    });
  }

  // Apply CORS to the request
  return corsHandler(req, res, async () => {
    // Only accept POST requests
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const { uid } = req.body;
      
      if (!uid) {
        res.status(400).json({ error: 'UID is required' });
        return;
      }

      // Generate a custom token for the specified UID
      const token = await admin.auth().createCustomToken(uid);
      
      // Return the custom token
      res.status(200).json({ token });
    } catch (error) {
      console.error('Error creating custom token:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        error: 'Failed to create custom token',
        details: errorMessage
      });
    }
  });
});

interface LiquidityRequestPayload {
  businessId: string;
  amount: number;
  broadcastToCommunity?: boolean;
}

export const requestTagtoknLiquidity = functions.https.onCall(
  async (data: LiquidityRequestPayload, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication is required to request liquidity.'
      );
    }

    const { businessId, amount, broadcastToCommunity } = data;
    if (!businessId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'businessId is required.'
      );
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'amount must be a positive number.'
      );
    }

    const feeRate = 0.025;
    const feeAmount = Number((numericAmount * feeRate).toFixed(2));
    const netAmount = Number((numericAmount - feeAmount).toFixed(2));

    const businessRef = db.collection('localBusinesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Business record does not exist.'
      );
    }

    const businessData = businessSnap.data() || {};
    const isAdmin = context.auth.token?.admin === true;
    if (!isAdmin && businessData.ownerUid !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only the verified business owner can request liquidity.'
      );
    }

    if (!isAdmin && (businessData.status ?? 'pending') !== 'verified') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Business must be verified before requesting liquidity.'
      );
    }

    await db.runTransaction(async (tx) => {
      const platformSnap = await tx.get(platformTokenRef);
      if (!platformSnap.exists) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Platform token document is missing.'
        );
      }
      const platformData = platformSnap.data() || {};
      const availableTreasury = Number(platformData.treasuryUsd) || 0;
      if (availableTreasury < numericAmount) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Insufficient platform liquidity to fulfill this request.'
        );
      }

      tx.update(platformTokenRef, {
        treasuryUsd: admin.firestore.FieldValue.increment(-numericAmount),
        rewardPoolUsd: admin.firestore.FieldValue.increment(feeAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLedgerEvent: {
          type: 'liquidity_loan',
          amount: numericAmount,
          feeAmount,
          businessId,
          approvedBy: context.auth?.uid ?? null,
          occurredAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });

      tx.update(businessRef, {
        'treasury.tagtoknCredit': admin.firestore.FieldValue.increment(netAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const loanRef = db.collection('liquidityLoans').doc();
      tx.set(loanRef, {
        businessId,
        requestedBy: context.auth?.uid ?? null,
        grossAmount: numericAmount,
        netAmount,
        feeAmount,
        status: 'approved',
        broadcastToCommunity: !!broadcastToCommunity,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (broadcastToCommunity) {
        const communityRef = db.collection('communityFundingRequests').doc();
        tx.set(communityRef, {
          businessId,
          loanId: loanRef.id,
          amountNeeded: numericAmount,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'open'
        });
      }
    });

    return {
      status: 'approved',
      netAmount,
      feeAmount
    };
  }
);

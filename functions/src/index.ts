import * as admin from 'firebase-admin';
import * as corsModule from 'cors';
import { Request, Response } from 'express';
import * as functions from 'firebase-functions';

// Using any type to avoid the v2 type error
type CallableContext = any;

// Initialize Firebase Admin SDK with service account
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tagtokn.firebaseio.com'
});
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Import OAuth functions
import { generateOAuthState, exchangeInstagramCode } from './auth/instagram';
import { generateFacebookAuthUrl, handleFacebookCallback } from './auth/facebook';

// Configure CORS
const corsOptions = {
  origin: [
    'https://app.tagtokn.com',
    'https://tagtokn.com',
    'https://tagtokn.web.app',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

const corsHandler = corsModule.default(corsOptions);

const handleCorsPreflight = (req: Request, res: Response) => {
  return corsHandler(req, res, () => {
    res.status(204).send('');
  });
};

const platformTokenRef = db.collection('platformTokens').doc('tagtokn');

// Export Facebook OAuth functions
export { generateFacebookAuthUrl, handleFacebookCallback };

// Create a custom token for the specified UID
export const createCustomToken = functions.https.onRequest((req: Request, res: Response) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, res);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
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

// Type for the liquidity request payload
interface LiquidityRequestPayload {
  businessId: string;
  amount: number;
  broadcastToCommunity?: boolean;
}

export const requestTagtoknLiquidity = functions.https.onCall(
  async (data: unknown, context: CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication is required to request liquidity.'
      );
    }

    const payload = data as LiquidityRequestPayload;
    const { businessId, amount, broadcastToCommunity } = payload;
    
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
    const isAdmin = context?.auth?.token?.admin === true;
    if (!isAdmin && businessData.ownerUid !== context?.auth?.uid) {
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
        treasuryUsd: FieldValue.increment(-numericAmount),
        rewardPoolUsd: FieldValue.increment(feeAmount),
        updatedAt: FieldValue.serverTimestamp(),
        lastLedgerEvent: {
          type: 'liquidity_loan',
          amount: numericAmount,
          feeAmount,
          businessId,
          approvedBy: context?.auth?.uid ?? null,
          occurredAt: FieldValue.serverTimestamp()
        }
      });

      tx.update(businessRef, {
        'treasury.tagtoknCredit': FieldValue.increment(netAmount),
        updatedAt: FieldValue.serverTimestamp()
      });

      const loanRef = db.collection('liquidityLoans').doc();
      tx.set(loanRef, {
        businessId,
        requestedBy: context?.auth?.uid ?? null,
        grossAmount: numericAmount,
        netAmount,
        feeAmount,
        status: 'approved',
        broadcastToCommunity: !!broadcastToCommunity,
        createdAt: FieldValue.serverTimestamp()
      });

      if (broadcastToCommunity) {
        const communityRef = db.collection('communityFundingRequests').doc();
        tx.set(communityRef, {
          businessId,
          loanId: loanRef.id,
          amountNeeded: numericAmount,
          createdAt: FieldValue.serverTimestamp(),
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

// Export all functions
export { generateOAuthState, exchangeInstagramCode };

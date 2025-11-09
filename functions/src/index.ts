import * as admin from 'firebase-admin';
import * as corsModule from 'cors';
import { Request, Response } from 'express';
import { onRequest, onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';

// Initialize Firebase Admin SDK with service account
const serviceAccount = {
  type: 'service_account',
  project_id: 'tagtokn',
  private_key_id: 'a12f803fb718d8448519d67e603e54b77f9a3475',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3WfGvO5+vNCUG\ngZCgBoFVPXmTv4HK9XC4SkIhXBBI1iaF17YN4LLKnAhXcwdRAdI1tqUitT2Ah+PT\nULcDd1TRAwbrXsFuG+svPClwhq+H3KWN+X/+Cf9WnXWzfQ9cY56Romw46T1kuYpG\nGPI2OhUIyz7UIFff4PfCRQg3z2vW+JvF9QyC4mOubQ8RVfQDCPdZM3uJJ4kmph7W\niq3N9pPebZ1nZazT8nM/e3HO7sqJ07TT0W9XFIJXj8bG6lbQBFZ1TdNcefPjemJC\n5SoowCxZMH1NqcLXryOBvqT5fgnA+c8/5jcm4P2rK5tkjmMznKm95GUAb7l9lcES\nvyrxjRZPAgMBAAECggEAFXw3uFYJ90jqpyGFpgrnxZT86yr/dZ4J8Gkwk0zWJ62D\nOXSL7oJh0SDe+rMNrMNu3kEh3A2q6vssNPX6DDDul8jSsGrGdeBVpeUB4iAWRPBp\nLK2LqbmC2fknnWR5Pqqkc+JkQM2sFmKGPoKWgh46RXEzp+iGWO4Oz7gGfNZp3Ph0\n0nAPnCOnnfQgO9BXkliL8M2BP0J/uraYD/WOFgIm6B1NGMhEvQR5Mq2ocPFv6YMz\nZLi/VFp5/Gz4GoM+LvelKvdtl33/EFcVWX4FlJhNrw4GP15YbD6x3m9Sa7yQAQmF\nnby97eF0ujG6CMJUYJsrS5q1fcrHDkSko0jYJIAQ8QKBgQD/n2azfx/5XLiKYhwW\n2KHHTt2358xz8dnbcz+ijVoig2NDD96A5EWwBInIIqIfO4njtf6XNmxkxIQqpuNJ\ndkZ432R1vKVp/HleHEyPvy7tYG/es0LCBoWIFXVyY2U733dN3FNOhsrX+2c43uvk\nITkLzqdcxU6FhlE9nPD2hGnDyQKBgQC3nztah8GGflw+pE7M5F1TmR/TH0OwAJ2A\ncR2Ho/Ng8szQ5tyoYPKj3ZOUi0y7ZuHpjhoMpS11yBpinZf8vJR90RZDmGX5iETN\ntwiVid5gU2MhxcZHYaB7nIhCzMKBaIjef9Zzag9yAkaDjBcLy495vyNYrP8bIK7l\nxppSWipOlVwKBgHyAdtUWJcyejINaJbQ67xDUKMlZ7QrL0QBBsczKbAxDUiVnpUfB\n5u9ERpdjxvLPXOm3yrR7nW+3B2h+wFUXdluI8rUlnKtyfOqJfgDFbWXQgqxFQ06d\nPox5Zyq/np76yHDzzt+AZ2uq1yur59jFFbPag0l8EDKYqRkJR5PKCnmBAoGAVHXg\ntj6VmFPCt1HBcXRC7/2PIU3/D/8MnVVUOvf6eskvL5EJwsY8LjdxkjgzZ6AMY7Ue\npaLt46IXG4C2BTh9JF1PThfR40foMQdJbOZ3xLcGU/AaVsFl3Yj0x4eJaowsq94s\n/PIEPfs+Vs5yooif6yklIhWe2LoL/bPSywAI89cCgYEA660DT0OWzn1MpY3J8B/D\neKegfVVVDcyinvEJMXYEAngimtR1KjBrLuivq6/AVwS5VeZD9JD+zECV3ImEU5bj\n7i3seLEPaCs2tU1JE1v5d3ll8a9KBBHBsgGSbaMXX4mHXDo+wrYsOI2hoJtlmojK\nmVYj6LpxM+SPDl2MQiY1lCg=\n-----END PRIVATE KEY-----',
  client_email: 'firebase-adminsdk-fbsvc@tagtokn.iam.gserviceaccount.com',
  client_id: '111669966274390224405',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40tagtokn.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com'
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: 'https://tagtokn.firebaseio.com'
});
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Import OAuth functions
import { generateOAuthState, exchangeInstagramCode } from './auth/instagram';

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

// Create a custom token for the specified UID
export const createCustomToken = onRequest((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req as Request, res as Response);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Apply CORS to the request
  return corsHandler(req as Request, res as Response, async () => {
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

export const requestTagtoknLiquidity = onCall(
  async (request: CallableRequest<LiquidityRequestPayload>) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Authentication is required to request liquidity.'
      );
    }

    const { businessId, amount, broadcastToCommunity } = request.data;
    
    if (!businessId) {
      throw new HttpsError(
        'invalid-argument',
        'businessId is required.'
      );
    }
    
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new HttpsError(
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
      throw new HttpsError(
        'not-found',
        'Business record does not exist.'
      );
    }

    const businessData = businessSnap.data() || {};
    const isAdmin = request.auth?.token?.admin === true;
    if (!isAdmin && businessData.ownerUid !== request.auth?.uid) {
      throw new HttpsError(
        'permission-denied',
        'Only the verified business owner can request liquidity.'
      );
    }

    if (!isAdmin && (businessData.status ?? 'pending') !== 'verified') {
      throw new HttpsError(
        'failed-precondition',
        'Business must be verified before requesting liquidity.'
      );
    }

    await db.runTransaction(async (tx) => {
      const platformSnap = await tx.get(platformTokenRef);
      if (!platformSnap.exists) {
        throw new HttpsError(
          'failed-precondition',
          'Platform token document is missing.'
        );
      }
      const platformData = platformSnap.data() || {};
      const availableTreasury = Number(platformData.treasuryUsd) || 0;
      if (availableTreasury < numericAmount) {
        throw new HttpsError(
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
          approvedBy: request.auth?.uid ?? null,
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
        requestedBy: request.auth?.uid ?? null,
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

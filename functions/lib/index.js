"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeInstagramCode = exports.generateOAuthState = exports.requestTagtoknLiquidity = exports.createCustomToken = exports.handleFacebookCallback = exports.generateFacebookAuthUrl = void 0;
const admin = __importStar(require("firebase-admin"));
const corsModule = __importStar(require("cors"));
const functions = __importStar(require("firebase-functions"));
// Initialize Firebase Admin SDK with default credentials
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
// Import OAuth functions
const instagram_1 = require("./auth/instagram");
Object.defineProperty(exports, "generateOAuthState", { enumerable: true, get: function () { return instagram_1.generateOAuthState; } });
Object.defineProperty(exports, "exchangeInstagramCode", { enumerable: true, get: function () { return instagram_1.exchangeInstagramCode; } });
const facebook_1 = require("./auth/facebook");
Object.defineProperty(exports, "generateFacebookAuthUrl", { enumerable: true, get: function () { return facebook_1.generateFacebookAuthUrl; } });
Object.defineProperty(exports, "handleFacebookCallback", { enumerable: true, get: function () { return facebook_1.handleFacebookCallback; } });
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
const handleCorsPreflight = (req, res) => {
    return corsHandler(req, res, () => {
        res.status(204).send('');
    });
};
const platformTokenRef = db.collection('platformTokens').doc('tagtokn');
// Create a custom token for the specified UID
exports.createCustomToken = functions.https.onRequest((req, res) => {
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
        }
        catch (error) {
            console.error('Error creating custom token:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            res.status(500).json({
                error: 'Failed to create custom token',
                details: errorMessage
            });
        }
    });
});
exports.requestTagtoknLiquidity = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication is required to request liquidity.');
    }
    const payload = data;
    const { businessId, amount, broadcastToCommunity } = payload;
    if (!businessId) {
        throw new functions.https.HttpsError('invalid-argument', 'businessId is required.');
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'amount must be a positive number.');
    }
    const feeRate = 0.025;
    const feeAmount = Number((numericAmount * feeRate).toFixed(2));
    const netAmount = Number((numericAmount - feeAmount).toFixed(2));
    const businessRef = db.collection('localBusinesses').doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Business record does not exist.');
    }
    const businessData = businessSnap.data() || {};
    const isAdmin = context?.auth?.token?.admin === true;
    if (!isAdmin && businessData.ownerUid !== context?.auth?.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Only the verified business owner can request liquidity.');
    }
    if (!isAdmin && (businessData.status ?? 'pending') !== 'verified') {
        throw new functions.https.HttpsError('failed-precondition', 'Business must be verified before requesting liquidity.');
    }
    await db.runTransaction(async (tx) => {
        const platformSnap = await tx.get(platformTokenRef);
        if (!platformSnap.exists) {
            throw new functions.https.HttpsError('failed-precondition', 'Platform token document is missing.');
        }
        const platformData = platformSnap.data() || {};
        const availableTreasury = Number(platformData.treasuryUsd) || 0;
        if (availableTreasury < numericAmount) {
            throw new functions.https.HttpsError('failed-precondition', 'Insufficient platform liquidity to fulfill this request.');
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
});
//# sourceMappingURL=index.js.map
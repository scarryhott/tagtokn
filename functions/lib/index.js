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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeInstagramCode = exports.generateOAuthState = exports.requestTagtoknLiquidity = exports.createCustomToken = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
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
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://tagtokn.firebaseio.com'
});
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
// Import OAuth functions
const instagram_1 = require("./auth/instagram");
Object.defineProperty(exports, "generateOAuthState", { enumerable: true, get: function () { return instagram_1.generateOAuthState; } });
Object.defineProperty(exports, "exchangeInstagramCode", { enumerable: true, get: function () { return instagram_1.exchangeInstagramCode; } });
// Configure CORS
const corsHandler = (0, cors_1.default)({
    origin: [
        'https://app.tagtokn.com',
        'https://tagtokn.com',
        'http://localhost:3000'
    ]
});
const platformTokenRef = db.collection('platformTokens').doc('tagtokn');
// Create a custom token for the specified UID
exports.createCustomToken = functions.https.onRequest((req, res) => {
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
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication is required to request liquidity.');
    }
    const { businessId, amount, broadcastToCommunity } = data;
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
    const isAdmin = ((_a = context.auth.token) === null || _a === void 0 ? void 0 : _a.admin) === true;
    if (!isAdmin && businessData.ownerUid !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Only the verified business owner can request liquidity.');
    }
    if (!isAdmin && ((_b = businessData.status) !== null && _b !== void 0 ? _b : 'pending') !== 'verified') {
        throw new functions.https.HttpsError('failed-precondition', 'Business must be verified before requesting liquidity.');
    }
    await db.runTransaction(async (tx) => {
        var _a, _b, _c, _d;
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
                approvedBy: (_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) !== null && _b !== void 0 ? _b : null,
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
            requestedBy: (_d = (_c = context.auth) === null || _c === void 0 ? void 0 : _c.uid) !== null && _d !== void 0 ? _d : null,
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
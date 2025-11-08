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
exports.exchangeInstagramCode = exports.generateOAuthState = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const crypto = __importStar(require("crypto"));
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Generates an OAuth state parameter and stores it in Firestore
 */
exports.generateOAuthState = functions.https.onRequest(async (req, res) => {
    // Handle CORS
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }
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
        // Generate a random state string
        const state = crypto.randomBytes(16).toString('hex');
        const stateData = {
            uid,
            state,
            createdAt: admin.firestore.Timestamp.now(),
            used: false
        };
        // Store the state in Firestore with a 1-hour expiration
        await db.collection('oauthStates').doc(state).set(stateData, { merge: true });
        // Clean up old states (older than 1 hour)
        const oneHourAgo = new Date(Date.now() - 3600 * 1000);
        const oldStates = await db.collection('oauthStates')
            .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(oneHourAgo))
            .get();
        const batch = db.batch();
        oldStates.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        res.status(200).json({ state });
    }
    catch (error) {
        console.error('Error generating OAuth state:', error);
        res.status(500).json({
            error: 'Failed to generate OAuth state',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Exchanges an Instagram OAuth code for an access token
 */
exports.exchangeInstagramCode = functions.https.onRequest(async (req, res) => {
    // Handle CORS
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const { code, state } = req.body;
        if (!code || !state) {
            res.status(400).json({ error: 'Code and state are required' });
            return;
        }
        // Verify the state exists and is not used
        const stateDoc = await db.collection('oauthStates').doc(state).get();
        if (!stateDoc.exists) {
            res.status(400).json({ error: 'Invalid state parameter' });
            return;
        }
        const stateData = stateDoc.data();
        if (stateData.used) {
            res.status(400).json({ error: 'State has already been used' });
            return;
        }
        // Mark state as used
        await stateDoc.ref.update({ used: true });
        // Get environment variables with fallbacks
        const appId = process.env.FACEBOOK_APP_ID || process.env.REACT_APP_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.REACT_APP_FACEBOOK_APP_SECRET;
        const redirectUri = process.env.INSTAGRAM_REDIRECT_URI ||
            process.env.REACT_APP_INSTAGRAM_REDIRECT_URI ||
            'http://localhost:3000/auth/instagram/callback';
        if (!appId || !appSecret) {
            throw new Error('Facebook App ID and Secret must be configured');
        }
        // Exchange the code for an access token
        const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: appId,
                client_secret: appSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code: code,
            }),
        });
        if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            throw new Error(`Instagram API error: ${JSON.stringify(error)}`);
        }
        const tokenData = await tokenResponse.json();
        const { access_token: accessToken, user_id: instagramUserId } = tokenData;
        // Get long-lived access token
        const longLivedTokenResponse = await fetch(`https://graph.instagram.com/access_token?` +
            `grant_type=ig_exchange_token&` +
            `client_secret=${appSecret}&` +
            `access_token=${accessToken}`);
        if (!longLivedTokenResponse.ok) {
            const error = await longLivedTokenResponse.json();
            throw new Error(`Failed to get long-lived token: ${JSON.stringify(error)}`);
        }
        const longLivedTokenData = await longLivedTokenResponse.json();
        const longLivedToken = longLivedTokenData.access_token;
        const expiresIn = longLivedTokenData.expires_in || 5184000; // Default to 60 days if not provided
        // Get user profile
        const profileResponse = await fetch(`https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${longLivedToken}`);
        if (!profileResponse.ok) {
            const error = await profileResponse.json();
            throw new Error(`Failed to get user profile: ${JSON.stringify(error)}`);
        }
        const profile = await profileResponse.json();
        // Save the Instagram data to the user's document
        const userRef = db.collection('users').doc(stateData.uid);
        await userRef.set({
            instagram: {
                userId: instagramUserId,
                username: profile.username,
                accountType: profile.account_type,
                mediaCount: profile.media_count,
                accessToken: longLivedToken,
                tokenExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + (expiresIn * 1000)),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            },
        }, { merge: true });
        res.status(200).json({
            success: true,
            userId: instagramUserId,
            username: profile.username,
        });
    }
    catch (error) {
        console.error('Error exchanging Instagram code:', error);
        res.status(500).json({
            error: 'Failed to exchange Instagram code',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
//# sourceMappingURL=instagram.js.map
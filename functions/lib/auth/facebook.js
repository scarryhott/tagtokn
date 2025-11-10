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
exports.handleFacebookCallback = exports.generateFacebookAuthUrl = void 0;
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const corsModule = __importStar(require("cors"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });
// Log environment variables (masking sensitive data)
console.log('Environment Variables:', {
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID ? '***' + String(process.env.FACEBOOK_APP_ID).slice(-4) : 'MISSING',
    FACEBOOK_REDIRECT_URI: process.env.FACEBOOK_REDIRECT_URI || 'MISSING',
    NODE_ENV: process.env.NODE_ENV || 'development'
});
const functions = __importStar(require("firebase-functions"));
const axios_1 = __importDefault(require("axios"));
const allowedOrigins = [
    'https://app.tagtokn.com',
    'https://tagtokn.com',
    'https://tagtokn.web.app',
    'http://localhost:3000'
];
// Configure CORS
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};
const corsHandler = corsModule.default(corsOptions);
const handleCorsPreflight = (req, res) => {
    return corsHandler(req, res, () => {
        res.status(204).send('');
    });
};
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
    // Use the emulator in development
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
        admin.firestore().settings({
            host: 'localhost:8080',
            ssl: false
        });
    }
}
const db = admin.firestore();
// In functions/src/auth/facebook.ts
exports.generateFacebookAuthUrl = functions.https.onRequest((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return handleCorsPreflight(req, res);
    }
    return corsHandler(req, res, async () => {
        try {
            const { uid } = req.body;
            if (!uid) {
                res.status(400).json({ error: 'User ID is required' });
                return;
            }
            // Get config values from environment variables
            const clientId = process.env.FACEBOOK_APP_ID;
            const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
            // Validate required configuration
            if (!clientId || !redirectUri) {
                console.error('Configuration Error:', {
                    clientId: clientId ? 'SET' : 'MISSING',
                    redirectUri: redirectUri ? 'SET' : 'MISSING',
                    allEnvVars: Object.keys(process.env).filter(k => k.includes('FACEBOOK') ||
                        k.includes('FIREBASE') ||
                        k.includes('NODE_ENV'))
                });
                throw new Error('Missing required environment variables');
            }
            console.log('Using configuration:', {
                clientId: '***' + String(clientId).slice(-4),
                redirectUri: redirectUri
            });
            // Generate a random state parameter
            const state = crypto.randomBytes(32).toString('hex');
            const stateRef = db.collection('oauth_states').doc();
            const stateDocId = stateRef.id;
            // Store the state with user ID and expiration (30 minutes from now)
            const stateData = {
                uid,
                state,
                docId: stateDocId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
                used: false
            };
            await stateRef.set(stateData);
            console.log('Generated OAuth state:', {
                state,
                docId: stateDocId,
                uid,
                expiresAt: stateData.expiresAt.toISOString()
            });
            // Create Facebook OAuth URL
            const facebookAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
            facebookAuthUrl.searchParams.append('client_id', clientId);
            facebookAuthUrl.searchParams.append('redirect_uri', redirectUri);
            facebookAuthUrl.searchParams.append('state', state);
            facebookAuthUrl.searchParams.append('response_type', 'code');
            facebookAuthUrl.searchParams.append('scope', 'public_profile,email,instagram_basic,pages_show_list,pages_read_engagement');
            facebookAuthUrl.searchParams.append('auth_type', 'rerequest');
            const responseData = {
                success: true,
                authUrl: facebookAuthUrl.toString(),
                state: state,
                stateDocId: stateDocId
            };
            console.log('Generated Facebook Auth URL:', {
                base: 'https://www.facebook.com/v19.0/dialog/oauth',
                client_id: clientId ? '***' + String(clientId).slice(-4) : 'MISSING',
                redirect_uri: redirectUri,
                state_length: state.length,
                state_prefix: state.substring(0, 8) + '...',
                state_doc_id: stateDocId
            });
            res.json(responseData);
        }
        catch (error) {
            console.error('Error generating Facebook auth URL:', error);
            res.status(500).json({ error: 'Failed to generate authentication URL' });
        }
    });
});
/**
 * Handles the OAuth callback from Facebook
 */
exports.handleFacebookCallback = functions.https.onRequest((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return handleCorsPreflight(req, res);
    }
    return corsHandler(req, res, async () => {
        try {
            const { code, state } = req.query;
            if (!code || !state) {
                res.status(400).json({ error: 'Code and state are required' });
                return;
            }
            // Verify the state parameter
            const stateRef = db.collection('oauth_states').doc(state);
            const stateDoc = await stateRef.get();
            if (!stateDoc.exists) {
                res.status(400).json({ error: 'Invalid state parameter' });
                return;
            }
            const stateData = stateDoc.data();
            // Check if state has already been used
            if (stateData.used) {
                return res.status(400).json({ error: 'State has already been used' });
            }
            // Mark state as used
            await stateRef.update({ used: true });
            if (typeof code !== 'string' || typeof state !== 'string') {
                res.status(400).json({ error: 'Invalid code or state parameter' });
                return;
            }
            // Exchange the authorization code for an access token
            const tokenResponse = await axios_1.default.get('https://graph.facebook.com/v19.0/oauth/access_token', {
                params: {
                    client_id: process.env.FACEBOOK_APP_ID,
                    client_secret: process.env.FACEBOOK_APP_SECRET,
                    redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                    code
                }
            });
            const { access_token: accessToken } = tokenResponse.data;
            // Get user's Facebook profile
            const profileResponse = await axios_1.default.get('https://graph.facebook.com/me', {
                params: {
                    fields: 'id,name,email',
                    access_token: accessToken
                }
            });
            const { id: facebookId, name, email } = profileResponse.data;
            // Here you would typically:
            // 1. Create or update the user in your database
            // 2. Create a Firebase custom token
            // 3. Return the token to the client
            // For now, just return the user info
            res.json({
                success: true,
                user: {
                    facebookId,
                    name,
                    email
                },
                accessToken
            });
            return;
        }
        catch (error) {
            console.error('Error handling Facebook callback:', error);
            res.status(500).json({ error: 'Failed to authenticate with Facebook' });
            return;
        }
    });
});
//# sourceMappingURL=facebook.js.map
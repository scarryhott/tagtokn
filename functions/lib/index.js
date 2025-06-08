import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
// Initialize Firebase Admin SDK
admin.initializeApp();
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
//# sourceMappingURL=index.js.map
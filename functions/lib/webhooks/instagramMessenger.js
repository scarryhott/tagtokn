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
exports.instagramMessengerWebhook = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const verifyWebhook_1 = require("./verifyWebhook");
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Webhook for Instagram Messenger API
exports.instagramMessengerWebhook = functions.https.onRequest(async (req, res) => {
    try {
        // Handle verification request
        if (req.method === 'GET') {
            (0, verifyWebhook_1.verifyWebhookToken)(req, res);
            return;
        }
        // Only accept POST requests for webhook events
        if (req.method !== 'POST') {
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).send(`Method ${req.method} Not Allowed`);
            return;
        }
        // Verify the request signature
        try {
            (0, verifyWebhook_1.verifyRequestSignature)(req);
        }
        catch (error) {
            console.error('Invalid request signature:', error);
            res.status(401).send('Invalid signature');
            return;
        }
        const body = req.body;
        console.log('Webhook received:', JSON.stringify(body, null, 2));
        // Validate webhook body
        if (body.object !== 'instagram') {
            res.status(404).send('Not a valid Instagram webhook');
            return;
        }
        if (!body.entry || !Array.isArray(body.entry)) {
            res.status(400).send('Invalid webhook payload');
            return;
        }
        // Process each entry in the webhook
        try {
            for (const entry of body.entry) {
                if (!entry.messaging || !Array.isArray(entry.messaging))
                    continue;
                for (const messagingEvent of entry.messaging) {
                    try {
                        if (messagingEvent.message) {
                            await handleMessage(messagingEvent);
                        }
                        else if (messagingEvent.postback) {
                            await handlePostback(messagingEvent);
                        }
                    }
                    catch (error) {
                        console.error('Error processing messaging event:', error);
                        // Continue processing other events even if one fails
                    }
                }
            }
            // Acknowledge receipt of the event
            res.status(200).send('EVENT_RECEIVED');
            return;
        }
        catch (error) {
            console.error('Error processing webhook entry:', error);
            if (!res.headersSent) {
                res.status(500).send('Error processing webhook entry');
            }
            return;
        }
    }
    catch (error) {
        console.error('Unexpected error in webhook handler:', error);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
        return;
    }
});
// Verify DM code from Firestore
async function verifyDMCode(code, username, userId) {
    try {
        // Query for pending verifications with this code
        const verificationsRef = db.collection('instagramVerifications');
        const snapshot = await verificationsRef
            .where('code', '==', code)
            .where('status', '==', 'pending')
            .where('expiresAt', '>', new Date().toISOString())
            .limit(1)
            .get();
        if (snapshot.empty) {
            return { success: false, error: 'Invalid or expired verification code' };
        }
        // Get the first matching verification
        const verificationDoc = snapshot.docs[0];
        const verificationData = verificationDoc.data();
        // Update verification status
        await verificationDoc.ref.update({
            status: 'verified',
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            instagramUsername: username,
            instagramUserId: userId
        });
        // Update user's document with Instagram info
        const userRef = db.collection('users').doc(verificationData.userId);
        await userRef.update({
            'instagram.userId': userId,
            'instagram.username': username,
            'instagram.verified': true,
            'instagram.lastVerified': admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            userId: verificationData.userId
        };
    }
    catch (error) {
        console.error('Error verifying DM code:', error);
        throw new Error('Failed to verify code');
    }
}
// Handle incoming messages
async function handleMessage(event) {
    const senderId = event.sender.id;
    const message = event.message;
    // Skip if message is empty or doesn't contain text
    if (!message || !message.text) {
        return;
    }
    const messageText = message.text.trim();
    // Check if the message is a verification code (6 digits)
    const verificationCodeMatch = messageText.match(/^\d{6}$/);
    if (verificationCodeMatch) {
        const code = verificationCodeMatch[0];
        try {
            // Verify the code
            const result = await verifyDMCode(code, event.sender.username || 'unknown_user', senderId);
            if (result.success) {
                // Send success message
                await sendTextMessage(senderId, '✅ Your account has been successfully verified!');
            }
            else {
                // Send error message
                await sendTextMessage(senderId, '❌ Invalid or expired verification code. Please try again.');
            }
        }
        catch (error) {
            console.error('Error verifying code:', error);
            await sendTextMessage(senderId, '❌ An error occurred while verifying your code. Please try again later.');
        }
    }
    else {
        // Handle other messages
        await sendTextMessage(senderId, '👋 Please send the 6-digit verification code you received on our website to verify your account.');
    }
}
// Handle postback events (for buttons, quick replies, etc.)
async function handlePostback(event) {
    const senderId = event.sender.id;
    const payload = event.postback.payload;
    // Handle different postback payloads
    switch (payload) {
        case 'GET_STARTED':
            await sendTextMessage(senderId, '👋 Welcome! Please send the 6-digit verification code you received on our website to verify your account.');
            break;
        default:
            console.log('Unknown postback payload:', payload);
    }
}
class MessengerError extends Error {
    constructor(message, code, errorSubcode, fbtraceId, errorData) {
        super(message);
        this.code = code;
        this.errorSubcode = errorSubcode;
        this.fbtraceId = fbtraceId;
        this.errorData = errorData;
        this.name = 'MessengerError';
        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MessengerError);
        }
    }
}
class RateLimitError extends MessengerError {
    constructor(message, retryAfter, code = 4, errorSubcode, fbtraceId) {
        super(message, code, errorSubcode, fbtraceId);
        this.retryAfter = retryAfter;
        this.name = 'RateLimitError';
    }
}
const DEFAULT_RETRY_OPTIONS = {
    maxRetries: 2,
    retryDelay: 1000, // 1 second
    tag: 'CONFIRMED_EVENT_UPDATE',
    typingIndicator: false,
    timeout: 10000 // 10 seconds
};
/**
 * Sends a text message to a recipient using the Facebook Messenger API
 * @param recipientId - The ID of the message recipient
 * @param text - The message text to send
 * @param options - Configuration options for the message and retry behavior
 * @returns Promise that resolves with the API response
 * @throws {MessengerError} If message sending fails due to an API error
 * @throws {RateLimitError} If rate limited by the API
 * @throws {Error} For other errors like network issues or invalid input
 */
async function sendTextMessage(recipientId, text, options = {}) {
    const { maxRetries, retryDelay, tag, typingIndicator, timeout } = { ...DEFAULT_RETRY_OPTIONS, ...options };
    // Validate environment variables
    const pageAccessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
    if (!pageAccessToken) {
        throw new Error('INSTAGRAM_PAGE_ACCESS_TOKEN is not set in environment variables');
    }
    // Validate input parameters
    if (!recipientId || typeof recipientId !== 'string') {
        throw new Error('Recipient ID must be a non-empty string');
    }
    if (!text || typeof text !== 'string') {
        throw new Error('Message text must be a non-empty string');
    }
    // Prepare the message payload
    const messageData = {
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'MESSAGE_TAG',
        tag: tag || 'CONFIRMED_EVENT_UPDATE'
    };
    // Add typing indicator if enabled
    if (typingIndicator) {
        try {
            await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: recipientId },
                    sender_action: 'typing_on',
                    messaging_type: 'MESSAGE_TAG',
                    tag: 'HUMAN_AGENT'
                })
            });
        }
        catch (error) {
            console.warn('Failed to send typing indicator:', error);
            // Continue with message sending even if typing indicator fails
        }
    }
    let lastError = null;
    let attempt = 0;
    while (attempt <= maxRetries) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageData),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const responseData = await response.json().catch(() => ({}));
            // Handle API errors
            if (responseData.error) {
                const { error } = responseData;
                // Handle rate limiting
                if (error.code === 4 || error.code === 17 || error.code === 32) {
                    const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10) * 1000 || retryDelay;
                    lastError = new RateLimitError(`Rate limited: ${error.message}`, retryAfter, error.code, error.error_subcode, error.fbtrace_id);
                }
                else {
                    lastError = new MessengerError(error.message, error.code, error.error_subcode, error.fbtrace_id, error.error_data);
                    // Don't retry for certain error types
                    if ([10, 100, 190, 200, 341, 368, 506].includes(error.code)) {
                        throw lastError;
                    }
                }
            }
            else if (!response.ok) {
                // Handle HTTP errors
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            else if (!responseData.recipient_id || !responseData.message_id) {
                // Handle invalid response format
                throw new Error('Invalid response format from Facebook Graph API');
            }
            else {
                // Success!
                return responseData;
            }
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    lastError = new Error(`Request timed out after ${timeout}ms`);
                }
                else {
                    lastError = error;
                }
            }
            else {
                lastError = new Error('An unknown error occurred');
            }
        }
        // If we have an error and have retries left, wait before retrying
        if (lastError && attempt < maxRetries) {
            const delay = Math.min(retryDelay * Math.pow(2, attempt) + Math.random() * 1000, // Add jitter
            30000 // Max 30 seconds
            );
            console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${Math.ceil(delay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        attempt++;
    }
    // If we've exhausted all retries, throw the last error with context
    const errorMessage = lastError?.message || 'Unknown error';
    const retryError = new Error(`Failed to send message after ${maxRetries + 1} attempts: ${errorMessage}`);
    // Preserve the original error as a property
    retryError.originalError = lastError;
    // If we have a specific error type, include it in the stack trace
    if (lastError instanceof MessengerError) {
        retryError.stack = `${retryError.stack}\nCaused by: ${lastError.stack}`;
    }
    throw retryError;
}
//# sourceMappingURL=instagramMessenger.js.map
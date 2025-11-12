import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { verifyRequestSignature, verifyWebhookToken } from './verifyWebhook';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface WebhookBody {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{ type: string; payload: { url: string } }>;
      };
      postback?: {
        title: string;
        payload: string;
      };
    }>;
  }>;
}

// Webhook for Instagram Messenger API
export const instagramMessengerWebhook = functions.https.onRequest(
  async (req: Request, res: Response) => {
    try {
      // Handle verification request
      if (req.method === 'GET') {
        return verifyWebhookToken(req, res);
      }

      // Only accept POST requests for webhook events
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).send(`Method ${req.method} Not Allowed`);
      }

      // Verify the request signature
      try {
        verifyRequestSignature(req);
      } catch (error) {
        console.error('Invalid request signature:', error);
        return res.status(401).send('Invalid signature');
      }

      const body = req.body as WebhookBody;
      console.log('Webhook received:', JSON.stringify(body, null, 2));

      // Validate webhook body
      if (body.object !== 'instagram') {
        return res.status(404).send('Not a valid Instagram webhook');
      }

      if (!body.entry || !Array.isArray(body.entry)) {
        return res.status(400).send('Invalid webhook payload');
      }

      // Process each entry in the webhook
      try {
        for (const entry of body.entry) {
          if (!entry.messaging || !Array.isArray(entry.messaging)) continue;

          for (const messagingEvent of entry.messaging) {
            try {
              if (messagingEvent.message) {
                await handleMessage(messagingEvent);
              } else if (messagingEvent.postback) {
                await handlePostback(messagingEvent);
              }
            } catch (error) {
              console.error('Error processing messaging event:', error);
              // Continue processing other events even if one fails
            }
          }
        }

        // Acknowledge receipt of the event
        return res.status(200).send('EVENT_RECEIVED');
      } catch (error) {
        console.error('Error processing webhook entry:', error);
        if (!res.headersSent) {
          return res.status(500).send('Error processing webhook entry');
        }
      }
    } catch (error) {
      console.error('Unexpected error in webhook handler:', error);
      if (!res.headersSent) {
        return res.status(500).send('Internal Server Error');
      }
    }
  }
);

// Verify DM code from Firestore
async function verifyDMCode(code: string, username: string, userId: string) {
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

  } catch (error) {
    console.error('Error verifying DM code:', error);
    throw new Error('Failed to verify code');
  }
}

// Handle incoming messages
async function handleMessage(event: any) {
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
      const result = await verifyDMCode(
        code,
        event.sender.username || 'unknown_user',
        senderId
      );
      
      if (result.success) {
        // Send success message
        await sendTextMessage(senderId, '✅ Your account has been successfully verified!');
      } else {
        // Send error message
        await sendTextMessage(senderId, '❌ Invalid or expired verification code. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      await sendTextMessage(senderId, '❌ An error occurred while verifying your code. Please try again later.');
    }
  } else {
    // Handle other messages
    await sendTextMessage(senderId, '👋 Please send the 6-digit verification code you received on our website to verify your account.');
  }
}

// Handle postback events (for buttons, quick replies, etc.)
async function handlePostback(event: any) {
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

interface MessageRequest {
  recipient: {
    id: string;
  };
  message: {
    text: string;
  };
  messaging_type?: string;
  tag?: string;
}

interface FacebookError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id: string;
  error_user_title?: string;
  error_user_msg?: string;
  error_data?: Record<string, unknown>;
}

interface MessageResponse {
  recipient_id: string;
  message_id: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
    error_user_title?: string;
    error_user_msg?: string;
    error_data?: Record<string, unknown>;
  };
}

interface SendMessageOptions {
  /** Maximum number of retry attempts (default: 2) */
  maxRetries?: number;
  /** Initial delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Tag for the message (e.g., 'CONFIRMED_EVENT_UPDATE') */
  tag?: string;
  /** Whether to include a typing indicator before sending */
  typingIndicator?: boolean;
  /** Timeout for the request in milliseconds (default: 10000) */
  timeout?: number;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date | null;
}

class MessengerError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly errorSubcode?: number,
    public readonly fbtraceId?: string,
    public readonly errorData?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MessengerError';
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MessengerError);
    }
  }
}

class RateLimitError extends MessengerError {
  constructor(
    message: string,
    public readonly retryAfter: number,
    code: number = 4,
    errorSubcode?: number,
    fbtraceId?: string
  ) {
    super(message, code, errorSubcode, fbtraceId);
    this.name = 'RateLimitError';
  }
}

const DEFAULT_RETRY_OPTIONS: Required<SendMessageOptions> = {
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
async function sendTextMessage(
  recipientId: string, 
  text: string,
  options: SendMessageOptions = {}
): Promise<MessageResponse> {
  const { 
    maxRetries, 
    retryDelay, 
    tag, 
    typingIndicator,
    timeout 
  } = { ...DEFAULT_RETRY_OPTIONS, ...options };

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
  const messageData: MessageRequest = {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'MESSAGE_TAG',
    tag: tag || 'CONFIRMED_EVENT_UPDATE'
  };

  // Add typing indicator if enabled
  if (typingIndicator) {
    try {
      await fetch(
        `https://graph.facebook.com/v12.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            sender_action: 'typing_on',
            messaging_type: 'MESSAGE_TAG',
            tag: 'HUMAN_AGENT'
          })
        }
      );
    } catch (error) {
      console.warn('Failed to send typing indicator:', error);
      // Continue with message sending even if typing indicator fails
    }
  }

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        `https://graph.facebook.com/v12.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messageData),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => ({})) as MessageResponse;

      // Handle API errors
      if (responseData.error) {
        const { error } = responseData;
        
        // Handle rate limiting
        if (error.code === 4 || error.code === 17 || error.code === 32) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '0', 10) * 1000 || retryDelay;
          lastError = new RateLimitError(
            `Rate limited: ${error.message}`,
            retryAfter,
            error.code,
            error.error_subcode,
            error.fbtrace_id
          );
        } else {
          lastError = new MessengerError(
            error.message,
            error.code,
            error.error_subcode,
            error.fbtrace_id,
            error.error_data
          );
          
          // Don't retry for certain error types
          if ([10, 100, 190, 200, 341, 368, 506].includes(error.code)) {
            throw lastError;
          }
        }
      } else if (!response.ok) {
        // Handle HTTP errors
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      } else if (!responseData.recipient_id || !responseData.message_id) {
        // Handle invalid response format
        throw new Error('Invalid response format from Facebook Graph API');
      } else {
        // Success!
        return responseData;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = new Error(`Request timed out after ${timeout}ms`);
        } else {
          lastError = error;
        }
      } else {
        lastError = new Error('An unknown error occurred');
      }
    }

    // If we have an error and have retries left, wait before retrying
    if (lastError && attempt < maxRetries) {
      const delay = Math.min(
        retryDelay * Math.pow(2, attempt) + Math.random() * 1000, // Add jitter
        30000 // Max 30 seconds
      );
      
      console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${Math.ceil(delay / 1000)}s...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    attempt++;
  }

  // If we've exhausted all retries, throw the last error with context
  const errorMessage = lastError?.message || 'Unknown error';
  const retryError = new Error(
    `Failed to send message after ${maxRetries + 1} attempts: ${errorMessage}`
  );
  
  // Preserve the original error as a property
  (retryError as any).originalError = lastError;
  
  // If we have a specific error type, include it in the stack trace
  if (lastError instanceof MessengerError) {
    retryError.stack = `${retryError.stack}\nCaused by: ${lastError.stack}`;
  }
  
  throw retryError;
}
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { verifyRequestSignature } from './verifyWebhook';
import { verifyDMCode } from '../../services/instagramDMVerification';

// Webhook verification token (should match the one in Facebook Developer Portal)
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'your-verify-token';

// Webhook for Instagram Messenger API
export const instagramMessengerWebhook = functions.https.onRequest(async (req, res) => {
  // Handle verification request
  if (req.method === 'GET') {
    return handleVerification(req, res);
  }

  // Handle incoming webhook events
  if (req.method === 'POST') {
    // Verify the request signature
    try {
      verifyRequestSignature(req);
    } catch (error) {
      console.error('Invalid request signature:', error);
      return res.status(401).send('Invalid signature');
    }

    // Handle the webhook event
    const { body } = req;
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // Make sure this is a page subscription
    if (body.object !== 'instagram') {
      return res.status(404).send('Not a valid Instagram webhook');
    }

    // Handle different types of webhook events
    try {
      for (const entry of body.entry) {
        // Handle messages
        for (const messagingEvent of entry.messaging) {
          if (messagingEvent.message) {
            await handleMessage(messagingEvent);
          } else if (messagingEvent.postback) {
            await handlePostback(messagingEvent);
          }
        }
      }
      
      // Return a 200 OK response to acknowledge receipt of the event
      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Error processing webhook event:', error);
      res.status(500).send('Error processing webhook event');
    }
  } else {
    // Handle any other HTTP method
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).send(`Method ${req.method} Not Allowed`);
  }
});

// Handle webhook verification
function handleVerification(req: any, res: any) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      console.error('Invalid verification token');
      res.sendStatus(403);
    }
  } else {
    // Responds with '400 Bad Request' if the required parameters are not sent
    console.error('Missing verification parameters');
    res.sendStatus(400);
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

// Send a text message using the Messenger API
async function sendTextMessage(recipientId: string, text: string) {
  const pageAccessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  
  if (!pageAccessToken) {
    throw new Error('INSTAGRAM_PAGE_ACCESS_TOKEN is not set');
  }

  const messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: text
    }
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    const responseData = await response.json();
    
    if (responseData.error) {
      console.error('Error sending message:', responseData.error);
    }
    
    return responseData;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Helper function to verify the request signature
function verifyRequestSignature(req: any) {
  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature) {
    throw new Error('No signature found in request headers');
  }
  
  const elements = signature.split('=');
  const signatureHash = elements[1];
  
  const expectedHash = crypto
    .createHmac('sha256', process.env.APP_SECRET || '')
    .update(JSON.stringify(req.body))
    .digest('hex');
    
  if (signatureHash !== expectedHash) {
    throw new Error('Invalid request signature');
  }
}

import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Webhook verification
app.get('/instagram', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Verification attempt:', { mode, token, challenge });

  if (mode === 'subscribe' && token === 'tagtokn-secret') {
    console.log('✅ Webhook verified successfully');
    return res.status(200).send(challenge);
  }
  
  console.error('❌ Webhook verification failed');
  return res.status(403).json({ 
    error: 'Verification failed',
    received: { mode, token },
    expected: { token: 'tagtokn-secret' }
  });
});

// Handle webhook events
app.post('/instagram', (req, res) => {
  try {
    console.log('📦 Webhook event received:', JSON.stringify(req.body, null, 2));
    const data = req.body;
  
    // Process different types of webhook events
    if (data.object === 'instagram') {
      data.entry?.forEach((entry) => {
        entry.changes?.forEach((change) => {
          console.log('🔔 Instagram webhook event received:', {
            field: change.field,
            value: change.value,
            time: change.time
          });
          
          // Handle different types of events
          if (change.field === 'comments') {
            console.log('💬 New comment event:', change.value);
          } else if (change.field === 'mentions') {
            console.log('📝 New mention:', change.value);
          } else if (change.field === 'messages') {
            console.log('✉️ New message event:', change.value);
          }
        });
      });
    }
    
    return res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error('❌ Webhook error:', err);
  res.status(500).send('Webhook processing failed');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export the Express app as a Firebase Function
export const instagramWebhook = onRequest(app);

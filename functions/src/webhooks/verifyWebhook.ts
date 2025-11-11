import * as crypto from 'crypto';

/**
 * Verify that the callback came from Facebook
 */
export function verifyRequestSignature(req: any) {
  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature) {
    console.error("Couldn't validate the signature.");
    throw new Error('No signature found in request headers');
  }
  
  const elements = signature.split('=');
  const signatureHash = elements[1];
  
  // Create a SHA256 HMAC using the App Secret as the key
  const expectedHash = crypto
    .createHmac('sha256', process.env.APP_SECRET || '')
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signatureHash !== expectedHash) {
    console.error("Couldn't validate the request signature.");
    throw new Error('Invalid request signature');
  }
}

/**
 * Verify that the webhook verification token matches the verify token
 */
export function verifyWebhookToken(req: any, res: any) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      // Log the verification
      console.log('WEBHOOK_VERIFIED');
      
      // Respond with 200 OK and challenge token from the request
      res.status(200).send(challenge);
      return true;
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      console.error('Invalid verification token');
      res.sendStatus(403);
      return false;
    }
  } else {
    // Responds with '400 Bad Request' if the required parameters are not sent
    console.error('Missing verification parameters');
    res.sendStatus(400);
    return false;
  }
}

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
exports.verifyRequestSignature = verifyRequestSignature;
exports.verifyWebhookToken = verifyWebhookToken;
const crypto = __importStar(require("crypto"));
/**
 * Verify that the callback came from Facebook
 */
function verifyRequestSignature(req) {
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
function verifyWebhookToken(req, res) {
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
        }
        else {
            // Responds with '403 Forbidden' if verify tokens do not match
            console.error('Invalid verification token');
            res.sendStatus(403);
            return false;
        }
    }
    else {
        // Responds with '400 Bad Request' if the required parameters are not sent
        console.error('Missing verification parameters');
        res.sendStatus(400);
        return false;
    }
}
//# sourceMappingURL=verifyWebhook.js.map
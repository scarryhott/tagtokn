/**
 * TAP Network — Backend Server
 * 
 * Express server that handles:
 * - Real wallet operations (private keys never touch the browser)
 * - Real AI fulfillment via OpenAI
 * - On-chain transaction signing and broadcasting
 * - Transaction verification
 * 
 * Run: node server/index.js
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WalletManager } from './wallet-manager.js';
import { RealCodexService } from './ai-service.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Agent configuration ---
const AGENTS = [
    { id: 'node-1', name: 'Artisanal Coffee', role: 'coffee' },
    { id: 'node-2', name: 'Community Bookstore', role: 'bookstore' },
    { id: 'node-3', name: 'Alice', role: 'citizen' },
    { id: 'node-4', name: 'Club 412', role: 'club' },
    { id: 'node-5', name: 'Bob', role: 'citizen' },
    { id: 'node-6', name: 'City Museum', role: 'museum' },
];

// --- Initialize services ---
const walletManager = new WalletManager(
    process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    parseInt(process.env.CHAIN_ID || '84532')
);

const aiService = new RealCodexService(process.env.OPENAI_API_KEY);

let isInitialized = false;


/**
 * Lazy Initialization for Serverless Environment
 */
async function initializeServer() {
    if (isInitialized) return true;

    try {
        console.log('🔄 Initializing Real Economy (Serverless)...');
        const agentIds = AGENTS.map(a => a.id);
        await walletManager.initialize(
            process.env.AGENT_MNEMONIC,
            agentIds
        );
        isInitialized = true;
        console.log('✅ Initialization complete.');
        return true;
    } catch (err) {
        console.error('⚠️ Initialization failed:', err.message);
        return false;
    }
}

// Middleware to ensure initialized
app.use(async (req, res, next) => {
    const publicRoutes = new Set([
        '/api/status'
    ]);

    if (publicRoutes.has(req.path) || isInitialized) {
        return next();
    }

    try {
        const ok = await initializeServer();
        if (!ok) {
            return res.status(500).json({ error: 'Initialization failed' });
        }
        return next();
    } catch (err) {
        console.error('Middleware initialization error:', err);
        return res.status(500).json({ error: 'Initialization failed', details: err.message });
    }
});

// ============================================================
// API ENDPOINTS
// ============================================================

/**
 * GET /api/status - Server health + initialization status
 */
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        initialized: isInitialized,
        chain: 'Base Sepolia',
        chainId: 84532,
        rpc: process.env.BASE_SEPOLIA_RPC,
        treasuryAddress: process.env.TREASURY_ADDRESS,
        agents: AGENTS.length,
        aiModel: 'gpt-4o-mini',
        aiUsage: aiService.getUsageStats()
    });
});

/**
 * POST /api/init - Initialize all agent wallets
 * Call this once on startup to derive wallets from mnemonic
 */
app.post('/api/init', async (req, res) => {
    try {
        const agentIds = AGENTS.map(a => a.id);
        const walletInfo = await walletManager.initialize(
            process.env.AGENT_MNEMONIC,
            agentIds
        );
        isInitialized = true;
        res.json({
            success: true,
            wallets: walletInfo,
            message: 'All agent wallets initialized on Base Sepolia'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/wallets - Get all wallet addresses and balances
 */
app.get('/api/wallets', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized. POST /api/init first.' });
    }
    try {
        const balances = await walletManager.getAllBalances();
        res.json({ wallets: balances });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/wallets/:agentId/balance - Get single agent balance
 */
app.get('/api/wallets/:agentId/balance', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized' });
    }
    try {
        const balance = await walletManager.getBalance(req.params.agentId);
        const info = walletManager.getWalletInfo()[req.params.agentId];
        res.json({ agentId: req.params.agentId, balanceEth: balance, address: info?.address });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/tx/send - Send a REAL on-chain transaction between agents
 * Body: { from: "node-1", to: "node-3", amountEth: "0.0001", memo: "POI:..." }
 */
app.post('/api/tx/send', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized' });
    }
    const { from, to, amountEth, memo } = req.body;
    if (!from || !to || !amountEth) {
        return res.status(400).json({ error: 'Missing from, to, or amountEth' });
    }

    try {
        const result = await walletManager.sendTransaction(from, to, amountEth, memo || '');
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/tx/external - Send to an EXTERNAL wallet (outside the network)
 * Body: { from: "node-1", toAddress: "0x...", amountEth: "0.001", memo: "..." }
 */
app.post('/api/tx/external', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized' });
    }
    const { from, toAddress, amountEth, memo } = req.body;
    if (!from || !toAddress || !amountEth) {
        return res.status(400).json({ error: 'Missing from, toAddress, or amountEth' });
    }

    try {
        const result = await walletManager.sendToExternal(from, toAddress, amountEth, memo || '');
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/tx/verify/:txHash - Verify a transaction on-chain
 */
app.get('/api/tx/verify/:txHash', async (req, res) => {
    try {
        const result = await walletManager.verifyTransaction(req.params.txHash);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/tx/history - Get all transaction history
 */
app.get('/api/tx/history', (req, res) => {
    res.json({ transactions: walletManager.getTransactionHistory() });
});

/**
 * POST /api/ai/fulfill - Fulfill a service using REAL AI (OpenAI)
 * Body: { agentId: "node-1", serviceName: "Barista Training", prompt: "..." }
 */
app.post('/api/ai/fulfill', async (req, res) => {
    const { agentId, serviceName, prompt } = req.body;
    if (!agentId || !serviceName) {
        return res.status(400).json({ error: 'Missing agentId or serviceName' });
    }

    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) {
        return res.status(404).json({ error: `Agent ${agentId} not found` });
    }

    try {
        const result = await aiService.fulfill(agent.name, agent.role, serviceName, prompt);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/ai/usage - Get AI usage statistics
 */
app.get('/api/ai/usage', (req, res) => {
    res.json(aiService.getUsageStats());
});


/**
 * POST /api/poi/record - Record a Proof of Interaction on-chain
 * This encodes the IVI audit result as a transaction memo
 * Body: { from, to, score, closureData, amountEth }
 */
app.post('/api/poi/record', async (req, res) => {
    if (!isInitialized) {
        return res.status(400).json({ error: 'Not initialized' });
    }
    const { from, to, score, closureData, amountEth } = req.body;

    // Encode POI data as memo
    const poiMemo = JSON.stringify({
        protocol: 'TAP-POI-v1',
        score: score,
        closure: closureData,
        timestamp: Date.now()
    });

    try {
        const result = await walletManager.sendTransaction(
            from, to,
            amountEth || '0.000001', // Minimal ETH for POI stamp
            poiMemo
        );
        res.json({
            ...result,
            poiData: poiMemo,
            isProofOfInteraction: true
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Export for Vercel
export default app;

/**
 * TAP Network — Real Economy API Client
 * 
 * Frontend client for the backend server.
 * Replaces all simulated data with real API calls.
 * 
 * Every method here talks to the Express server which:
 * - Signs real transactions on Base Sepolia
 * - Makes real OpenAI API calls
 * - Returns real tx hashes verifiable on basescan.org
 */

const API_BASE = '/api';

class RealEconomyClient {
    constructor() {
        this.initialized = false;
        this.walletInfo = {};
        this.serverStatus = null;
    }

    /**
     * Initialize connection to the real economy backend
     */
    async init() {
        try {
            // Check server status
            const statusRes = await fetch(`${API_BASE}/status`);
            this.serverStatus = await statusRes.json();

            if (!this.serverStatus.initialized) {
                // Initialize wallets
                const initRes = await fetch(`${API_BASE}/init`, { method: 'POST' });
                const initData = await initRes.json();
                if (initData.success) {
                    this.walletInfo = initData.wallets;
                    this.initialized = true;
                } else {
                    throw new Error(initData.error || 'Init failed');
                }
            } else {
                // Already initialized, fetch wallet info
                const walletsRes = await fetch(`${API_BASE}/wallets`);
                const walletsData = await walletsRes.json();
                this.walletInfo = walletsData.wallets;
                this.initialized = true;
            }

            console.log('🔗 Connected to real economy backend');
            console.log('   Chain: Base Sepolia');
            console.log('   Wallets:', Object.keys(this.walletInfo).length);
            return { success: true, wallets: this.walletInfo };

        } catch (err) {
            console.warn('⚠️ Real economy backend not available:', err.message);
            console.warn('   Run: npm run server');
            return { success: false, error: err.message };
        }
    }

    /**
     * Check if the real backend is connected
     */
    isConnected() {
        return this.initialized;
    }

    /**
     * Get real on-chain balances for all agents
     */
    async getBalances() {
        if (!this.initialized) return null;
        try {
            const res = await fetch(`${API_BASE}/wallets`);
            const data = await res.json();
            return data.wallets;
        } catch (err) {
            console.error('Balance fetch error:', err);
            return null;
        }
    }

    /**
     * Get real balance for a single agent
     */
    async getBalance(agentId) {
        if (!this.initialized) return null;
        try {
            const res = await fetch(`${API_BASE}/wallets/${agentId}/balance`);
            return await res.json();
        } catch (err) {
            return null;
        }
    }

    /**
     * Send a REAL on-chain transaction between agents
     * Returns actual tx hash verifiable on basescan.org
     * 
     * @param {string} fromAgentId 
     * @param {string} toAgentId 
     * @param {number} amountUsd - Amount in "USD equivalent" (converted to ETH)
     * @param {string} memo - POI proof data
     */
    async sendTransaction(fromAgentId, toAgentId, amountUsd, memo = '') {
        if (!this.initialized) return { success: false, error: 'Not connected' };

        // Convert USD to ETH equivalent (using approximate rate for testnet)
        // On testnet, we use micro-amounts to conserve faucet ETH
        const amountEth = (amountUsd * 0.000001).toFixed(8); // $1 = 0.000001 ETH on testnet

        try {
            const res = await fetch(`${API_BASE}/tx/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: fromAgentId,
                    to: toAgentId,
                    amountEth,
                    memo: memo || `TAP-L1:${fromAgentId}->${toAgentId}:$${amountUsd}`
                })
            });
            return await res.json();
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Send to an external wallet (outside the agent network)
     */
    async sendToExternal(fromAgentId, toAddress, amountEth, memo = '') {
        if (!this.initialized) return { success: false, error: 'Not connected' };

        try {
            const res = await fetch(`${API_BASE}/tx/external`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: fromAgentId, toAddress, amountEth, memo })
            });
            return await res.json();
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Fulfill a service using REAL AI (OpenAI GPT-4o-mini)
     * No template strings — actual API call
     */
    async fulfillService(agentId, serviceName, prompt) {
        if (!this.initialized) return null;

        try {
            const res = await fetch(`${API_BASE}/ai/fulfill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId, serviceName, prompt })
            });
            return await res.json();
        } catch (err) {
            console.error('AI fulfillment error:', err);
            return { error: err.message, isReal: false };
        }
    }

    /**
     * Record a Proof of Interaction on-chain
     * The IVI audit score gets encoded as a transaction memo
     */
    async recordPOI(fromAgentId, toAgentId, score, closureData) {
        if (!this.initialized) return { success: false, error: 'Not connected' };

        try {
            const res = await fetch(`${API_BASE}/poi/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: fromAgentId,
                    to: toAgentId,
                    score,
                    closureData,
                    amountEth: '0.000001' // Minimal for POI stamp
                })
            });
            return await res.json();
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Verify a transaction exists on-chain
     */
    async verifyTransaction(txHash) {
        try {
            const res = await fetch(`${API_BASE}/tx/verify/${txHash}`);
            return await res.json();
        } catch (err) {
            return { verified: false, error: err.message };
        }
    }

    /**
     * Get on-chain transaction history
     */
    async getTransactionHistory() {
        try {
            const res = await fetch(`${API_BASE}/tx/history`);
            const data = await res.json();
            return data.transactions;
        } catch (err) {
            return [];
        }
    }

    /**
     * Get AI usage stats
     */
    async getAIUsage() {
        try {
            const res = await fetch(`${API_BASE}/ai/usage`);
            return await res.json();
        } catch (err) {
            return null;
        }
    }

    /**
     * Get wallet address for an agent
     */
    getWalletAddress(agentId) {
        return this.walletInfo[agentId]?.address || null;
    }

    /**
     * Get explorer URL for an agent's wallet
     */
    getExplorerUrl(agentId) {
        const address = this.getWalletAddress(agentId);
        return address ? `https://sepolia.basescan.org/address/${address}` : null;
    }
}

// Singleton
export const realEconomy = new RealEconomyClient();
export default realEconomy;

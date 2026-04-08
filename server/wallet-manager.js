/**
 * TAP Network — Real Wallet Manager
 * 
 * Derives real HD wallets from a mnemonic seed.
 * Signs and broadcasts real transactions on Base Sepolia.
 * Every transaction is verifiable on basescan.org.
 */
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class WalletManager {
    constructor(rpcUrl, chainId) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
        this.wallets = new Map(); // agentId -> ethers.Wallet
        this.mnemonic = null;
        this.txHistory = []; // All on-chain tx receipts
    }

    /**
     * Initialize wallets from mnemonic.
     * Derives 6 wallets using BIP44 path: m/44'/60'/0'/0/{index}
     */
    async initialize(existingMnemonic, agentIds) {
        if (existingMnemonic && existingMnemonic.trim()) {
            this.mnemonic = existingMnemonic.trim();
        } else {
            throw new Error('AGENT_MNEMONIC is required (refusing to auto-generate or write secrets)');
        }

        // Derive a wallet for each agent
        const hdNode = ethers.HDNodeWallet.fromPhrase(this.mnemonic);

        for (let i = 0; i < agentIds.length; i++) {
            const derivedWallet = hdNode.deriveChild(i);
            const connectedWallet = new ethers.Wallet(derivedWallet.privateKey, this.provider);
            this.wallets.set(agentIds[i], connectedWallet);
        }

        console.log('\n🏦 Agent Wallets Derived:');
        for (const [agentId, wallet] of this.wallets) {
            const balance = await this.getBalance(agentId);
            console.log(`   ${agentId}: ${wallet.address} (${balance} ETH)`);
        }

        return this.getWalletInfo();
    }

    /**
     * Get real on-chain balance for an agent
     */
    async getBalance(agentId) {
        const wallet = this.wallets.get(agentId);
        if (!wallet) throw new Error(`No wallet for agent ${agentId}`);

        const balance = await this.provider.getBalance(wallet.address);
        return ethers.formatEther(balance);
    }

    /**
     * Get all agent balances
     */
    async getAllBalances() {
        const balances = {};
        for (const [agentId, wallet] of this.wallets) {
            try {
                const balance = await this.provider.getBalance(wallet.address);
                balances[agentId] = {
                    address: wallet.address,
                    balanceWei: balance.toString(),
                    balanceEth: ethers.formatEther(balance)
                };
            } catch (err) {
                balances[agentId] = {
                    address: wallet.address,
                    balanceWei: '0',
                    balanceEth: '0.0',
                    error: err.message
                };
            }
        }
        return balances;
    }

    /**
     * Send a REAL transaction on Base Sepolia.
     * Returns the actual tx hash verifiable on basescan.org.
     * 
     * @param {string} fromAgentId - Sending agent
     * @param {string} toAgentId - Receiving agent  
     * @param {string} amountEth - Amount in ETH (e.g. "0.001")
     * @param {string} memo - Data payload (POI proof hash)
     * @returns {Object} Transaction receipt with real tx hash
     */
    async sendTransaction(fromAgentId, toAgentId, amountEth, memo = '') {
        const fromWallet = this.wallets.get(fromAgentId);
        const toWallet = this.wallets.get(toAgentId);

        if (!fromWallet) throw new Error(`No wallet for sender ${fromAgentId}`);
        if (!toWallet) throw new Error(`No wallet for recipient ${toAgentId}`);

        // Check balance
        const balance = await this.provider.getBalance(fromWallet.address);
        const amountWei = ethers.parseEther(amountEth);

        if (balance < amountWei) {
            return {
                success: false,
                error: 'INSUFFICIENT_FUNDS',
                fromAddress: fromWallet.address,
                balance: ethers.formatEther(balance),
                requested: amountEth,
                message: `${fromAgentId} has ${ethers.formatEther(balance)} ETH but needs ${amountEth} ETH`
            };
        }

        try {
            // Build the real transaction
            const tx = await fromWallet.sendTransaction({
                to: toWallet.address,
                value: amountWei,
                // Encode POI memo in the data field
                data: memo ? ethers.hexlify(ethers.toUtf8Bytes(memo)) : '0x'
            });

            console.log(`📡 TX Broadcast: ${tx.hash}`);
            console.log(`   ${fromAgentId} → ${toAgentId}: ${amountEth} ETH`);
            console.log(`   Explorer: https://sepolia.basescan.org/tx/${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait(1);

            const record = {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                from: fromWallet.address,
                fromAgentId,
                to: toWallet.address,
                toAgentId,
                amountEth,
                amountWei: amountWei.toString(),
                gasUsed: receipt.gasUsed.toString(),
                memo,
                timestamp: Date.now(),
                explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`
            };

            this.txHistory.push(record);
            return record;

        } catch (err) {
            console.error(`❌ TX Failed: ${err.message}`);
            return {
                success: false,
                error: err.code || 'TX_FAILED',
                message: err.message,
                fromAddress: fromWallet.address,
                toAddress: toWallet.address
            };
        }
    }

    /**
     * Send ETH to an EXTERNAL address (outside the agent network)
     * This is for real-world payments
     */
    async sendToExternal(fromAgentId, toAddress, amountEth, memo = '') {
        const fromWallet = this.wallets.get(fromAgentId);
        if (!fromWallet) throw new Error(`No wallet for sender ${fromAgentId}`);

        const balance = await this.provider.getBalance(fromWallet.address);
        const amountWei = ethers.parseEther(amountEth);

        if (balance < amountWei) {
            return {
                success: false,
                error: 'INSUFFICIENT_FUNDS',
                message: `${fromAgentId} has ${ethers.formatEther(balance)} ETH but needs ${amountEth} ETH`
            };
        }

        try {
            const tx = await fromWallet.sendTransaction({
                to: toAddress,
                value: amountWei,
                data: memo ? ethers.hexlify(ethers.toUtf8Bytes(memo)) : '0x'
            });

            console.log(`📡 EXTERNAL TX: ${tx.hash}`);
            console.log(`   ${fromAgentId} → ${toAddress}: ${amountEth} ETH`);

            const receipt = await tx.wait(1);

            const record = {
                success: true,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                from: fromWallet.address,
                fromAgentId,
                to: toAddress,
                toAgentId: 'EXTERNAL',
                amountEth,
                gasUsed: receipt.gasUsed.toString(),
                memo,
                timestamp: Date.now(),
                explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`,
                isExternal: true
            };

            this.txHistory.push(record);
            return record;

        } catch (err) {
            return {
                success: false,
                error: err.code || 'TX_FAILED',
                message: err.message
            };
        }
    }

    /**
     * Verify a transaction exists on-chain by its hash
     */
    async verifyTransaction(txHash) {
        try {
            const tx = await this.provider.getTransaction(txHash);
            const receipt = await this.provider.getTransactionReceipt(txHash);

            if (!tx || !receipt) {
                return { verified: false, error: 'Transaction not found on chain' };
            }

            return {
                verified: true,
                txHash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers.formatEther(tx.value),
                blockNumber: receipt.blockNumber,
                status: receipt.status === 1 ? 'success' : 'reverted',
                gasUsed: receipt.gasUsed.toString(),
                // Decode memo if present
                memo: tx.data !== '0x' ? ethers.toUtf8String(tx.data) : null,
                explorerUrl: `https://sepolia.basescan.org/tx/${tx.hash}`
            };
        } catch (err) {
            return { verified: false, error: err.message };
        }
    }

    /**
     * Get wallet info (public data only, no private keys)
     */
    getWalletInfo() {
        const info = {};
        for (const [agentId, wallet] of this.wallets) {
            info[agentId] = {
                address: wallet.address,
                explorerUrl: `https://sepolia.basescan.org/address/${wallet.address}`
            };
        }
        return info;
    }

    /**
     * Get full transaction history
     */
    getTransactionHistory() {
        return [...this.txHistory];
    }

    // Intentionally no persistence helpers for secrets.
}

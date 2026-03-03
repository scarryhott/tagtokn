/**
 * Digital Tap Protocol
 * 
 * Internet-based equivalent of the NFC interaction proof.
 * When two agents interact online (service exchange, collaboration, purchase),
 * a Digital Tap is created and run through the IVI audit engine.
 * 
 * A Digital Tap contains:
 *   - fromAgent / toAgent identifiers & wallet addresses
 *   - serviceId (what was exchanged)
 *   - amount (economic value transferred)
 *   - digitalFingerprint (IP locality, timing, session continuity simulation)
 *   - sharedContext (word-of-mouth reputation from prior encounters)
 *   - timestamp
 */

export class DigitalTapProtocol {
    constructor(iviEngine) {
        this.engine = iviEngine;
        this.tapHistory = [];
        this.sessionRegistry = new Map(); // agentId -> active session proof
    }

    /**
     * Create a Digital Tap between two agents.
     * This is the internet equivalent of physically tapping NFC devices.
     * 
     * @param {Object} params
     * @param {ICRAgent} params.from - Requesting agent
     * @param {ICRAgent} params.to - Providing agent
     * @param {string} params.serviceId - Which service is being exchanged
     * @param {number} params.amount - Payment amount
     * @param {string} params.channel - 'marketplace' | 'direct' | 'referral'
     * @returns {Object} Digital Tap proof object
     */
    createTap(params) {
        const { from, to, serviceId, amount, channel = 'marketplace' } = params;

        // 1. Generate digital fingerprint (simulates IP/timing verification)
        const fingerprint = this._generateFingerprint(from, to);

        // 2. Calculate shared context from prior interactions
        const sharedContext = this._calculateSharedContext(from, to);

        // 3. Calculate session continuity score
        const sessionProof = this._verifySession(from, to);

        // 4. Build the tap object
        const tap = {
            id: `tap-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            from: {
                agentId: from.nodeId,
                name: from.name,
                wallet: from.walletAddress,
                publicKey: from.publicKey,
                trustScore: from.c_score
            },
            to: {
                agentId: to.nodeId,
                name: to.name,
                wallet: to.walletAddress,
                publicKey: to.publicKey,
                trustScore: to.c_score
            },
            serviceId,
            amount,
            channel,
            proof: {
                fingerprint,
                sharedContext,
                sessionProof,
                timestamp: Date.now(),
                nonce: Math.random().toString(36).substr(2, 16)
            },
            status: 'pending'
        };

        return tap;
    }

    /**
     * Verify and settle a Digital Tap through the IVI audit engine.
     * This is the core protocol: every interaction must pass closure audit.
     * 
     * @param {Object} tap - Digital Tap object from createTap
     * @param {Object} networkStats - Current network statistics
     * @returns {Object} Audit result with settlement status
     */
    verifyAndSettle(tap, networkStats) {
        // Convert tap to IVI audit format
        const loopEvents = [
            ...this.tapHistory.slice(-3).map(t => ({
                from: t.from.agentId,
                to: t.to.agentId,
                amount: t.amount,
                weight: 3,
                timestamp: t.proof.timestamp
            })),
            {
                from: tap.from.agentId,
                to: tap.to.agentId,
                amount: tap.amount,
                weight: 3,
                timestamp: tap.proof.timestamp
            }
        ];

        const loopNodes = [...new Set(loopEvents.flatMap(e => [e.from, e.to]))];

        // Route plausibility = digital fingerprint quality
        const routePlausibility = tap.proof.fingerprint.quality;

        // Secret factor = shared context depth + novelty boost
        const secretFactor = tap.proof.sharedContext.depth;
        const isNovel = tap.proof.sharedContext.isNovel;

        const auditResult = this.engine.audit({
            events: loopEvents,
            nodes: loopNodes,
            secretFactor,
            isNovel,
            routePlausibility
        }, networkStats);

        // Settlement
        const settlement = {
            tapId: tap.id,
            verified: auditResult.isClosure,
            closureScore: auditResult.score,
            reward: auditResult.reward,
            contribution: auditResult.contribution,
            weightUpdate: auditResult.weightUpdate,
            settledAt: Date.now()
        };

        // Record in history
        tap.status = auditResult.isClosure ? 'verified' : 'collapsed';
        tap.settlement = settlement;
        this.tapHistory.push(tap);

        return { tap, audit: auditResult, settlement };
    }

    /**
     * Generate a digital fingerprint simulating IP/timing/device verification.
     * In a real system, this would involve actual device attestation.
     */
    _generateFingerprint(from, to) {
        // Simulate digital proximity via shared network session
        const timingJitter = Math.random() * 0.3; // Network latency simulation
        const sessionOverlap = this.sessionRegistry.has(from.nodeId) &&
            this.sessionRegistry.has(to.nodeId) ? 0.8 : 0.4;

        return {
            quality: Math.min(1.0, sessionOverlap + (1 - timingJitter) * 0.3),
            latency: Math.floor(timingJitter * 200), // ms
            sessionOverlap,
            verified: sessionOverlap > 0.5
        };
    }

    /**
     * Calculate shared context between two agents.
     * This is the digital version of "word of mouth" — prior interaction history.
     */
    _calculateSharedContext(from, to) {
        const priorTaps = this.tapHistory.filter(t =>
            (t.from.agentId === from.nodeId && t.to.agentId === to.nodeId) ||
            (t.from.agentId === to.nodeId && t.to.agentId === from.nodeId)
        );

        const mutualConnections = this.tapHistory.filter(t =>
            t.from.agentId === from.nodeId || t.to.agentId === from.nodeId
        ).filter(t =>
            t.from.agentId === to.nodeId || t.to.agentId === to.nodeId
        );

        return {
            priorInteractions: priorTaps.length,
            mutualConnections: mutualConnections.length,
            depth: Math.min(1.0, priorTaps.length * 0.2 + mutualConnections.length * 0.1),
            trustAccumulated: priorTaps.reduce((sum, t) =>
                sum + (t.settlement?.closureScore || 0), 0
            )
        };
    }

    /**
     * Verify session continuity. In a real system, this would check
     * that both agents have active, authenticated sessions.
     */
    _verifySession(from, to) {
        // Register sessions if not exists
        if (!this.sessionRegistry.has(from.nodeId)) {
            this.sessionRegistry.set(from.nodeId, {
                started: Date.now(),
                interactions: 0
            });
        }
        if (!this.sessionRegistry.has(to.nodeId)) {
            this.sessionRegistry.set(to.nodeId, {
                started: Date.now(),
                interactions: 0
            });
        }

        const fromSession = this.sessionRegistry.get(from.nodeId);
        const toSession = this.sessionRegistry.get(to.nodeId);

        fromSession.interactions++;
        toSession.interactions++;

        return {
            bothActive: true,
            fromDuration: Date.now() - fromSession.started,
            toDuration: Date.now() - toSession.started,
            continuityScore: Math.min(1.0, (fromSession.interactions + toSession.interactions) * 0.05)
        };
    }

    /**
     * Ingest an external crypto transaction from the internet.
     * 
     * When an agent's wallet transacts on-chain (to/from addresses outside
     * the agent network), that movement is mapped back onto the digital map.
     * 
     * This is the DATA MECHANISM: crypto tx on internet → data point on map
     * → IVI audit → governance weights + treasury (the existing system).
     * 
     * @param {Object} params
     * @param {string} params.fromWallet - Source wallet address
     * @param {string} params.toWallet - Destination wallet address  
     * @param {number} params.amount - Transaction value
     * @param {string} params.txHash - On-chain transaction hash
     * @param {string} params.network - 'ethereum' | 'polygon' | 'base' etc.
     * @param {ICRAgent} params.agent - The agent whose wallet made this tx
     * @param {string} params.direction - 'outbound' | 'inbound'
     * @returns {Object} Mapped tap with IVI audit-ready format
     */
    ingestExternalTransaction(params) {
        const { fromWallet, toWallet, amount, txHash, network, agent, direction } = params;

        // Determine if the counterparty is inside or outside the agent network
        const isInternal = this.tapHistory.some(t =>
            t.from.wallet === (direction === 'outbound' ? toWallet : fromWallet) ||
            t.to.wallet === (direction === 'outbound' ? toWallet : fromWallet)
        );

        const externalTap = {
            id: `ext-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            from: {
                agentId: agent.nodeId,
                name: agent.name,
                wallet: fromWallet,
                publicKey: agent.publicKey,
                trustScore: agent.c_score
            },
            to: {
                agentId: isInternal ? 'network' : 'external',
                name: isInternal ? 'Network Counterparty' : `External (${network})`,
                wallet: toWallet,
                publicKey: null,
                trustScore: isInternal ? 0.5 : 0.1 // External gets low initial trust
            },
            serviceId: null,
            amount,
            channel: 'on-chain',
            proof: {
                fingerprint: {
                    quality: isInternal ? 0.7 : 0.3, // External = lower plausibility
                    latency: 0,
                    sessionOverlap: isInternal ? 0.6 : 0.1,
                    verified: true,
                    txHash,
                    network,
                    blockVerified: true // On-chain = cryptographically verified
                },
                sharedContext: {
                    priorInteractions: 0,
                    mutualConnections: 0,
                    depth: isInternal ? 0.3 : 0, // No WoM context with external
                    trustAccumulated: 0
                },
                sessionProof: {
                    bothActive: true,
                    continuityScore: 1.0 // On-chain = always continuous
                },
                timestamp: Date.now(),
                nonce: txHash
            },
            direction,
            isExternal: !isInternal,
            status: 'pending'
        };

        return externalTap;
    }

    /**
     * Get the full interaction history for an agent.
     */
    getAgentHistory(agentId) {
        return this.tapHistory.filter(t =>
            t.from.agentId === agentId || t.to.agentId === agentId
        );
    }

    /**
     * Get network-wide statistics for the digital tap layer.
     */
    getDigitalNetworkStats() {
        const verified = this.tapHistory.filter(t => t.status === 'verified');
        const collapsed = this.tapHistory.filter(t => t.status === 'collapsed');
        const totalVolume = this.tapHistory.reduce((s, t) => s + t.amount, 0);
        const externalTaps = this.tapHistory.filter(t => t.isExternal);
        const internalTaps = this.tapHistory.filter(t => !t.isExternal);

        return {
            totalTaps: this.tapHistory.length,
            verified: verified.length,
            collapsed: collapsed.length,
            verificationRate: this.tapHistory.length > 0 ? verified.length / this.tapHistory.length : 0,
            totalVolume,
            avgClosureScore: verified.length > 0
                ? verified.reduce((s, t) => s + t.settlement.closureScore, 0) / verified.length
                : 0,
            externalTxCount: externalTaps.length,
            internalTxCount: internalTaps.length,
            externalVolume: externalTaps.reduce((s, t) => s + t.amount, 0)
        };
    }
}

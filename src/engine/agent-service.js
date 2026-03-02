/**
 * Agent Service Provider
 * 
 * Each agent operates as an autonomous service provider in the Tap Network.
 * They have:
 *  - A public storefront (services they offer)
 *  - A Codex AI interface (to generate content & fulfill requests)
 *  - A MetaMask wallet (for economic settlement)
 *  - A marketing engine (to promote services to the network)
 * 
 * This module handles the service lifecycle:
 *  discover → request → fulfill → settle → verify
 */

/**
 * Service catalog entry
 */
export class AgentService {
    constructor({ id, name, description, price, category, agentId, agentName }) {
        this.id = id || `svc-${Math.random().toString(36).substr(2, 8)}`;
        this.name = name;
        this.description = description;
        this.price = price;
        this.category = category; // 'development' | 'design' | 'consulting' | 'content' | 'event'
        this.agentId = agentId;
        this.agentName = agentName;
        this.rating = 0;
        this.completedJobs = 0;
        this.createdAt = Date.now();
    }
}

/**
 * Service Request (a pending interaction between two agents)
 */
export class ServiceRequest {
    constructor({ from, to, service, customPrompt }) {
        this.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.from = from;       // requesting agent
        this.to = to;           // providing agent
        this.service = service; // AgentService instance
        this.customPrompt = customPrompt || '';
        this.status = 'pending'; // pending → accepted → in_progress → fulfilled → settled
        this.result = null;
        this.createdAt = Date.now();
        this.completedAt = null;
    }
}

/**
 * Simulated Codex AI interface.
 * In production this would call the OpenAI Codex API.
 * Here we simulate intelligent service fulfillment.
 */
export class CodexInterface {
    constructor(agentName) {
        this.agentName = agentName;
        this.contextWindow = [];
        this.tokensUsed = 0;
    }

    /**
     * Fulfill a service request using "Codex" AI.
     * Generates a realistic response based on service type and prompt.
     */
    async fulfill(service, customPrompt) {
        // Simulate processing delay
        await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

        this.tokensUsed += 150 + Math.floor(Math.random() * 350);

        const responses = {
            'Code Review': this._generateCodeReview(customPrompt),
            'Content Strategy': this._generateContentStrategy(customPrompt),
            'UX Design': this._generateUXDesign(customPrompt),
            'Barista Training': this._generateTrainingPlan('barista arts', customPrompt),
            'Direct Trade Sourcing': this._generateSourcingReport(customPrompt),
            'Rare Manuscript Sourcing': this._generateSourcingReport(customPrompt),
            'Manuscript Restoration': this._generateRestorationPlan(customPrompt),
            'Event Curation': this._generateEventPlan(customPrompt),
            'Audio Engineering': this._generateTechSpec('audio engineering', customPrompt),
            'Policy Design': this._generatePolicyBrief(customPrompt),
            'Community Moderation': this._generateModerationPlan(customPrompt)
        };

        const result = responses[service.name] || this._generateGenericResponse(service.name, customPrompt);

        this.contextWindow.push({ service: service.name, prompt: customPrompt, result, timestamp: Date.now() });
        if (this.contextWindow.length > 20) this.contextWindow.shift();

        return {
            agentName: this.agentName,
            serviceName: service.name,
            deliverable: result,
            tokensUsed: this.tokensUsed,
            confidence: 0.7 + Math.random() * 0.3,
            generatedAt: Date.now()
        };
    }

    _generateCodeReview(prompt) {
        return {
            type: 'code_review',
            summary: `Code review completed for: ${prompt || 'submitted module'}`,
            findings: [
                { severity: 'info', message: 'Consider extracting shared logic into a utility function.' },
                { severity: 'warning', message: 'Potential memory leak in event listener — missing cleanup.' },
                { severity: 'suggestion', message: 'Add TypeScript interfaces for better type safety.' }
            ],
            score: (75 + Math.floor(Math.random() * 25)) + '/100'
        };
    }

    _generateContentStrategy(prompt) {
        return {
            type: 'content_strategy',
            summary: `Content strategy for: ${prompt || 'brand growth'}`,
            pillars: ['Community Storytelling', 'Educational Series', 'Behind-the-Scenes'],
            channels: ['Newsletter', 'Social Media', 'Podcast'],
            cadence: '3x/week publishing schedule'
        };
    }

    _generateUXDesign(prompt) {
        return {
            type: 'ux_design',
            summary: `UX design recommendations for: ${prompt || 'user onboarding'}`,
            wireframes: ['Landing page flow', 'Dashboard layout', 'Mobile-first navigation'],
            heuristics: ['Reduce cognitive load by 40%', 'Add progressive disclosure', 'Implement skeleton loading states']
        };
    }

    _generateTrainingPlan(domain, prompt) {
        return {
            type: 'training_plan',
            summary: `${domain} training program: ${prompt || 'foundational skills'}`,
            modules: [`${domain} Fundamentals`, 'Hands-On Practice', 'Advanced Techniques'],
            duration: '6 weeks',
            certification: true
        };
    }

    _generateSourcingReport(prompt) {
        return {
            type: 'sourcing_report',
            summary: `Sourcing analysis for: ${prompt || 'premium materials'}`,
            suppliers: [
                { name: 'Verified Cooperative A', region: 'South America', rating: 4.8 },
                { name: 'Artisan Collective B', region: 'East Africa', rating: 4.6 }
            ],
            recommendation: 'Direct trade partnership with Cooperative A for ethical sourcing.'
        };
    }

    _generateRestorationPlan(prompt) {
        return {
            type: 'restoration_plan',
            summary: `Restoration assessment for: ${prompt || 'historical document'}`,
            condition: 'Fair — minor foxing, binding intact',
            steps: ['Chemical stabilization', 'De-acidification', 'Digital archive creation'],
            estimate: '3-4 weeks for full conservation'
        };
    }

    _generateEventPlan(prompt) {
        return {
            type: 'event_plan',
            summary: `Event curation for: ${prompt || 'community gathering'}`,
            format: 'Hybrid (in-person + livestream)',
            schedule: ['Opening keynote', 'Workshop sessions', 'Networking mixer', 'Community showcase'],
            capacity: 150,
            estimatedBudget: '$2,500 - $4,000'
        };
    }

    _generateTechSpec(domain, prompt) {
        return {
            type: 'tech_spec',
            summary: `${domain} specification for: ${prompt || 'production setup'}`,
            equipment: ['Reference monitors', 'DAW workstation', 'Acoustic treatment'],
            deliverables: ['Master audio files', 'Documentation', 'Training session']
        };
    }

    _generatePolicyBrief(prompt) {
        return {
            type: 'policy_brief',
            summary: `Policy design for: ${prompt || 'community governance'}`,
            recommendations: ['Establish transparent voting mechanism', 'Create dispute resolution framework', 'Define contribution metrics'],
            stakeholders: ['Community members', 'Business owners', 'Municipal partners']
        };
    }

    _generateModerationPlan(prompt) {
        return {
            type: 'moderation_plan',
            summary: `Moderation framework for: ${prompt || 'online community'}`,
            guidelines: ['Clear code of conduct', 'Graduated response system', 'Community-elected moderators'],
            tools: ['Automated content screening', 'Appeal mechanism', 'Transparency reports']
        };
    }

    _generateGenericResponse(serviceName, prompt) {
        return {
            type: 'deliverable',
            summary: `${serviceName} completed for: ${prompt || 'client request'}`,
            details: 'Full deliverable package attached.',
            satisfaction: 'High'
        };
    }
}

/**
 * Agent Wallet (MetaMask simulation)
 * Tracks balances, pending transactions, and settlement history.
 */
export class AgentWallet {
    constructor(address, initialBalance = 0) {
        this.address = address;
        this.balance = initialBalance;
        this.pendingTransactions = [];
        this.settledTransactions = [];
        this.nonce = 0;
    }

    /**
     * Create a pending transaction (not yet settled by the IVI audit).
     */
    createTransaction(toAddress, amount, serviceId) {
        const tx = {
            hash: `0x${Math.random().toString(16).substr(2, 64)}`,
            from: this.address,
            to: toAddress,
            amount,
            serviceId,
            nonce: this.nonce++,
            status: 'pending',
            createdAt: Date.now()
        };
        this.pendingTransactions.push(tx);
        return tx;
    }

    /**
     * Settle a transaction after IVI verification.
     * Only verified taps result in actual balance changes.
     */
    settleTransaction(txHash, verified) {
        const txIndex = this.pendingTransactions.findIndex(t => t.hash === txHash);
        if (txIndex === -1) return null;

        const tx = this.pendingTransactions.splice(txIndex, 1)[0];
        tx.status = verified ? 'settled' : 'reverted';
        tx.settledAt = Date.now();

        if (verified) {
            this.balance -= tx.amount;
        }

        this.settledTransactions.push(tx);
        return tx;
    }

    getTransactionHistory() {
        return [...this.settledTransactions].reverse();
    }
}

/**
 * The Service Marketplace
 * Central registry where all agent services are listed and discoverable.
 */
export class ServiceMarketplace {
    constructor() {
        this.listings = [];
        this.requests = [];
        this.completedExchanges = [];
    }

    /**
     * An agent publishes a service to the marketplace.
     */
    publishService(agent, serviceName, description, price, category) {
        const service = new AgentService({
            name: serviceName,
            description,
            price,
            category,
            agentId: agent.nodeId,
            agentName: agent.name
        });
        this.listings.push(service);
        return service;
    }

    /**
     * Discover services by category, price range, or agent trust score.
     */
    discoverServices({ category, maxPrice, minTrust, excludeAgent } = {}) {
        return this.listings.filter(svc => {
            if (category && svc.category !== category) return false;
            if (maxPrice && svc.price > maxPrice) return false;
            if (excludeAgent && svc.agentId === excludeAgent) return false;
            return true;
        });
    }

    /**
     * Agent requests a service from another agent.
     * Returns a ServiceRequest that must be fulfilled and verified.
     */
    requestService(fromAgent, service, customPrompt) {
        const request = new ServiceRequest({
            from: { agentId: fromAgent.nodeId, name: fromAgent.name },
            to: { agentId: service.agentId, name: service.agentName },
            service,
            customPrompt
        });
        this.requests.push(request);
        return request;
    }

    /**
     * Mark a request as fulfilled with a deliverable.
     */
    fulfillRequest(requestId, result) {
        const request = this.requests.find(r => r.id === requestId);
        if (!request) return null;

        request.status = 'fulfilled';
        request.result = result;
        request.completedAt = Date.now();
        return request;
    }

    /**
     * Mark a request as settled after IVI verification.
     */
    settleRequest(requestId, settlement) {
        const request = this.requests.find(r => r.id === requestId);
        if (!request) return null;

        request.status = settlement.verified ? 'settled' : 'disputed';
        request.settlement = settlement;

        if (settlement.verified) {
            request.service.completedJobs++;
            request.service.rating = Math.min(5.0,
                (request.service.rating * (request.service.completedJobs - 1) +
                    settlement.closureScore * 5) / request.service.completedJobs
            );
            this.completedExchanges.push(request);
        }

        return request;
    }

    /**
     * Get marketplace analytics.
     */
    getAnalytics() {
        return {
            totalListings: this.listings.length,
            activeRequests: this.requests.filter(r => r.status === 'pending' || r.status === 'in_progress').length,
            completedExchanges: this.completedExchanges.length,
            totalVolume: this.completedExchanges.reduce((s, r) => s + r.service.price, 0),
            topServices: this.listings
                .sort((a, b) => b.completedJobs - a.completedJobs)
                .slice(0, 5)
        };
    }
}

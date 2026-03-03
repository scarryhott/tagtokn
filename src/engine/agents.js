/**
 * ICR Agents for the NFC Network
 * I: Information / Identity
 * C: Closure / Confirmation
 * R: Relation / Recommender
 */

export class ICRAgent {
    constructor(nodeId, name, type, x, y, balance = 1000) {
        this.nodeId = nodeId;
        this.name = name;
        this.type = type;
        this.x = x || Math.random() * 1000;
        this.y = y || Math.random() * 1000;
        this.balance = balance;
        this.targetNode = null;
        this.speed = 10; // Travel speed

        // Systemic needs (Finite Game states)
        this.needs = {
            energy: 1.0,    // Seek coffee
            knowledge: 1.0, // Seek books
            social: 1.0     // Seek clubs/events
        };

        this.i_bits = Math.random(); // Information entropy
        this.c_score = 0.5; // Closure consistency
        this.r_weight = 1.0; // Relational density
        this.history = [];
        this.secrets = []; // Story elements from "Secret Game"
        this.own_secret = this._generateInitialSecret();
        this.trusted_secrets = new Map(); // secret -> count of sources

        // --- Digital Economy Layer (Real Economy Simulation) ---
        this.walletAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
        this.publicKey = `pk_${Math.random().toString(36).substr(2, 16)}`;
        this.services = this._initializeServices();
        this.knowledgeBase = []; // Simulated "Codex" access

        // --- Sub-app Layer (Human Interface) ---
        this.ownedSubApps = [];
        this.researchState = {
            isResearching: false,
            targetApp: null,
            progress: 0,
            requiredPOI: 3.5 // Cumulative POI score required to "ship"
        };
    }

    _initializeServices() {
        if (this.type === 'business') {
            const bizServices = {
                'coffee': ['Barista Training', 'Direct Trade Sourcing'],
                'bookstore': ['Rare Manuscript Sourcing', 'Manuscript Restoration'],
                'club': ['Event Curation', 'Audio Engineering']
            };
            return bizServices[this.nodeId.includes('node-4') ? 'club' : (this.nodeId.includes('node-1') ? 'coffee' : 'bookstore')] || ['General Consulting'];
        }
        if (this.type === 'consumer') {
            return ['Code Review', 'Content Strategy', 'UX Design'];
        }
        return ['Policy Design', 'Community Moderation'];
    }

    _generateInitialSecret() {
        const stories = [
            "a dead crow fell out of a tree",
            "dropped coffee on my pants",
            "saw a black cat",
            "lost girl from the family last night",
            "birds flying near the pond",
            "spilled coffee into the street",
            "cold weather is so harsh"
        ];
        return stories[Math.floor(Math.random() * stories.length)];
    }

    /**
     * Goal-directed decision maker. 
     * Seeks the node that fulfills the most urgent need.
     */
    decide(allNodes) {
        if (this.type !== 'consumer') return null;

        // Find the most urgent need
        let maxNeed = 0;
        let mostUrgent = null;
        for (const [key, value] of Object.entries(this.needs)) {
            if (value > maxNeed) {
                maxNeed = value;
                mostUrgent = key;
            }
        }

        // Map needs to node types
        const typeMap = {
            energy: 'coffee',
            knowledge: 'bookstore',
            social: 'club'
        };

        const targetType = typeMap[mostUrgent];
        const candidates = allNodes.filter(n => n.nodeType === targetType);

        if (candidates.length > 0) {
            return candidates[0];
        }

        return allNodes[Math.floor(Math.random() * allNodes.length)];
    }

    /**
     * Decay needs over time (Entropy)
     */
    evolveNeeds() {
        if (this.type !== 'consumer') return;
        this.needs.energy += 0.01;
        this.needs.knowledge += 0.005;
        this.needs.social += 0.008;
    }

    /**
     * Fulfill a need by interacting with a node
     */
    fulfillNeed(nodeType) {
        if (nodeType === 'coffee') this.needs.energy = 0;
        if (nodeType === 'bookstore') this.needs.knowledge = 0;
        if (nodeType === 'club') this.needs.social = 0;
        this.c_score = Math.min(1.0, this.c_score + 0.05);
    }

    /**
     * Participate in the "Secret Game" (Full Word-of-Mouth Protocol)
     * Rule 1: Secrets are combined by two or more individuals into a story.
     * Rule 20: Dual elements (Real/Fake) are merged. 
     * Rule 6: Trust after multiple sources.
     */
    exchangeSecret(otherAgent, ledger) {
        // Elements from Alice/Bob/Chauncey from secretgame.docx
        const storyA = this.own_secret;
        const storyB = otherAgent.own_secret;

        // Combination rule: Create a combined fragment (Rule 1)
        const elementA = storyA.split(' ')[0];
        const elementB = storyB.split(' ')[0];
        const combinedFragment = `${elementA}-${elementB}`;

        // Add to local memories (Rule 6: trust from multiple sources)
        const updateTrusted = (agent, source, element) => {
            const memory = agent.trusted_secrets.get(element) || { sources: new Set(), count: 0 };
            memory.sources.add(source.nodeId);
            memory.count = memory.sources.size;
            agent.trusted_secrets.set(element, memory);

            // If heard from 2+ sources, C_SCORE (Closure) improves
            if (memory.count >= 2) {
                agent.c_score = Math.min(1.0, agent.c_score + 0.08);
            }
        };

        updateTrusted(this, otherAgent, storyB);
        updateTrusted(otherAgent, this, storyA);

        // Propagate to global ledger (Rule 1, 32)
        if (ledger) {
            ledger.propagateStory(this.name, otherAgent.name, combinedFragment, true);
        }

        // Relation (R) growth from shared narratives
        this.r_weight += 0.08;
        otherAgent.r_weight += 0.08;

        return {
            combinedFragment,
            sourceA: this.name,
            sourceB: otherAgent.name,
            noveltyScale: ledger?.isNovel(combinedFragment) ? 1.0 : 0.2
        };
    }

    /**
     * Move towards target location.
     * Returns true if arrived, false if moving.
     */
    moveTowards(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            this.x = targetX;
            this.y = targetY;
            return true;
        }

        const angle = Math.atan2(dy, dx);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
        return false;
    }

    /**
     * Check if other node is in NFC range (proximate).
     */
    isNear(otherX, otherY, range = 50) {
        const dx = otherX - this.x;
        const dy = otherY - this.y;
        return Math.sqrt(dx * dx + dy * dy) < range;
    }

    /**
     * Start developing a new human-facing tool (Sub-app)
     */
    startResearch(appName, category) {
        if (this.researchState.isResearching) return false;
        this.researchState = {
            isResearching: true,
            targetApp: { name: appName, category },
            progress: 0,
            requiredPOI: 3.5 + Math.random() * 2 // Variable R&D difficulty
        };
        return true;
    }

    /**
     * Contribute POI "energy" to the current R&D project.
     * This is triggered when the agent completes a verified L2 interaction.
     */
    contributeResearch(poiScore) {
        if (!this.researchState.isResearching) return null;

        this.researchState.progress += poiScore;

        // Check if finished
        if (this.researchState.progress >= this.researchState.requiredPOI) {
            const app = {
                name: this.researchState.targetApp.name,
                category: this.researchState.targetApp.category,
                verificationScore: this.researchState.progress / this.researchState.requiredPOI,
                description: `A high-trust ${this.researchState.targetApp.category} tool built by ${this.name}.`,
                suggestedPrice: 10 + Math.floor(Math.random() * 90)
            };

            this.researchState.isResearching = false;
            this.researchState.progress = 0;
            this.ownedSubApps.push(app);
            return app; // Ready to be registered in SubAppEngine
        }

        return null;
    }

    updateBalance(delta) {
        this.balance += delta;
        return this.balance;
    }
}

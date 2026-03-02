/**
 * Agent Autonomy Engine
 * 
 * Gives agents the ability to autonomously:
 * - Use Codex to analyze their position in the network
 * - Build tools and automations for internet+crypto interactions
 * - Adapt their service offerings based on what the network rewards
 * - Make strategic decisions about who to interact with
 * 
 * The key insight: agents don't just passively offer services —
 * they actively build tools, learn from the network's feedback (POI scores),
 * and evolve their behavior to optimize their position on the digital map.
 */

/**
 * A Tool built by an agent via Codex.
 * Tools are automations that help agents interact with the internet and crypto.
 */
export class AgentTool {
    constructor({ name, type, description, agentId, trigger, effect }) {
        this.id = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        this.name = name;
        this.type = type;       // 'automation' | 'monitor' | 'payment' | 'analytics' | 'outreach'
        this.description = description;
        this.agentId = agentId;
        this.trigger = trigger; // When does this tool fire?
        this.effect = effect;   // What does it do?
        this.executions = 0;
        this.lastRun = null;
        this.createdAt = Date.now();
        this.value = 0;         // How much value has this tool generated?
    }
}

/**
 * The autonomy engine for a single agent.
 * Each agent has one of these — it's their "brain" for strategic decisions.
 */
export class AgentAutonomy {
    constructor(agent, codexInterface) {
        this.agent = agent;
        this.codex = codexInterface;
        this.tools = [];
        this.strategy = this._initStrategy();
        this.memory = {
            successfulInteractions: [],
            failedInteractions: [],
            profitableServices: {},    // serviceName -> revenue
            trustedPartners: {},       // agentId -> { interactions, avgScore }
            marketDemand: {},          // category -> demand score
            poiScoreHistory: [],       // Track our POI scores over time
        };
        this.adaptationCount = 0;
        this.capabilities = new Set(); // What can this agent do?
    }

    _initStrategy() {
        return {
            pricing: 'market',          // 'aggressive' | 'market' | 'premium'
            partnerSelection: 'trust',  // 'trust' | 'profit' | 'exploration'
            serviceEvolution: 'demand', // 'demand' | 'specialization' | 'diversification'
            toolBuildFrequency: 3,      // Build a tool every N epochs
            riskTolerance: 0.5          // 0-1, affects willingness to interact with unknown agents
        };
    }

    /**
     * The agent's autonomous decision loop.
     * Called each epoch — the agent analyzes its position and decides what to do.
     * 
     * @param {Object} networkState - Current network topology and metrics
     * @param {Object} marketplaceState - Current marketplace analytics
     * @param {Object} epochMetrics - Learning metrics from the current epoch
     * @returns {Object} Actions the agent wants to take
     */
    async think(networkState, marketplaceState, epochMetrics) {
        const actions = [];

        // 1. Analyze position in the network
        const position = this._analyzePosition(networkState);

        // 2. Review economic performance
        const performance = this._reviewPerformance();

        // 3. Decide on tool building
        const toolDecision = await this._decideToolBuilding(position, performance, epochMetrics);
        if (toolDecision) actions.push(toolDecision);

        // 4. Adapt strategy based on POI feedback
        const adaptation = this._adaptStrategy(position, performance, epochMetrics);
        if (adaptation) actions.push(adaptation);

        // 5. Decide on service evolution
        const serviceAction = this._evolveServices(marketplaceState, performance);
        if (serviceAction) actions.push(serviceAction);

        // 6. Select next interaction partner
        const partnerAction = this._selectPartner(networkState);
        if (partnerAction) actions.push(partnerAction);

        return actions;
    }

    /**
     * Analyze the agent's position in the network topology.
     * Where am I on the digital map? Who am I connected to? How central am I?
     */
    _analyzePosition(networkState) {
        const myEdges = networkState.edges.filter(e =>
            e.from === this.agent.nodeId || e.to === this.agent.nodeId
        );

        const partners = new Set(myEdges.map(e =>
            e.from === this.agent.nodeId ? e.to : e.from
        ));

        const avgPoiScore = myEdges.length > 0
            ? myEdges.reduce((s, e) => s + e.poiScore, 0) / myEdges.length
            : 0;

        // Betweenness centrality approximation
        const totalEdgesInNetwork = networkState.edges.length;
        const centrality = totalEdgesInNetwork > 0 ? myEdges.length / totalEdgesInNetwork : 0;

        return {
            connections: partners.size,
            totalInteractions: myEdges.reduce((s, e) => s + e.weight, 0),
            avgPoiScore,
            centrality,
            totalVolume: myEdges.reduce((s, e) => s + e.volume, 0),
            isPeripheral: partners.size <= 1,
            isHub: partners.size >= 3
        };
    }

    /**
     * Review the agent's economic performance.
     */
    _reviewPerformance() {
        const recentPoi = this.memory.poiScoreHistory.slice(-10);
        const avgPoi = recentPoi.length > 0 ? recentPoi.reduce((a, b) => a + b, 0) / recentPoi.length : 0;
        const poiTrend = recentPoi.length > 2
            ? recentPoi.slice(-3).reduce((a, b) => a + b, 0) / 3 - recentPoi.slice(0, 3).reduce((a, b) => a + b, 0) / 3
            : 0;

        const topServices = Object.entries(this.memory.profitableServices)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        const trustedPartnerCount = Object.values(this.memory.trustedPartners)
            .filter(p => p.avgScore > 0.7).length;

        return {
            avgPoi,
            poiTrend,
            balance: this.agent.balance,
            topServices,
            trustedPartnerCount,
            successRate: this.memory.successfulInteractions.length /
                (this.memory.successfulInteractions.length + this.memory.failedInteractions.length + 1)
        };
    }

    /**
     * Decide whether to build a new tool.
     * Tools are how agents extend their capabilities to interact with the internet.
     */
    async _decideToolBuilding(position, performance, epochMetrics) {
        // Build a tool if we haven't built one recently
        if (this.adaptationCount % this.strategy.toolBuildFrequency !== 0) return null;

        const toolTemplates = [
            {
                condition: () => position.isPeripheral,
                tool: {
                    name: 'Network Outreach Bot',
                    type: 'outreach',
                    description: 'Automatically discovers and initiates contact with promising agents.',
                    trigger: 'low_connections',
                    effect: 'increase_connections'
                }
            },
            {
                condition: () => performance.avgPoi < 0.5,
                tool: {
                    name: 'POI Optimizer',
                    type: 'analytics',
                    description: 'Analyzes interaction patterns to maximize verification scores.',
                    trigger: 'low_poi',
                    effect: 'optimize_interactions'
                }
            },
            {
                condition: () => performance.balance < 200,
                tool: {
                    name: 'Micro-Payment Router',
                    type: 'payment',
                    description: 'Optimizes crypto payment routing for minimal fees.',
                    trigger: 'low_balance',
                    effect: 'optimize_payments'
                }
            },
            {
                condition: () => performance.topServices.length === 0,
                tool: {
                    name: 'Service Demand Scanner',
                    type: 'monitor',
                    description: 'Monitors marketplace demand to identify high-value service opportunities.',
                    trigger: 'epoch_start',
                    effect: 'discover_demand'
                }
            },
            {
                condition: () => position.isHub,
                tool: {
                    name: 'Trust Graph Analyzer',
                    type: 'analytics',
                    description: 'Maps trust relationships to identify bridging opportunities.',
                    trigger: 'new_connection',
                    effect: 'analyze_trust'
                }
            },
            {
                condition: () => true, tool: {
                    name: 'Interaction Scheduler',
                    type: 'automation',
                    description: 'Schedules regular interactions with high-trust partners.',
                    trigger: 'daily',
                    effect: 'maintain_relationships'
                }
            }
        ];

        // Find the first applicable tool that hasn't been built yet
        const existingNames = new Set(this.tools.map(t => t.name));
        const applicable = toolTemplates.find(t => t.condition() && !existingNames.has(t.tool.name));

        if (applicable) {
            const newTool = new AgentTool({
                ...applicable.tool,
                agentId: this.agent.nodeId
            });
            this.tools.push(newTool);
            this.capabilities.add(applicable.tool.type);

            return {
                type: 'build_tool',
                tool: newTool,
                reasoning: `Built ${newTool.name} to ${newTool.effect}`
            };
        }
        return null;
    }

    /**
     * Adapt strategy based on POI feedback.
     * This is how the agent learns — POI scores are the feedback signal.
     */
    _adaptStrategy(position, performance, epochMetrics) {
        this.adaptationCount++;
        let adapted = false;
        let description = '';

        // If POI scores are declining, adjust strategy
        if (performance.poiTrend < -0.05) {
            if (this.strategy.partnerSelection === 'profit') {
                this.strategy.partnerSelection = 'trust';
                description = 'Shifted to trust-based partner selection (POI declining)';
                adapted = true;
            } else if (this.strategy.pricing === 'aggressive') {
                this.strategy.pricing = 'market';
                description = 'Moderated pricing strategy (POI declining)';
                adapted = true;
            }
        }

        // If peripheral, increase risk tolerance to explore more
        if (position.isPeripheral && this.strategy.riskTolerance < 0.8) {
            this.strategy.riskTolerance = Math.min(1, this.strategy.riskTolerance + 0.1);
            description = `Increased risk tolerance to ${this.strategy.riskTolerance.toFixed(1)} (peripheral position)`;
            adapted = true;
        }

        // If hub, focus on specialization
        if (position.isHub && this.strategy.serviceEvolution !== 'specialization') {
            this.strategy.serviceEvolution = 'specialization';
            description = 'Pivoted to specialization strategy (hub position)';
            adapted = true;
        }

        // If success rate is high, try premium pricing
        if (performance.successRate > 0.8 && this.strategy.pricing !== 'premium') {
            this.strategy.pricing = 'premium';
            description = 'Elevated to premium pricing (high success rate)';
            adapted = true;
        }

        return adapted ? {
            type: 'adapt_strategy',
            description,
            strategy: { ...this.strategy }
        } : null;
    }

    /**
     * Evolve service offerings based on marketplace demand.
     */
    _evolveServices(marketplaceState, performance) {
        if (this.strategy.serviceEvolution === 'demand') {
            // Check what categories are in demand
            const demandSignals = marketplaceState.topServices || [];
            if (demandSignals.length > 0) {
                const topCategory = demandSignals[0]?.category;
                if (topCategory && !this.memory.marketDemand[topCategory]) {
                    this.memory.marketDemand[topCategory] = 1;
                    return {
                        type: 'evolve_services',
                        description: `Identified demand for "${topCategory}" services`,
                        category: topCategory
                    };
                }
            }
        }
        return null;
    }

    /**
     * Select the best partner for the next interaction.
     * This is strategic — not random.
     */
    _selectPartner(networkState) {
        switch (this.strategy.partnerSelection) {
            case 'trust': {
                // Prefer agents we've had high POI scores with
                const trustedPairs = Object.entries(this.memory.trustedPartners)
                    .filter(([id, data]) => data.avgScore > 0.6)
                    .sort((a, b) => b[1].avgScore - a[1].avgScore);
                if (trustedPairs.length > 0) {
                    return { type: 'select_partner', partnerId: trustedPairs[0][0], reason: 'high_trust' };
                }
                break;
            }
            case 'profit': {
                // Prefer partners that have led to profitable interactions
                const profitable = Object.entries(this.memory.trustedPartners)
                    .sort((a, b) => b[1].interactions - a[1].interactions);
                if (profitable.length > 0) {
                    return { type: 'select_partner', partnerId: profitable[0][0], reason: 'high_profit' };
                }
                break;
            }
            case 'exploration': {
                // Prefer agents we haven't interacted with
                const known = new Set(Object.keys(this.memory.trustedPartners));
                const unknown = networkState.nodes.filter(n =>
                    n.id !== this.agent.nodeId && !known.has(n.id)
                );
                if (unknown.length > 0) {
                    const target = unknown[Math.floor(Math.random() * unknown.length)];
                    return { type: 'select_partner', partnerId: target.id, reason: 'exploration' };
                }
                break;
            }
        }
        return null;
    }

    /**
     * Record the outcome of an interaction to update memory.
     */
    learn(partnerId, poiScore, amount, success) {
        this.memory.poiScoreHistory.push(poiScore);
        if (this.memory.poiScoreHistory.length > 50) this.memory.poiScoreHistory.shift();

        if (success) {
            this.memory.successfulInteractions.push({ partnerId, poiScore, amount, time: Date.now() });
        } else {
            this.memory.failedInteractions.push({ partnerId, poiScore, amount, time: Date.now() });
        }

        // Update trusted partners
        const existing = this.memory.trustedPartners[partnerId] || { interactions: 0, avgScore: 0, totalScores: 0 };
        existing.interactions++;
        existing.totalScores += poiScore;
        existing.avgScore = existing.totalScores / existing.interactions;
        this.memory.trustedPartners[partnerId] = existing;
    }

    /**
     * Run all active tools.
     * Returns effects to apply.
     */
    runTools(networkState) {
        const effects = [];
        for (const tool of this.tools) {
            const shouldRun = this._checkToolTrigger(tool, networkState);
            if (shouldRun) {
                tool.executions++;
                tool.lastRun = Date.now();
                effects.push({
                    toolId: tool.id,
                    toolName: tool.name,
                    effect: tool.effect,
                    agentId: this.agent.nodeId
                });
            }
        }
        return effects;
    }

    _checkToolTrigger(tool, networkState) {
        switch (tool.trigger) {
            case 'low_connections': return this._analyzePosition(networkState).isPeripheral;
            case 'low_poi': return this.memory.poiScoreHistory.slice(-5).reduce((a, b) => a + b, 0) / 5 < 0.5;
            case 'low_balance': return this.agent.balance < 200;
            case 'epoch_start': return true;
            case 'daily': return !tool.lastRun || (Date.now() - tool.lastRun) > 10000; // every 10s in sim time
            case 'new_connection': return true;
            default: return Math.random() > 0.7;
        }
    }

    /**
     * Get a summary of this agent's autonomous state.
     */
    getSummary() {
        const position = this.memory.poiScoreHistory.length > 0
            ? this.memory.poiScoreHistory.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, this.memory.poiScoreHistory.length)
            : 0;

        return {
            agentId: this.agent.nodeId,
            agentName: this.agent.name,
            toolCount: this.tools.length,
            tools: this.tools.map(t => ({ name: t.name, type: t.type, executions: t.executions })),
            strategy: { ...this.strategy },
            adaptations: this.adaptationCount,
            avgPoi: position,
            capabilities: [...this.capabilities],
            trustedPartners: Object.keys(this.memory.trustedPartners).length,
            successRate: this.memory.successfulInteractions.length /
                (this.memory.successfulInteractions.length + this.memory.failedInteractions.length + 1)
        };
    }
}

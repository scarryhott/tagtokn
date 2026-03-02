/**
 * Network Learning Engine
 * 
 * Measures whether the intra-agent network is effectively learning
 * through simulated economics. POI (Proof of Interaction) acts as the
 * coordination mechanism on the digital map of humanity.
 * 
 * The network "learns" when:
 *   - Closure rates improve over time (verification efficiency)
 *   - Economic velocity increases (resources flow faster to where needed)
 *   - Knowledge diffusion accelerates (secrets propagate)
 *   - Agents specialize (focus on profitable services)
 *   - Trust clusters form (high-trust subgraphs emerge)
 *   - Gini coefficient decreases (wealth distributes more evenly)
 */

export class NetworkLearningEngine {
    constructor() {
        this.epochs = [];          // Epoch-level snapshots
        this.currentEpoch = 0;
        this.epochDuration = 15000; // 15 seconds per epoch
        this.epochStart = Date.now();

        // Running metrics per epoch
        this._currentMetrics = this._freshMetrics();
    }

    _freshMetrics() {
        return {
            transactions: 0,
            closures: 0,
            collapses: 0,
            totalVolume: 0,
            encounters: 0,
            secretsShared: 0,
            serviceFulfillments: 0,
            toolsBuilt: 0,
            avgClosureScore: 0,
            closureScores: [],
            balanceSnapshots: {},
            edges: new Map(),  // "nodeA-nodeB" -> { count, totalAmount, avgScore }
            agentActions: {}   // agentId -> { actions: [], adaptations: 0 }
        };
    }

    /**
     * Record a verified interaction (from either L1 or L2)
     */
    recordInteraction(tx, auditResult) {
        const m = this._currentMetrics;
        m.transactions++;
        m.totalVolume += tx.amount;

        if (auditResult && auditResult.isClosure) {
            m.closures++;
            m.closureScores.push(auditResult.score);
            m.avgClosureScore = m.closureScores.reduce((a, b) => a + b, 0) / m.closureScores.length;
        } else {
            m.collapses++;
        }

        // Track edge weights (the topology)
        const edgeKey = [tx.from, tx.to].sort().join('-');
        const existing = m.edges.get(edgeKey) || { count: 0, totalAmount: 0, scores: [] };
        existing.count++;
        existing.totalAmount += tx.amount;
        if (auditResult) existing.scores.push(auditResult.score);
        m.edges.set(edgeKey, existing);
    }

    recordEncounter(agentA, agentB) {
        this._currentMetrics.encounters++;
    }

    recordServiceFulfillment(agentId) {
        this._currentMetrics.serviceFulfillments++;
    }

    recordToolBuilt(agentId, toolName) {
        this._currentMetrics.toolsBuilt++;
        if (!this._currentMetrics.agentActions[agentId]) {
            this._currentMetrics.agentActions[agentId] = { actions: [], adaptations: 0 };
        }
        this._currentMetrics.agentActions[agentId].actions.push({ type: 'tool', name: toolName, time: Date.now() });
    }

    recordAdaptation(agentId, description) {
        if (!this._currentMetrics.agentActions[agentId]) {
            this._currentMetrics.agentActions[agentId] = { actions: [], adaptations: 0 };
        }
        this._currentMetrics.agentActions[agentId].adaptations++;
        this._currentMetrics.agentActions[agentId].actions.push({ type: 'adapt', desc: description, time: Date.now() });
    }

    /**
     * Close the current epoch and compute learning metrics.
     * Called periodically by the simulation loop.
     */
    closeEpoch(agents) {
        const m = this._currentMetrics;
        const elapsed = Date.now() - this.epochStart;

        // Compute balance distribution (Gini coefficient)
        const balances = agents.map(a => a.balance).sort((a, b) => a - b);
        const gini = this._computeGini(balances);

        // Compute network density
        const possibleEdges = (agents.length * (agents.length - 1)) / 2;
        const networkDensity = possibleEdges > 0 ? m.edges.size / possibleEdges : 0;

        // Compute trust clustering coefficient
        const trustClustering = this._computeTrustClustering(agents, m.edges);

        // Compute knowledge diffusion rate
        const totalSecrets = agents.reduce((s, a) => s + a.secrets.length, 0);
        const uniqueSecrets = new Set(agents.flatMap(a => a.secrets)).size;
        const diffusionRate = uniqueSecrets > 0 ? totalSecrets / (uniqueSecrets * agents.length) : 0;

        // Compute specialization index (how focused are agents' interactions?)
        const specialization = this._computeSpecialization(m.edges, agents);

        // Economic velocity (volume per unit time)
        const velocity = elapsed > 0 ? m.totalVolume / (elapsed / 1000) : 0;

        // Closure rate (learning efficiency)
        const closureRate = m.transactions > 0 ? m.closures / m.transactions : 0;

        // POI coordination score (how well does POI organize the network?)
        // Combines: closure rate * trust clustering * (1 - gini) * density
        const poiScore = closureRate * (trustClustering + 0.1) * (1 - gini) * (networkDensity + 0.1);

        const epoch = {
            epoch: this.currentEpoch,
            timestamp: Date.now(),
            duration: elapsed,
            metrics: {
                transactions: m.transactions,
                closures: m.closures,
                collapses: m.collapses,
                totalVolume: m.totalVolume,
                encounters: m.encounters,
                serviceFulfillments: m.serviceFulfillments,
                toolsBuilt: m.toolsBuilt
            },
            learning: {
                closureRate,
                avgClosureScore: m.avgClosureScore,
                velocity,
                gini,
                networkDensity,
                trustClustering,
                diffusionRate,
                specialization,
                poiScore
            },
            topology: {
                nodeCount: agents.length,
                edgeCount: m.edges.size,
                edges: Array.from(m.edges.entries()).map(([key, val]) => ({
                    nodes: key.split('-'),
                    interactions: val.count,
                    volume: val.totalAmount,
                    avgScore: val.scores.length > 0 ? val.scores.reduce((a, b) => a + b, 0) / val.scores.length : 0
                }))
            },
            agentStates: agents.map(a => ({
                id: a.nodeId,
                name: a.name,
                balance: a.balance,
                trust: a.c_score,
                connections: a.r_weight,
                secretCount: a.secrets.length
            }))
        };

        this.epochs.push(epoch);
        this.currentEpoch++;
        this.epochStart = Date.now();
        this._currentMetrics = this._freshMetrics();

        return epoch;
    }

    /**
     * Are we learning? Compare recent epochs to earlier ones.
     */
    getLearningTrend() {
        if (this.epochs.length < 2) return null;

        const recent = this.epochs.slice(-3);
        const earlier = this.epochs.slice(0, Math.max(1, Math.floor(this.epochs.length / 2)));

        const avgRecent = (arr, key) => arr.reduce((s, e) => s + e.learning[key], 0) / arr.length;
        const avgEarlier = (arr, key) => arr.reduce((s, e) => s + e.learning[key], 0) / arr.length;

        return {
            closureRateTrend: avgRecent(recent, 'closureRate') - avgEarlier(earlier, 'closureRate'),
            velocityTrend: avgRecent(recent, 'velocity') - avgEarlier(earlier, 'velocity'),
            giniTrend: avgRecent(recent, 'gini') - avgEarlier(earlier, 'gini'), // negative is good
            densityTrend: avgRecent(recent, 'networkDensity') - avgEarlier(earlier, 'networkDensity'),
            trustTrend: avgRecent(recent, 'trustClustering') - avgEarlier(earlier, 'trustClustering'),
            poiTrend: avgRecent(recent, 'poiScore') - avgEarlier(earlier, 'poiScore'),
            isLearning: (
                avgRecent(recent, 'closureRate') > avgEarlier(earlier, 'closureRate') ||
                avgRecent(recent, 'networkDensity') > avgEarlier(earlier, 'networkDensity') ||
                avgRecent(recent, 'gini') < avgEarlier(earlier, 'gini')
            )
        };
    }

    /**
     * Get the current topology as a graph for visualization.
     * This IS the "digital map of humanity" — nodes are people,
     * edges are verified interactions weighted by POI score.
     */
    getTopologyGraph(agents) {
        const m = this._currentMetrics;
        // Also include historical edges
        const allEdges = new Map();

        this.epochs.forEach(epoch => {
            epoch.topology.edges.forEach(edge => {
                const key = edge.nodes.sort().join('-');
                const existing = allEdges.get(key) || { count: 0, totalVolume: 0, scores: [] };
                existing.count += edge.interactions;
                existing.totalVolume += edge.volume;
                if (edge.avgScore > 0) existing.scores.push(edge.avgScore);
                allEdges.set(key, existing);
            });
        });

        // Add current epoch edges
        m.edges.forEach((val, key) => {
            const existing = allEdges.get(key) || { count: 0, totalVolume: 0, scores: [] };
            existing.count += val.count;
            existing.totalVolume += val.totalAmount;
            existing.scores.push(...val.scores);
            allEdges.set(key, existing);
        });

        return {
            nodes: agents.map(a => ({
                id: a.nodeId,
                name: a.name,
                type: a.type,
                x: a.x,
                y: a.y,
                trust: a.c_score,
                balance: a.balance,
                connections: a.r_weight,
                wallet: a.walletAddress
            })),
            edges: Array.from(allEdges.entries()).map(([key, val]) => {
                const [from, to] = key.split('-');
                const avgScore = val.scores.length > 0 ? val.scores.reduce((a, b) => a + b, 0) / val.scores.length : 0.5;
                return {
                    from, to,
                    weight: val.count,
                    volume: val.totalVolume,
                    poiScore: avgScore,    // This is the POI coordination strength
                    strength: Math.min(1, val.count / 10) * avgScore // Normalized edge strength
                };
            })
        };
    }

    _computeGini(sorted) {
        const n = sorted.length;
        if (n === 0) return 0;
        const total = sorted.reduce((a, b) => a + b, 0);
        if (total === 0) return 0;
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += (2 * (i + 1) - n - 1) * sorted[i];
        }
        return sum / (n * total);
    }

    _computeTrustClustering(agents, edges) {
        // Simplified clustering: for each agent, what fraction of their neighbors are also connected?
        const adjacency = {};
        agents.forEach(a => adjacency[a.nodeId] = new Set());

        edges.forEach((val, key) => {
            const [a, b] = key.split('-');
            if (adjacency[a]) adjacency[a].add(b);
            if (adjacency[b]) adjacency[b].add(a);
        });

        let totalCoeff = 0;
        let counted = 0;

        for (const [node, neighbors] of Object.entries(adjacency)) {
            if (neighbors.size < 2) continue;
            const neighArray = [...neighbors];
            let triangles = 0;
            const possible = (neighArray.length * (neighArray.length - 1)) / 2;
            for (let i = 0; i < neighArray.length; i++) {
                for (let j = i + 1; j < neighArray.length; j++) {
                    if (adjacency[neighArray[i]]?.has(neighArray[j])) triangles++;
                }
            }
            totalCoeff += possible > 0 ? triangles / possible : 0;
            counted++;
        }
        return counted > 0 ? totalCoeff / counted : 0;
    }

    _computeSpecialization(edges, agents) {
        // Measure how focused each agent's interactions are
        const agentPartners = {};
        edges.forEach((val, key) => {
            const [a, b] = key.split('-');
            agentPartners[a] = (agentPartners[a] || 0) + 1;
            agentPartners[b] = (agentPartners[b] || 0) + 1;
        });

        const values = Object.values(agentPartners);
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        return Math.min(1, Math.sqrt(variance) / (mean + 0.001)); // Higher = more specialized
    }
}

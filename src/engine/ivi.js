/**
 * IVI-NFC Engine
 * Implementing the Closure vs Collapse audit logic.
 */

export const SIGMA = (x) => 1 / (1 + Math.exp(-x));

export class IVIEngine {
    constructor(params = {}) {
        this.alpha = params.alpha || 1.5; // Reward grounding
        this.beta = params.beta || 1.2;  // Penalize velocity
        this.gamma = params.gamma || 3.0; // Systemic risk control
        this.tau = params.tau || 0.6;    // Closure threshold
        this.epsilon = 1e-9;
    }

    /**
     * Calculate Loop Velocity (i)
     * i = (Sum of Loop Amounts) / (Max Time - Min Time)
     */
    calculateVelocity(loopEvents) {
        if (loopEvents.length === 0) return 0;
        const totalAmount = loopEvents.reduce((sum, e) => sum + e.amount, 0);
        const times = loopEvents.map(e => e.timestamp);
        const deltaT = Math.max(...times) - Math.min(...times);
        return totalAmount / Math.max(deltaT, 1); // Minimum 1ms/unit to avoid infinity
    }

    /**
     * Calculate Relative Velocity (i_rel)
     * i_rel = Loop Velocity / Global Network Velocity
     */
    calculateRelativeVelocity(loopVelocity, networkVelocity) {
        return loopVelocity / (networkVelocity + this.epsilon);
    }

    /**
     * Calculate Context Grounding (r)
     * r = Loop Average Node Degree / Network Average Degree
     */
    calculateContext(loopNodes, nodeDegrees, networkAvgDegree) {
        if (loopNodes.length === 0) return 0;
        const avgDegree = loopNodes.reduce((sum, node) => sum + (nodeDegrees[node] || 0), 0) / loopNodes.length;
        return avgDegree / (networkAvgDegree + this.epsilon);
    }

    /**
     * Calculate Global Indeterminacy / Kakeya Pressure (E)
     * Herfindahl-style concentration of volume
     */
    calculateKakeya(nodeVolumes, totalVolume) {
        if (totalVolume === 0) return 0;
        let sumSquares = 0;
        for (const volume of Object.values(nodeVolumes)) {
            const share = volume / (totalVolume + this.epsilon);
            sumSquares += share * share;
        }
        return sumSquares;
    }

    /**
     * Calculate Closure Score (S)
     * S = sigma(alpha * ln(r) - beta * ln(i) - gamma * E)
     */
    calculateClosureScore(i, r, E) {
        const val = this.alpha * Math.log(r + this.epsilon) -
            this.beta * Math.log(i + this.epsilon) -
            this.gamma * E;
        return SIGMA(val);
    }

    /**
     * Audit a loop
     * Returns { isClosure: boolean, score: number, reward: number, contribution: number, weightUpdate: object }
     */
    audit(loop, networkStats) {
        const v = this.calculateVelocity(loop.events);
        const i = this.calculateRelativeVelocity(v, networkStats.globalVelocity);
        const r = this.calculateContext(loop.nodes, networkStats.nodeDegrees, networkStats.networkAvgDegree);
        const E = this.calculateKakeya(networkStats.nodeVolumes, networkStats.totalVolume);

        let score = this.calculateClosureScore(i, r, E);

        // Secret Verification Boost (Full Word of Mouth)
        // Rule 6: Trust after multiple sources. Rule 32: Novelty requirement.
        if (loop.secretFactor > 0) {
            // Factor is boosted by novelty and verifiability context
            const noveltyBonus = loop.isNovel ? 0.3 : 0.05;
            score = Math.min(1.0, score + (noveltyBonus * loop.secretFactor));
        }

        // Geographic Grounding (Route Plausibility)
        if (loop.routePlausibility !== undefined) {
            score *= (0.5 + 0.5 * loop.routePlausibility);
        }

        // Physical NFC tap: stronger integration prior (high-trust channel)
        if (loop.nfcPhyBoost) {
            score = Math.min(1.0, score + 0.14);
        }

        const isClosure = score >= this.tau;

        // Fees: 2% (Rule 98 in code)
        const loopVolume = loop.events.reduce((sum, e) => sum + e.amount, 0);
        const poolContribution = loopVolume * 0.02;

        // Minting weights (Rule 1: 3-2-1 rules)
        // Goods/Services = 3, Donation = 2, Event = 1
        const totalWeight = loop.events.reduce((sum, e) => {
            const typeWeight = e.category === 'service' ? 3 : (e.category === 'donation' ? 2 : 1);
            return sum + typeWeight;
        }, 0);

        // Reward (M) scaled by weights and closure score
        const reward = isClosure ? totalWeight * score : 0;

        // Governance weights update: W(x) += M(L) for nodes in loop
        const weightUpdate = {};
        if (isClosure) {
            loop.nodes.forEach(nodeId => {
                weightUpdate[nodeId] = reward / loop.nodes.length;
            });
        }

        return {
            isClosure,
            score,
            metrics: { i, r, E },
            reward,
            contribution: poolContribution,
            weightUpdate
        };
    }

    /**
     * Evolve a scalar state (like weight or grounding) using the 
     * Lambert-based closed-loop update from notes.docx.
     * S_{k+1} = S_k - (1/ln 2) * W( (ln 2)^2 * 2^{S_k - 1} )
     */
    evolveState(s) {
        const ln2 = Math.log(2);
        const arg = (ln2 ** 2) * Math.pow(2, s - 1);
        const w = lambertW0(arg);
        return s - (1 / ln2) * w;
    }
}

/**
 * Lambert W realization (Principal branch W0)
 * Used for the "Triangle Time" transition and velocity decay.
 */
export const lambertW0 = (z) => {
    if (z === 0) return 0;
    if (z < -1 / Math.E) return NaN;

    // Initial guess
    let w = z > 1 ? Math.log(z) : z;

    // Halley's method
    for (let i = 0; i < 100; i++) {
        const ew = Math.exp(w);
        const wew = w * ew;
        const wewz = wew - z;
        if (Math.abs(wewz) < 1e-10) break;
        w -= wewz / (ew * (w + 1) - (w + 2) * wewz / (2 * w + 2));
    }
    return w;
};

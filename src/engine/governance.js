/**
 * Voting and Governance Engine
 * 
 * Implements weighted voting based on POI metrics.
 * Rule: Voting Power = C_Score (Trust) * R_Weight (Importance).
 */

export class VotingEngine {
    constructor() {
        this.proposals = new Map(); // subAppId -> { votesFor, votesAgainst, quorum, expiresAt }
        this.voteHistory = [];
    }

    /**
     * Create a proposal for a new sub-app.
     */
    proposeSubApp(subApp, durationMs = 86400000) { // Default 24h
        const proposal = {
            id: subApp.id,
            name: subApp.name,
            ownerId: subApp.ownerId,
            votesFor: 0,
            votesAgainst: 0,
            voters: new Set(),
            quorum: 10.0, // Cumulative weight required
            expiresAt: Date.now() + durationMs,
            status: 'pending'
        };
        this.proposals.set(proposal.id, proposal);
        return proposal;
    }

    /**
     * Cast a vote using an agent's POI power.
     */
    castVote(agent, subAppId, side = 'for') {
        const proposal = this.proposals.get(subAppId);
        if (!proposal || proposal.status !== 'pending' || proposal.voters.has(agent.nodeId)) return null;

        // Voting Power Formula: Trust * Importance
        const power = agent.c_score * agent.r_weight;

        if (side === 'for') {
            proposal.votesFor += power;
        } else {
            proposal.votesAgainst += power;
        }

        proposal.voters.add(agent.nodeId);
        this.voteHistory.push({ agentId: agent.nodeId, subAppId, power, side, time: Date.now() });

        // Check if quorum reached
        if (proposal.votesFor >= proposal.quorum) {
            proposal.status = 'approved';
        } else if (proposal.votesAgainst >= proposal.quorum || Date.now() > proposal.expiresAt) {
            proposal.status = 'rejected';
        }

        return { proposal, power };
    }

    getProposal(id) {
        return this.proposals.get(id);
    }

    getAllProposals() {
        return Array.from(this.proposals.values());
    }
}

export const votingEngine = new VotingEngine();

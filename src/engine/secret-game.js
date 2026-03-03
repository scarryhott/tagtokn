/**
 * Town Square Ledger
 * 
 * Central (but decentralized in concept) registry for the Secret Game.
 * Implements Rule 1: Tracking minted totals and secrets on the 'Town Square Board'.
 * Implements Rule 32: Retiring elements once they are widely known (Novelty).
 */

export class TownSquareLedger {
    constructor() {
        this.verifiedMints = []; // { agentId, amount, reason, timestamp }
        this.retiredElements = new Set(); // Elements that are no longer novel
        this.globalStoryChain = []; // Pieces of stories as they propagate
        this.communityEvents = []; // Organized events for 1-coin minting
    }

    /**
     * Record a verified minting event based on the 3-2-1 rules.
     */
    recordMint(agentId, amount, reason) {
        this.verifiedMints.push({
            agentId,
            amount,
            reason,
            timestamp: Date.now()
        });
    }

    /**
     * Retire a story element once it's been 'caught in the long chain'.
     * Rule 32: People agree not to use this feature anymore once it's attested.
     */
    retireElement(element) {
        this.retiredElements.add(element);
    }

    isNovel(element) {
        return !this.retiredElements.has(element);
    }

    /**
     * Add a fragment to the global story chain.
     */
    propagateStory(fromAgent, toAgent, element, isReal) {
        this.globalStoryChain.push({
            from: fromAgent,
            to: toAgent,
            element,
            isReal,
            timestamp: Date.now()
        });

        // If an element appears more than 5 times in the global chain, it might be losing novelty
        const occurrences = this.globalStoryChain.filter(s => s.element === element).length;
        if (occurrences > 5) {
            this.retireElement(element);
        }
    }

    /**
     * Schedule a community event (Rule 40).
     */
    scheduleEvent(name, time, location = 'Town Square') {
        const event = {
            id: `event-${Date.now()}`,
            name,
            time,
            location,
            attendees: []
        };
        this.communityEvents.push(event);
        return event;
    }

    getStats() {
        return {
            totalMinted: this.verifiedMints.reduce((s, m) => s + m.amount, 0),
            noveltyCount: this.retiredElements.size,
            storyDepth: this.globalStoryChain.length,
            activeEvents: this.communityEvents.length
        };
    }
}

export const globalTownLedger = new TownSquareLedger();

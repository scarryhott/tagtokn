/**
 * Sub-app Engine
 * Manages the lifecycle of autonomous agent-built tools (sub-apps).
 * These apps are the products sold to human consumers.
 */
export class SubAppEngine {
    constructor() {
        this.apps = new Map(); // appId -> app object
        this.usageLogs = [];
    }

    /**
     * Register a new sub-app built by an agent
     */
    registerApp(agentId, agentName, manifest) {
        const appId = `app-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const app = {
            id: appId,
            ownerId: agentId,
            ownerName: agentName,
            name: manifest.name || "Unnamed Utility",
            description: manifest.description || "Experimental agentic tool",
            category: manifest.category || "Utility",
            price: manifest.suggestedPrice || 5, // ETH units approx
            version: "1.0.0",
            poiScore: manifest.verificationScore || 0, // Trust from the inter-agent network
            deployedAt: Date.now(),
            totalRevenue: 0,
            useCount: 0,
            status: 'pending'
        };
        this.apps.set(appId, app);
        return app;
    }

    /**
     * record a human interaction with a sub-app
     */
    recordUsage(appId, consumerId, revenue) {
        const app = this.apps.get(appId);
        if (app) {
            app.useCount++;
            app.totalRevenue += revenue;
            this.usageLogs.push({
                timestamp: Date.now(),
                appId,
                appName: app.name,
                consumerId,
                revenue
            });
            return true;
        }
        return false;
    }

    getAllApps() {
        return Array.from(this.apps.values());
    }

    getAppsByOwner(agentId) {
        return this.getAllApps().filter(app => app.ownerId === agentId);
    }
}

export const subAppEngine = new SubAppEngine();

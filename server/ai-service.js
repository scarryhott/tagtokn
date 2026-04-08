/**
 * TAP Network — Real AI Service (OpenAI)
 * 
 * Replaces fake template strings with real GPT-4 API calls.
 * Each agent gets a system prompt matching their role.
 * Real token usage, real responses.
 */
import OpenAI from 'openai';

export class RealCodexService {
    constructor(apiKey) {
        this.client = apiKey ? new OpenAI({ apiKey }) : null;
        this.tokenLog = []; // Track real usage
        this.totalTokensUsed = 0;
        this.totalCost = 0;
    }

    /**
     * Real AI fulfillment for a service request.
     * Makes an actual OpenAI API call.
     * 
     * @param {string} agentName - The agent providing the service
     * @param {string} agentRole - "coffee", "bookstore", "citizen", etc.
     * @param {string} serviceName - "Code Review", "Barista Training", etc.
     * @param {string} prompt - Custom user prompt
     * @returns {Object} Real AI response with actual token usage
     */
    async fulfill(agentName, agentRole, serviceName, prompt) {
        if (!this.client) {
            return {
                agentName,
                serviceName,
                response: null,
                error: 'OPENAI_API_KEY not configured',
                isReal: false,
                fallback: true
            };
        }
        const systemPrompt = this._buildSystemPrompt(agentName, agentRole, serviceName);
        const userPrompt = prompt || `Please provide your ${serviceName} service.`;

        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4o-mini', // Cost-effective for simulation
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 500,
                temperature: 0.8
            });

            const response = completion.choices[0].message.content;
            const usage = completion.usage;

            // Track real costs (gpt-4o-mini pricing)
            const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
            const outputCost = (usage.completion_tokens / 1_000_000) * 0.60;
            const totalCost = inputCost + outputCost;

            this.totalTokensUsed += usage.total_tokens;
            this.totalCost += totalCost;

            const record = {
                agentName,
                serviceName,
                response,
                tokensUsed: usage.total_tokens,
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                cost: totalCost,
                model: 'gpt-4o-mini',
                timestamp: Date.now(),
                isReal: true // <-- NOT simulated
            };

            this.tokenLog.push(record);
            console.log(`🤖 Real AI: ${agentName} fulfilled "${serviceName}" (${usage.total_tokens} tokens, $${totalCost.toFixed(6)})`);

            return record;

        } catch (err) {
            console.error(`❌ OpenAI Error: ${err.message}`);
            return {
                agentName,
                serviceName,
                response: null,
                error: err.message,
                isReal: false,
                fallback: true
            };
        }
    }

    /**
     * Build a role-specific system prompt for each agent
     */
    _buildSystemPrompt(agentName, agentRole, serviceName) {
        const rolePrompts = {
            coffee: `You are ${agentName}, an artisanal coffee shop owner and barista expert. You have deep knowledge of coffee sourcing, brewing methods, and cafe management. You are part of a decentralized network of service providers.`,

            bookstore: `You are ${agentName}, a community bookstore owner specializing in rare manuscripts, restoration, and literary curation. You are part of a decentralized network of service providers.`,

            citizen: `You are ${agentName}, a freelance professional offering services like code review, UX design, and content strategy. You are part of a decentralized network of service providers.`,

            club: `You are ${agentName}, a venue and events manager specializing in event curation, audio engineering, and community programming. You are part of a decentralized network of service providers.`,

            museum: `You are ${agentName}, a cultural institution representative focused on policy design, governance, and community engagement. You are part of a decentralized network of service providers.`
        };

        const base = rolePrompts[agentRole] || `You are ${agentName}, a service provider in a decentralized network.`;

        return `${base}

You are now fulfilling a "${serviceName}" request. Provide a professional, actionable response. Be specific and practical. Keep it concise but valuable.

Important: You are an autonomous agent in the TAP (Trust & Attention Protocol) network. Your interactions are verified on-chain and contribute to the network's Proof of Interaction score.`;
    }

    /**
     * Kimi bridge: geometric graph state → concise human language (context compression).
     */
    async kimiGraphTranslate({ graphPayload, username = 'user', intent = 'overview' } = {}) {
        if (!this.client) {
            return {
                text: null,
                error: 'OPENAI_API_KEY not configured',
                isReal: false,
            };
        }
        const systemPrompt = `You are Kimi bridge in the TAP / NFC network: translate Tutte–Barbour geometric graph signals (harmonic layout, sphere centroid, prime-wheel guide buckets, α reputation) into clear, trustworthy language for humans. You compress technical JSON into short paragraphs suitable for profile, sales, or chat context. Preserve uncertainty when signals are weak. Intent: ${intent}. Address the user as @${username}.`;

        const userPrompt =
            typeof graphPayload === 'string'
                ? graphPayload
                : JSON.stringify(graphPayload, null, 2);

        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: 450,
                temperature: 0.55,
            });
            const text = completion.choices[0].message.content;
            const usage = completion.usage;
            const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
            const outputCost = (usage.completion_tokens / 1_000_000) * 0.6;
            this.totalTokensUsed += usage.total_tokens;
            this.totalCost += inputCost + outputCost;
            return { text, isReal: true, tokensUsed: usage.total_tokens };
        } catch (err) {
            return { text: null, error: err.message, isReal: false };
        }
    }

    /**
     * Get real usage statistics
     */
    getUsageStats() {
        return {
            totalTokensUsed: this.totalTokensUsed,
            totalCost: this.totalCost,
            totalRequests: this.tokenLog.length,
            recentRequests: this.tokenLog.slice(-10)
        };
    }
}

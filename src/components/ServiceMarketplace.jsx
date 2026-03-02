import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ShieldCheck, ArrowRightLeft, Cpu, Zap,
    CheckCircle, XCircle, Clock, ChevronRight, Globe
} from 'lucide-react';

/**
 * Service Marketplace Component
 * Where agents discover, request, and settle services.
 * Displays the Digital Tap flow: discover → request → fulfill → verify → settle
 */
const ServiceMarketplace = ({
    agents,
    marketplace,
    digitalTapProtocol,
    wallets,
    codexInterfaces,
    onServiceExchange,
    networkStats,
    logs
}) => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [activeExchange, setActiveExchange] = useState(null);
    const [exchangeLog, setExchangeLog] = useState([]);

    const categories = ['all', 'development', 'design', 'consulting', 'content', 'event'];
    const allServices = marketplace.discoverServices(
        selectedCategory !== 'all' ? { category: selectedCategory } : {}
    );
    const analytics = marketplace.getAnalytics();
    const digitalStats = digitalTapProtocol.getDigitalNetworkStats();

    /**
     * Execute a full service exchange flow:
     * 1. Request service
     * 2. Fulfill via Codex
     * 3. Create Digital Tap
     * 4. Verify through IVI
     * 5. Settle wallets
     */
    const executeExchange = async (buyerAgent, service) => {
        const providerId = service.agentId;
        const providerAgent = agents.find(a => a.nodeId === providerId);
        if (!providerAgent) return;

        const buyerWallet = wallets[buyerAgent.nodeId];
        const providerWallet = wallets[providerId];
        const codex = codexInterfaces[providerId];

        if (!buyerWallet || !providerWallet || !codex) return;
        if (buyerWallet.balance < service.price) {
            setExchangeLog(prev => [...prev, { type: 'error', message: `${buyerAgent.name} has insufficient funds.` }]);
            return;
        }

        setActiveExchange({ buyer: buyerAgent, provider: providerAgent, service, status: 'requesting' });

        // Step 1: Request
        const request = marketplace.requestService(buyerAgent, service, 'Custom request from Tap Network');
        setExchangeLog(prev => [...prev, {
            type: 'info',
            message: `📨 ${buyerAgent.name} requested "${service.name}" from ${providerAgent.name}`
        }]);

        // Step 2: Fulfill via Codex
        setActiveExchange(prev => ({ ...prev, status: 'fulfilling' }));
        const result = await codex.fulfill(service, 'Tap Network marketplace request');
        marketplace.fulfillRequest(request.id, result);
        setExchangeLog(prev => [...prev, {
            type: 'success',
            message: `🤖 Codex fulfilled: ${result.deliverable.summary || result.deliverable.type}`
        }]);

        // Step 3: Create Digital Tap
        setActiveExchange(prev => ({ ...prev, status: 'tapping' }));
        const walletTx = buyerWallet.createTransaction(providerWallet.address, service.price, service.id);
        const tap = digitalTapProtocol.createTap({
            from: buyerAgent,
            to: providerAgent,
            serviceId: service.id,
            amount: service.price,
            channel: 'marketplace'
        });
        setExchangeLog(prev => [...prev, {
            type: 'tap',
            message: `⚡ Digital Tap created: ${tap.id.slice(0, 16)}...`
        }]);

        // Step 4: Verify through IVI Audit Engine
        setActiveExchange(prev => ({ ...prev, status: 'verifying' }));
        const verification = digitalTapProtocol.verifyAndSettle(tap, networkStats);

        // Step 5: Settle wallets
        setActiveExchange(prev => ({ ...prev, status: 'settling' }));
        buyerWallet.settleTransaction(walletTx.hash, verification.settlement.verified);

        if (verification.settlement.verified) {
            providerWallet.balance += service.price;
            buyerAgent.updateBalance(-service.price);
            providerAgent.updateBalance(service.price);

            marketplace.settleRequest(request.id, verification.settlement);

            setExchangeLog(prev => [...prev, {
                type: 'verified',
                message: `✅ VERIFIED: Closure ${(verification.settlement.closureScore * 100).toFixed(0)}% — $${service.price} settled.`
            }]);
        } else {
            setExchangeLog(prev => [...prev, {
                type: 'error',
                message: `❌ COLLAPSED: Interaction failed IVI verification. No settlement.`
            }]);
        }

        setActiveExchange(prev => ({ ...prev, status: 'complete', verification }));

        // Notify parent
        if (onServiceExchange) {
            onServiceExchange(verification);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Marketplace Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '1.5rem',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '20px',
                backdropFilter: 'blur(20px)'
            }}>
                <div>
                    <h2 style={{ margin: '0 0 0.25rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={22} /> Agent Marketplace
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Agentic service providers · Verified via Digital Tap Protocol
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{analytics.totalListings}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Services</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>{digitalStats.verified}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Verified Taps</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            {(digitalStats.verificationRate * 100).toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Verification Rate</div>
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                            padding: '0.4rem 1rem',
                            borderRadius: '20px',
                            border: selectedCategory === cat ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                            background: selectedCategory === cat ? 'rgba(0, 242, 255, 0.1)' : 'var(--glass-bg)',
                            color: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s'
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Two-column layout: Services + Exchange Monitor */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem' }}>
                {/* Service Listings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {allServices.map(svc => {
                        const provider = agents.find(a => a.nodeId === svc.agentId);
                        const buyers = agents.filter(a => a.nodeId !== svc.agentId && a.type === 'consumer');
                        const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];

                        return (
                            <motion.div
                                key={svc.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ scale: 1.01 }}
                                style={{
                                    padding: '1rem 1.25rem',
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '14px',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s'
                                }}
                                onClick={() => randomBuyer && executeExchange(randomBuyer, svc)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{svc.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                            by <span style={{ color: 'var(--accent-primary)' }}>{svc.agentName}</span> · {svc.category}
                                        </div>
                                        {svc.description && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.7 }}>
                                                {svc.description}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: '70px' }}>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>${svc.price}</div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{svc.completedJobs} jobs</div>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '0.75rem',
                                    paddingTop: '0.5rem',
                                    borderTop: '1px solid rgba(255,255,255,0.04)'
                                }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Zap size={10} color="var(--accent-primary)" /> Click to trigger Digital Tap exchange
                                    </div>
                                    <ChevronRight size={14} style={{ opacity: 0.3 }} />
                                </div>
                            </motion.div>
                        );
                    })}
                    {allServices.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No services found in this category.
                        </div>
                    )}
                </div>

                {/* Digital Tap Exchange Monitor */}
                <div style={{
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '500px'
                }}>
                    <h3 style={{ margin: '0 0 1rem', fontFamily: 'Outfit', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Cpu size={16} /> Digital Tap Monitor
                    </h3>

                    {/* Active Exchange Status */}
                    {activeExchange && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                padding: '1rem',
                                background: 'rgba(0, 242, 255, 0.05)',
                                border: '1px solid rgba(0, 242, 255, 0.2)',
                                borderRadius: '10px',
                                marginBottom: '1rem',
                                fontSize: '0.8rem'
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                                {activeExchange.buyer.name} → {activeExchange.provider.name}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {['requesting', 'fulfilling', 'tapping', 'verifying', 'settling', 'complete'].map((step, i) => {
                                    const steps = ['requesting', 'fulfilling', 'tapping', 'verifying', 'settling', 'complete'];
                                    const currentIdx = steps.indexOf(activeExchange.status);
                                    const isActive = i === currentIdx;
                                    const isDone = i < currentIdx;
                                    return (
                                        <div
                                            key={step}
                                            style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.6rem',
                                                textTransform: 'uppercase',
                                                fontWeight: 600,
                                                background: isDone ? 'rgba(0,255,136,0.15)' : (isActive ? 'rgba(0,242,255,0.2)' : 'rgba(255,255,255,0.05)'),
                                                color: isDone ? 'var(--success)' : (isActive ? 'var(--accent-primary)' : 'var(--text-muted)')
                                            }}
                                        >
                                            {isDone ? '✓' : isActive ? '●' : '○'} {step}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* Exchange Log */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                    }}>
                        {exchangeLog.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '1rem 0' }}>
                                Click a service to trigger a Digital Tap exchange...
                            </div>
                        ) : (
                            exchangeLog.slice(-15).map((entry, i) => (
                                <div key={i} style={{
                                    color: entry.type === 'verified' ? '#00ff88'
                                        : entry.type === 'error' ? '#ff4444'
                                            : entry.type === 'tap' ? '#00f2ff'
                                                : entry.type === 'success' ? '#ffaa00'
                                                    : '#888',
                                    lineHeight: 1.4
                                }}>
                                    <span style={{ opacity: 0.4 }}>{'>'}</span> {entry.message}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceMarketplace;

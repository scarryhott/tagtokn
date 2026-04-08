import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Wallet, Cpu, Star, ArrowRightLeft } from 'lucide-react';

/**
 * Agent Storefront Component
 * Displays an individual agent's public-facing service page.
 * Shows wallet, services, Codex stats, and interaction history.
 */
const AgentStorefront = ({ agent, services, wallet, codex, tapHistory, onRequestService, onTap }) => {
    const verifiedTaps = tapHistory.filter(t => t.status === 'verified');
    const trustPercentage = (agent.c_score * 100).toFixed(0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '20px',
                padding: '1.5rem',
                backdropFilter: 'blur(20px)'
            }}
        >
            {/* Agent Identity Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: agent.type === 'business'
                        ? 'linear-gradient(135deg, #00f2ff, #7000ff)'
                        : 'linear-gradient(135deg, #ff007b, #ffaa00)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                    {agent.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', fontFamily: 'Outfit' }}>{agent.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '2px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <ShieldCheck size={12} color="var(--success)" /> Trust: {trustPercentage}%
                        </span>
                        <span>{agent.type}</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Wallet</div>
                    <div style={{
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        color: 'var(--accent-primary)',
                        background: 'rgba(0, 242, 255, 0.08)',
                        padding: '3px 8px',
                        borderRadius: '6px'
                    }}>
                        <a
                            href={`https://sepolia.basescan.org/address/${agent.walletAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                            {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
                        </a>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center' }}>
                    <Wallet size={16} style={{ opacity: 0.6, marginBottom: '4px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>${wallet.balance.toFixed(0)}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Balance</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center' }}>
                    <Cpu size={16} style={{ opacity: 0.6, marginBottom: '4px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{codex.tokensUsed}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Codex Tokens</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center' }}>
                    <ArrowRightLeft size={16} style={{ opacity: 0.6, marginBottom: '4px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>{verifiedTaps.length}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Verified Taps</div>
                </div>
            </div>

            {/* Services Offered */}
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', opacity: 0.7, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Services Available
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {services.map(svc => (
                        <div
                            key={svc.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem 1rem',
                                background: 'rgba(255,255,255,0.04)',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => onRequestService && onRequestService(svc)}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                        >
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{svc.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {svc.description || svc.category} · {svc.completedJobs} completed
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)' }}>${svc.price}</div>
                                {svc.rating > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', color: '#ffaa00' }}>
                                        <Star size={10} fill="#ffaa00" /> {svc.rating.toFixed(1)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* NFC Tap Action */}
            <div style={{ marginTop: '1.5rem' }}>
                <motion.button
                    whileHover={{ scale: 1.02, background: 'rgba(0, 255, 136, 0.2)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onTap && onTap(agent)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(0, 255, 136, 0.1)',
                        border: '1px solid #00ff88',
                        borderRadius: '12px',
                        color: '#00ff88',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Zap size={16} /> Digital NFC Tap
                </motion.button>
            </div>
        </motion.div>
    );
};

export default AgentStorefront;

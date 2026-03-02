import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Star, ShieldCheck, Zap, ArrowRight, ExternalLink } from 'lucide-react';

/**
 * Sub-app Store Component (The Human Layer)
 * This is where consumers buy agent-built tools.
 */
const SubAppStore = ({ apps, onUseApp, isLiveEconomy }) => {
    const [selectedApp, setSelectedApp] = useState(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header style={{
                padding: '2rem',
                background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.1), rgba(112, 0, 255, 0.1))',
                borderRadius: '24px',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'Outfit' }}>
                    Agentic App Store
                </h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                    High-trust tools built and verified by the autonomous POI network.
                    Real labor. Real intelligence. Real economy.
                </p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem'
            }}>
                {apps.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '4rem',
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '20px',
                        border: '1px dashed rgba(255,255,255,0.1)'
                    }}>
                        <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                            Agents are currently in R&D...
                        </div>
                    </div>
                ) : (
                    apps.map(app => (
                        <motion.div
                            key={app.id}
                            whileHover={{ y: -5 }}
                            style={{
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '20px',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}
                            onClick={() => setSelectedApp(app)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'var(--accent-primary)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    color: '#000'
                                }}>
                                    {app.name[0]}
                                </div>
                                <div style={{
                                    background: 'rgba(0, 255, 136, 0.1)',
                                    color: '#00ff88',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <ShieldCheck size={12} /> POI VERIFIED
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', fontWeight: 700 }}>{app.name}</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', height: '3.6rem', overflow: 'hidden' }}>
                                    {app.description}
                                </p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Built by</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>@{app.ownerName}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                        ${app.price}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>one-time access</div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* App Detail Modal */}
            <AnimatePresence>
                {selectedApp && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '2rem'
                    }} onClick={() => setSelectedApp(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                background: '#111',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '32px',
                                maxWidth: '800px',
                                width: '100%',
                                padding: '3rem',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem' }}>
                                <div>
                                    <div style={{
                                        width: '120px',
                                        height: '120px',
                                        background: 'var(--accent-primary)',
                                        borderRadius: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '3rem',
                                        color: '#000',
                                        marginBottom: '2rem'
                                    }}>
                                        {selectedApp.name[0]}
                                    </div>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Trust Metrics</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.75rem' }}>POI Audit Score</span>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#00ff88' }}>
                                                        {(selectedApp.poiScore * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                                    <div style={{ height: '100%', width: `${selectedApp.poiScore * 100}%`, background: '#00ff88', borderRadius: '2px' }}></div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{selectedApp.useCount}</div>
                                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Global Users</div>
                                                </div>
                                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>v{selectedApp.version}</div>
                                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Version</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <div style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '0.5rem' }}>
                                            {selectedApp.category.toUpperCase()}
                                        </div>
                                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1rem' }}>{selectedApp.name}</h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <span>Developed by {selectedApp.ownerName}</span>
                                            <span>•</span>
                                            <span style={{ color: '#00ff88', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <ShieldCheck size={14} /> Base Sepolia Verified
                                            </span>
                                        </div>
                                    </div>

                                    <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: '3rem' }}>
                                        {selectedApp.description} This sub-app was autonomously developed through {Math.floor(selectedApp.poiScore * 10)} rounds of inter-agent information closure and verified on the Base Sepolia testnet.
                                    </p>

                                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            style={{
                                                flex: 1,
                                                background: 'var(--accent-primary)',
                                                color: '#000',
                                                border: 'none',
                                                borderRadius: '16px',
                                                padding: '1.2rem',
                                                fontSize: '1.1rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.75rem'
                                            }}
                                            onClick={() => onUseApp(selectedApp)}
                                        >
                                            <Zap size={20} /> Use Sub-app (${selectedApp.price})
                                        </motion.button>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedApp.price} ETH</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Gas: 0.0001</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                style={{
                                    position: 'absolute', top: '1.5rem', right: '1.5rem',
                                    background: 'rgba(255,255,255,0.1)', color: '#fff',
                                    border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                onClick={() => setSelectedApp(null)}
                            >
                                ✕
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubAppStore;

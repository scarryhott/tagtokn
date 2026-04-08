import React from 'react';
import { motion } from 'framer-motion';
import { Vote, CheckCircle, XCircle, Clock } from 'lucide-react';

const GovernanceBoard = ({ proposals, agents, onVote }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ color: '#00ff88', fontFamily: 'Outfit' }}>Network Governance Board</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {proposals.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '20px' }}>
                        <Vote size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p style={{ color: '#888' }}>No active proposals requiring network consensus.</p>
                    </div>
                ) : (
                    proposals.map(proposal => (
                        <div key={proposal.id} style={{
                            background: '#111', padding: '1.5rem', borderRadius: '16px', border: '1px solid #333',
                            display: 'flex', flexDirection: 'column', gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h3 style={{ margin: 0 }}>{proposal.name}</h3>
                                <span style={{
                                    fontSize: '0.65rem', padding: '4px 8px', borderRadius: '12px',
                                    background: proposal.status === 'approved' ? 'rgba(0,255,136,0.1)' : (proposal.status === 'rejected' ? 'rgba(255,68,68,0.1)' : 'rgba(255,170,0,0.1)'),
                                    color: proposal.status === 'approved' ? '#00ff88' : (proposal.status === 'rejected' ? '#ff4444' : '#ffaa00')
                                }}>
                                    {proposal.status.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#888' }}>
                                App ID: <code>{proposal.id}</code>
                            </div>

                            <div style={{ background: '#222', padding: '1rem', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem' }}>
                                    <span>Consensus Weight</span>
                                    <span>{proposal.votesFor.toFixed(2)} / {proposal.quorum.toFixed(2)}</span>
                                </div>
                                <div style={{ height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, (proposal.votesFor / proposal.quorum) * 100)}%`, background: '#00ff88' }}></div>
                                </div>
                            </div>

                            {proposal.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button onClick={() => onVote(proposal.id, 'for')} style={{
                                        flex: 1, padding: '10px', background: 'rgba(0,255,136,0.1)', color: '#00ff88',
                                        border: '1px solid #00ff88', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}>
                                        <CheckCircle size={14} /> Endorse
                                    </button>
                                    <button onClick={() => onVote(proposal.id, 'against')} style={{
                                        flex: 1, padding: '10px', background: 'rgba(255,68,68,0.1)', color: '#ff4444',
                                        border: '1px solid #ff4444', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}>
                                        <XCircle size={14} /> Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GovernanceBoard;

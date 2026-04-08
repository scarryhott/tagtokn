import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Activity, ShieldCheck, Zap, Users, TrendingUp, ArrowRightLeft,
    Coins, Vote, Plus, Play, Pause, RefreshCw, Terminal, Globe, Cpu, Wallet,
    Brain, Map, Wrench, Target, BarChart3, ShoppingBag, Hexagon, Gem, MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IVIEngine } from './engine/ivi';
import { ICRAgent, HumanAgent } from './engine/agents';
import { DigitalTapProtocol } from './engine/digital-tap';
import { ServiceMarketplace as MarketplaceEngine, CodexInterface, AgentWallet } from './engine/agent-service';
import { NetworkLearningEngine } from './engine/network-learning';
import { AgentAutonomy } from './engine/agent-autonomy';
import { realEconomy } from './engine/real-economy';
import AgentStorefront from './components/AgentStorefront';
import ServiceMarketplace from './components/ServiceMarketplace';
import SubAppStore from './components/SubAppStore';
import { subAppEngine } from './engine/sub-apps';
import BuildLab from './components/BuildLab';
import GovernanceBoard from './components/GovernanceBoard';
import TutteAtlas from './components/TutteAtlas';
import NfcMarketplace from './components/NfcMarketplace';
import JointKimiRoom from './components/JointKimiRoom';
import PublicProfileView from './components/PublicProfileView';
import { userRegistry, nfcAuthHeaders } from './engine/user-accounts';
import { votingEngine } from './engine/governance';

// --- Constants ---
const THREAD_COLORS = ["#00f2ff", "#7000ff", "#ff007b", "#ffaa00", "#00ff88"];
const LOGO_GRADIENT = "linear-gradient(135deg, #00f2ff, #7000ff, #ff007b)";

const INITIAL_NODES = [
    { id: 'node-1', type: 'business', nodeType: 'coffee', name: 'Artisanal Coffee', x: 80, y: 80, balance: 5000 },
    { id: 'node-2', type: 'business', nodeType: 'bookstore', name: 'Community Bookstore', x: 220, y: 60, balance: 3500 },
    { id: 'node-3', type: 'consumer', nodeType: 'citizen', name: 'Alice', x: 30, y: 150, balance: 2500 },
    { id: 'node-4', type: 'business', nodeType: 'club', name: 'Club 412', x: 150, y: 250, balance: 12000 },
    { id: 'node-5', type: 'consumer', nodeType: 'citizen', name: 'Bob', x: 270, y: 150, balance: 2000 },
    { id: 'node-6', type: 'organization', nodeType: 'museum', name: 'City Museum', x: 150, y: 50, balance: 8000 },
];

const SERVICE_CATALOG = [
    { agent: 'node-1', name: 'Barista Training', desc: 'Master the art of coffee preparation.', price: 120, cat: 'consulting' },
    { agent: 'node-1', name: 'Direct Trade Sourcing', desc: 'Ethical supply chain consultancy.', price: 250, cat: 'consulting' },
    { agent: 'node-2', name: 'Rare Manuscript Sourcing', desc: 'Find and verify rare documents.', price: 500, cat: 'consulting' },
    { agent: 'node-2', name: 'Manuscript Restoration', desc: 'Conservation and digital archiving.', price: 380, cat: 'consulting' },
    { agent: 'node-3', name: 'Code Review', desc: 'Expert review of your codebase.', price: 85, cat: 'development' },
    { agent: 'node-3', name: 'UX Design', desc: 'User experience audit and wireframing.', price: 150, cat: 'design' },
    { agent: 'node-4', name: 'Event Curation', desc: 'Full-service event planning.', price: 450, cat: 'event' },
    { agent: 'node-4', name: 'Audio Engineering', desc: 'Professional audio production.', price: 200, cat: 'content' },
    { agent: 'node-5', name: 'Content Strategy', desc: 'Brand storytelling and content plan.', price: 110, cat: 'content' },
    { agent: 'node-5', name: 'Community Moderation', desc: 'Scale your online community safely.', price: 75, cat: 'consulting' },
    { agent: 'node-6', name: 'Policy Design', desc: 'Governance framework development.', price: 300, cat: 'consulting' },
];

// --- Trend Arrow Helper ---
const TrendArrow = ({ value, label, invert = false }) => {
    const isUp = invert ? value < 0 : value > 0;
    const color = isUp ? '#00ff88' : (value === 0 ? '#555' : '#ff4444');
    return (
        <span style={{ color, fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
            {value > 0 ? '▲' : value < 0 ? '▼' : '—'} {label}
        </span>
    );
};

const App = () => {
    // --- Core State ---
    const [activeView, setActiveView] = useState('dashboard');
    const [worldIntel, setWorldIntel] = useState([]);
    const [subApps, setSubApps] = useState(() => subAppEngine.getAllApps());
    const [proposals, setProposals] = useState(() => votingEngine.getAllProposals());
    const [transactions, setTransactions] = useState([]);
    const [treasury, setTreasury] = useState(12450.75);
    const [engine] = useState(() => new IVIEngine({
        tau: 0.35,    // Lower threshold for small network
        alpha: 2.0,   // Higher context grounding reward 
        beta: 0.5,    // Lower velocity penalty (small networks have bursts)
        gamma: 1.0    // Lower Kakeya penalty (small networks have concentration)
    }));
    const [agents, setAgents] = useState(() => INITIAL_NODES.map(n => new ICRAgent(n.id, n.name, n.type, n.x, n.y, n.balance)));
    const [governanceWeights, setGovernanceWeights] = useState(() => {
        const initial = {};
        INITIAL_NODES.forEach(n => initial[n.id] = 100);
        return initial;
    });
    const [isSimulating, setIsSimulating] = useState(true);
    const [activeAudit, setActiveAudit] = useState(null);
    const [logs, setLogs] = useState(["TAP Network: POI-Coordinated Economy Live.", "Network Learning Engine: Epoch 0.", "Agent Autonomy: All agents thinking..."]);
    const [publicSecrets, setPublicSecrets] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isLiveEconomy, setIsLiveEconomy] = useState(false);
    const [realWallets, setRealWallets] = useState({});
    const [processedTxHashes, setProcessedTxHashes] = useState(new Set());

    // --- Connect to Real Economy Backend ---
    useEffect(() => {
        const connectRealEconomy = async () => {
            const result = await realEconomy.init();
            if (result.success) {
                setIsLiveEconomy(true);
                setRealWallets(result.wallets);
                setLogs(prev => ["✅ Connected to Base Sepolia Economy.", "✅ Real AI (Codex) Active.", ...prev.slice(0, 8)]);
            } else {
                setLogs(prev => ["⚠️ Real Economy Offline. Using Simulation Mode.", ...prev.slice(0, 8)]);
            }
        };
        connectRealEconomy();
    }, []);

    // Refs for stable closures in intervals
    const agentsRef = useRef(agents);
    const transactionsRef = useRef(transactions);
    const publicSecretsRef = useRef(publicSecrets);
    useEffect(() => { agentsRef.current = agents; }, [agents]);
    useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
    useEffect(() => { publicSecretsRef.current = publicSecrets; }, [publicSecrets]);

    // --- Digital Economy Layer ---
    const [digitalTapProtocol] = useState(() => new DigitalTapProtocol(engine));
    const [marketplace] = useState(() => {
        const mp = new MarketplaceEngine();
        SERVICE_CATALOG.forEach(svc => {
            const agentNode = INITIAL_NODES.find(n => n.id === svc.agent);
            if (agentNode) mp.publishService({ nodeId: agentNode.id, name: agentNode.name }, svc.name, svc.desc, svc.price, svc.cat);
        });
        return mp;
    });
    const [wallets, setWallets] = useState(() => {
        const w = {};
        INITIAL_NODES.forEach(n => { w[n.id] = new AgentWallet(`0x${Math.random().toString(16).substr(2, 40)}`, n.balance); });
        return w;
    });

    // Synchronize wallets when realEconomy connects
    useEffect(() => {
        if (isLiveEconomy) {
            setWallets(prev => {
                const next = { ...prev };
                Object.keys(realWallets).forEach(agentId => {
                    const real = realWallets[agentId];
                    // Sync balance from chain if available
                    const balance = real.balanceEth !== undefined ? parseFloat(real.balanceEth) * 1000000 : (prev[agentId]?.balance || 1000);
                    next[agentId] = new AgentWallet(real.address, balance);
                });
                return next;
            });
        }
    }, [isLiveEconomy, realWallets]);
    const [codexInterfaces] = useState(() => {
        const c = {};
        INITIAL_NODES.forEach(n => { c[n.id] = new CodexInterface(n.name); });
        return c;
    });

    // --- Network Learning & Autonomy ---
    const [networkLearning] = useState(() => new NetworkLearningEngine());
    const [agentAutonomies] = useState(() => {
        const a = {};
        INITIAL_NODES.forEach(n => {
            const agent = new ICRAgent(n.id, n.name, n.type, n.x, n.y, n.balance);
            a[n.id] = new AgentAutonomy(agent, codexInterfaces[n.id]);
        });
        return a;
    });
    const [epochHistory, setEpochHistory] = useState([]);
    const [learningTrend, setLearningTrend] = useState(null);
    const [autonomyLogs, setAutonomyLogs] = useState([]);
    const [topologyGraph, setTopologyGraph] = useState({ nodes: [], edges: [] });
    const [currentUser, setCurrentUser] = useState(null);
    const [publicProfileUserId, setPublicProfileUserId] = useState(() => {
        if (typeof window === 'undefined') return null;
        return new URLSearchParams(window.location.search).get('u') || null;
    });

    useEffect(() => {
        userRegistry.restoreSession().then((u) => {
            if (u) setCurrentUser(u);
        });
    }, []);

    useEffect(() => {
        const sync = () =>
            setPublicProfileUserId(new URLSearchParams(window.location.search).get('u') || null);
        window.addEventListener('popstate', sync);
        return () => window.removeEventListener('popstate', sync);
    }, []);

    // --- Human-Agent Sync ---
    useEffect(() => {
        if (currentUser && !agents.find(a => a.nodeId === currentUser.agentId)) {
            // Spawn the personal HumanAgent if not already in the network
            const humanAgent = new HumanAgent(
                currentUser.agentId,
                `Proxy-${currentUser.username}`,
                currentUser.id,
                500 + (Math.random() - 0.5) * 100,
                500 + (Math.random() - 0.5) * 100,
                1000
            );
            setAgents(prev => [...prev, humanAgent]);
        }
    }, [currentUser]);

    const handleSignup = async (username, password) => {
        try {
            const { user } = await userRegistry.signup(username, password);
            setCurrentUser(user);
            setLogs(prev => [`🎉 Welcome @${user.username}! Account synced to NFC server.`, ...prev.slice(0, 8)]);
        } catch (e) {
            alert(e.message || 'Sign up failed');
        }
    };

    const handleLogin = async (username, password) => {
        try {
            const user = await userRegistry.login(username, password);
            setCurrentUser(user);
            setLogs(prev => [`🔑 Welcome back @${user.username}. Session active.`, ...prev.slice(0, 8)]);
        } catch {
            alert('Invalid username or password.');
        }
    };

    // Sync agent balances with real wallets
    useEffect(() => {
        if (isLiveEconomy) {
            setAgents(prev => {
                let changed = false;
                const next = prev.map(a => {
                    const real = realWallets[a.nodeId];
                    if (real) {
                        const clone = Object.assign(Object.create(Object.getPrototypeOf(a)), a);

                        // Sync Address
                        if (real.address && a.walletAddress !== real.address) {
                            clone.walletAddress = real.address;
                            changed = true;
                        }

                        // Sync Balance
                        if (real.balanceEth !== undefined) {
                            const gameBalance = parseFloat(real.balanceEth) * 1000000;
                            if (Math.abs(a.balance - gameBalance) > 1) {
                                clone.balance = gameBalance;
                                changed = true;
                            }
                        }

                        if (changed) return clone;
                    }
                    return a;
                });
                return changed ? next : prev;
            });
        }
    }, [realWallets, isLiveEconomy]);

    // --- IVI Data Mechanism: On-Chain Transaction Monitor ---
    useEffect(() => {
        if (!isLiveEconomy || !isSimulating) return;

        const monitorInterval = setInterval(async () => {
            const onChainTxs = await realEconomy.getTransactionHistory();
            if (!onChainTxs || onChainTxs.length === 0) return;

            const newTxs = onChainTxs.filter(tx => !processedTxHashes.has(tx.hash));
            if (newTxs.length === 0) return;

            newTxs.forEach(async (tx) => {
                // Find the agent involved in this transaction
                const agent = agentsRef.current.find(a =>
                    a.walletAddress === tx.from || a.walletAddress === tx.to
                );

                if (agent) {
                    const direction = tx.from === agent.walletAddress ? 'outbound' : 'inbound';

                    // 1. Ingest external transaction into the Digital Tap Protocol
                    // This is the "Data Mechanism" mentioned in notes.docx
                    const extTap = digitalTapProtocol.ingestExternalTransaction({
                        fromWallet: tx.from,
                        toWallet: tx.to,
                        amount: parseFloat(tx.amountEth) * 1000000, // Convert ETH to game units
                        txHash: tx.hash,
                        network: 'Base Sepolia',
                        agent: agent,
                        direction: direction
                    });

                    // 2. Audit and settle through IVI
                    const auditStats = {
                        nodeDegrees: networkStats.nodeDegrees,
                        nodeVolumes: networkStats.nodeVolumes,
                        totalVolume: networkStats.totalVolume,
                        networkAvgDegree: networkStats.networkAvgDegree,
                        globalVelocity: networkStats.globalVelocity
                    };
                    const verification = digitalTapProtocol.verifyAndSettle(extTap, auditStats);

                    // 3. Record in learning engine
                    const l1Tx = {
                        id: tx.hash.slice(0, 12),
                        from: tx.from, fromName: direction === 'outbound' ? agent.name : 'External',
                        to: tx.to, toName: direction === 'inbound' ? agent.name : 'External',
                        amount: parseFloat(tx.amountEth) * 1000000,
                        type: 'on-chain', weight: 5, // L1 weighted higher
                        timestamp: Date.now(), layer: 'L1',
                        isReal: true
                    };

                    networkLearning.recordInteraction(l1Tx, verification.audit);

                    setLogs(prev => [`📡 L1 Ingest: Verified on-chain tx ${tx.hash.slice(0, 10)}...`, ...prev.slice(0, 8)]);
                    setTransactions(prev => {
                        const updated = [...prev.slice(-49), l1Tx];
                        transactionsRef.current = updated;
                        return updated;
                    });

                    // 4. Update Agent Trust & Weights based on Audit
                    if (verification.settlement.verified) {
                        setAgents(prev => {
                            const next = prev.map(a => Object.assign(Object.create(Object.getPrototypeOf(a)), a));
                            const target = next.find(a => a.nodeId === agent.nodeId);
                            if (target) {
                                // Closure boost from verified real-world activity
                                target.c_score = Math.min(1.0, target.c_score + (verification.settlement.closureScore * 0.1));
                                // Relation boost from external connectivity
                                target.r_weight += 0.05;
                            }
                            agentsRef.current = next;
                            return next;
                        });
                    }
                }
            });

            // Update processed set
            setProcessedTxHashes(prev => {
                const next = new Set(prev);
                newTxs.forEach(tx => next.add(tx.hash));
                return next;
            });

        }, 8000); // Poll every 8 seconds

        return () => clearInterval(monitorInterval);
    }, [isLiveEconomy, isSimulating, processedTxHashes, networkStats]);
    const networkStats = useMemo(() => {
        const nodeDegrees = {}, nodeVolumes = {};
        let totalVolume = 0;
        transactions.forEach(tx => {
            nodeDegrees[tx.from] = (nodeDegrees[tx.from] || 0) + 1;
            nodeDegrees[tx.to] = (nodeDegrees[tx.to] || 0) + 1;
            nodeVolumes[tx.from] = (nodeVolumes[tx.from] || 0) + tx.amount;
            nodeVolumes[tx.to] = (nodeVolumes[tx.to] || 0) + tx.amount;
            totalVolume += tx.amount;
        });
        const networkAvgDegree = Object.values(nodeDegrees).length ?
            Object.values(nodeDegrees).reduce((a, b) => a + b, 0) / INITIAL_NODES.length : 0;
        const globalVelocity = transactions.length > 1 ?
            totalVolume / (transactions[transactions.length - 1].timestamp - transactions[0].timestamp) : 0;
        return { nodeDegrees, nodeVolumes, totalVolume, networkAvgDegree, globalVelocity };
    }, [transactions]);

    // --- Layer 1: Physical NFC Simulation Loop (stable refs, no stale closures) ---
    useEffect(() => {
        if (!isSimulating) return;

        // Motion: agents move toward need-targets
        const motionInterval = setInterval(() => {
            setAgents(prev => {
                const next = prev.map(a => {
                    const clone = Object.assign(Object.create(Object.getPrototypeOf(a)), a);
                    // Deep clone mutable objects to prevent cross-tick contamination
                    clone.needs = { ...a.needs };
                    clone.secrets = [...a.secrets];
                    if (clone.type === 'consumer') {
                        clone.evolveNeeds();
                        if (!clone.targetNode) clone.targetNode = clone.decide(INITIAL_NODES);
                        if (clone.targetNode) clone.moveTowards(clone.targetNode.x, clone.targetNode.y);
                    }
                    return clone;
                });
                agentsRef.current = next;
                return next;
            });
        }, 120);

        // Logic: interactions, transactions, IVI audit
        const logicInterval = setInterval(() => {
            setAgents(prevAgents => {
                const nextAgents = prevAgents.map(a => Object.assign(Object.create(Object.getPrototypeOf(a)), a));
                const newTxs = [];
                let secretsChanged = false;

                nextAgents.forEach((actor, actorIdx) => {
                    // Agent-agent encounters (secret game)
                    nextAgents.forEach((other, otherIdx) => {
                        if (actorIdx !== otherIdx && actor.isNear(other.x, other.y, 25)) {
                            if (Math.random() > 0.85) {
                                const result = actor.exchangeSecret(other);
                                networkLearning.recordEncounter(actor, other);
                                const secret = result.storyA;
                                if (actor.trusted_secrets.get(secret) >= 3) {
                                    setPublicSecrets(prev => {
                                        if (prev.includes(secret)) return prev;
                                        return [...prev.slice(-3), secret];
                                    });
                                    secretsChanged = true;
                                }
                                setLogs(prev => [`L1: ${actor.name} ↔ ${other.name} encounter`, ...prev.slice(0, 8)]);
                            }
                        }
                    });

                    // Agent → business fulfillment
                    const targetNode = INITIAL_NODES.find(n => n.id !== actor.nodeId && actor.isNear(n.x, n.y, 20));
                    if (targetNode && actor.type === 'consumer') {
                        const fulfillable =
                            (targetNode.nodeType === 'coffee' && actor.needs.energy > 0.4) ||
                            (targetNode.nodeType === 'bookstore' && actor.needs.knowledge > 0.4) ||
                            (targetNode.nodeType === 'club' && actor.needs.social > 0.4) ||
                            (targetNode.nodeType === 'museum' && actor.needs.social > 0.3);
                        if (fulfillable && actor.balance >= 15) {
                            actor.targetNode = null;
                            actor.fulfillNeed(targetNode.nodeType);
                            const amount = targetNode.nodeType === 'coffee' ? 15 : (targetNode.nodeType === 'bookstore' ? 42 : 65);
                            actor.updateBalance(-amount);
                            const target = nextAgents.find(a => a.nodeId === targetNode.id);
                            if (target) target.updateBalance(amount);
                            const txTimestamp = Date.now() - Math.floor(Math.random() * 1800);
                            newTxs.push({
                                id: Math.random().toString(36).substr(2, 9),
                                from: actor.nodeId, fromName: actor.name,
                                to: targetNode.id, toName: targetNode.name,
                                amount, type: 'business', weight: 3,
                                x: actor.x, y: actor.y, timestamp: txTimestamp, layer: 'L1'
                            });
                        }
                    }
                });

                // Process all new L1 transactions
                if (newTxs.length > 0) {
                    setTransactions(prev => {
                        const updated = [...prev.slice(-49), ...newTxs];
                        transactionsRef.current = updated;
                        return updated;
                    });

                    newTxs.forEach(tx => {
                        const allTxs = transactionsRef.current;
                        const recentTxs = allTxs.slice(-4);
                        const loopNodes = [...new Set([...recentTxs, tx].flatMap(t => [t.from, t.to]))];

                        // Compute real stats from tx history
                        const nd = {}, nv = {};
                        let tv = 0;
                        allTxs.forEach(t => {
                            nd[t.from] = (nd[t.from] || 0) + 1;
                            nd[t.to] = (nd[t.to] || 0) + 1;
                            nv[t.from] = (nv[t.from] || 0) + t.amount;
                            nv[t.to] = (nv[t.to] || 0) + t.amount;
                            tv += t.amount;
                        });
                        const nad = Object.values(nd).length ?
                            Object.values(nd).reduce((a, b) => a + b, 0) / INITIAL_NODES.length : 1;
                        const gv = allTxs.length > 1 ?
                            tv / (allTxs[allTxs.length - 1].timestamp - allTxs[0].timestamp + 1) : 0.01;

                        const auditResult = engine.audit({
                            events: [...recentTxs, tx],
                            nodes: loopNodes,
                            secretFactor: 0.6,
                            routePlausibility: 0.9
                        }, { nodeDegrees: nd, nodeVolumes: nv, totalVolume: tv || 1, networkAvgDegree: nad, globalVelocity: gv });

                        setActiveAudit(auditResult);
                        networkLearning.recordInteraction(tx, auditResult);

                        // Agents learn
                        const autoA = agentAutonomies[tx.from];
                        const autoB = agentAutonomies[tx.to];
                        if (autoA) autoA.learn(tx.to, auditResult.score, tx.amount, auditResult.isClosure);
                        if (autoB) autoB.learn(tx.from, auditResult.score, tx.amount, auditResult.isClosure);

                        if (auditResult.isClosure) {
                            setTreasury(prev => prev + auditResult.contribution);
                            setGovernanceWeights(prev => {
                                const next = { ...prev };
                                Object.entries(auditResult.weightUpdate).forEach(([nodeId, weight]) => {
                                    next[nodeId] = (next[nodeId] || 0) + weight;
                                });
                                return next;
                            });
                            setLogs(prev => [`L1: Closure ✓ ${tx.fromName} → ${tx.toName} ($${tx.amount})`, ...prev.slice(0, 8)]);
                        }
                    });
                }

                agentsRef.current = nextAgents;
                return nextAgents;
            });
        }, 1800);

        // Layer 2: Automatic agent-to-agent service exchanges
        const l2Interval = setInterval(() => {
            const currentAgents = agentsRef.current;
            const currentTxs = transactionsRef.current;

            // Register all agents in the session registry (they're "online")
            currentAgents.forEach(a => {
                if (!digitalTapProtocol.sessionRegistry.has(a.nodeId)) {
                    digitalTapProtocol.sessionRegistry.set(a.nodeId, { since: Date.now() });
                }
            });

            // Pick random buyer and a service they can afford from a DIFFERENT agent
            const allServices = marketplace.listings;
            if (allServices.length === 0) return;

            // Shuffle and find a viable buyer-service pair
            const shuffled = [...allServices].sort(() => Math.random() - 0.5);
            let buyer = null, service = null, provider = null;

            for (const svc of shuffled) {
                // Find agents who can buy this (not the provider, and can afford it)
                const candidates = currentAgents.filter(a =>
                    a.nodeId !== svc.agentId && a.balance >= svc.price
                );
                if (candidates.length > 0) {
                    buyer = candidates[Math.floor(Math.random() * candidates.length)];
                    service = svc;
                    provider = currentAgents.find(a => a.nodeId === svc.agentId);
                    break;
                }
            }

            if (!buyer || !service || !provider) {
                console.log('[L2] No viable buyer-service pair found');
                return;
            }

            console.log(`[L2] Attempting: ${buyer.name} ($${buyer.balance.toFixed(0)}) → ${provider.name} [${service.name}] ($${service.price})`);

            // Compute real network stats from transaction history
            const nodeDegrees = {};
            const nodeVolumes = {};
            let totalVolume = 0;
            currentTxs.forEach(tx => {
                nodeDegrees[tx.from] = (nodeDegrees[tx.from] || 0) + 1;
                nodeDegrees[tx.to] = (nodeDegrees[tx.to] || 0) + 1;
                nodeVolumes[tx.from] = (nodeVolumes[tx.from] || 0) + tx.amount;
                nodeVolumes[tx.to] = (nodeVolumes[tx.to] || 0) + tx.amount;
                totalVolume += tx.amount;
            });
            const networkAvgDegree = Object.values(nodeDegrees).length ?
                Object.values(nodeDegrees).reduce((a, b) => a + b, 0) / currentAgents.length : 1;
            const globalVelocity = currentTxs.length > 1 ?
                totalVolume / (currentTxs[currentTxs.length - 1].timestamp - currentTxs[0].timestamp + 1) : 0.01;
            const stats = { nodeDegrees, nodeVolumes, totalVolume: totalVolume || 1, networkAvgDegree, globalVelocity };

            // Execute the full L2 flow: request → fulfill → digital tap → IVI audit → settle
            const request = marketplace.requestService(buyer, service, 'Autonomous agent request');

            // Branch: Real AI vs Simulated AI
            const fulfillmentPromise = isLiveEconomy
                ? realEconomy.fulfillService(provider.nodeId, service.name, request.customPrompt)
                : codexInterfaces[provider.nodeId]?.fulfill(service, request.customPrompt);

            if (fulfillmentPromise) {
                fulfillmentPromise.then(async (result) => {
                    if (isLiveEconomy) console.log(`[L2-LIVE] Real AI Fulfillment by ${provider.name}:`, result.deliverable || result.response);
                    else console.log(`[L2] Fulfilled: ${result.serviceName} by ${result.agentName}`);

                    marketplace.fulfillRequest(request.id, result);

                    // Add to World Intel Feed (Live Posts)
                    setWorldIntel(prev => [{
                        id: Date.now(),
                        agentName: provider.name,
                        serviceName: service.name,
                        content: result.deliverable || result.response,
                        timestamp: new Date().toLocaleTimeString()
                    }, ...prev.slice(0, 49)]);

                    // --- SECRET GAME (WORD OF MOUTH) ---
                    // Rule 1: Secrets are combined. Rule 20: Dual elements.
                    const contextExchange = buyer.exchangeSecret(provider, townLedger);

                    // Create digital tap
                    const tap = digitalTapProtocol.createTap({
                        from: buyer, to: provider,
                        serviceId: service.id,
                        amount: service.price,
                        channel: 'marketplace'
                    });

                    // Update tap proof with Secret Game metrics for IVI Audit
                    tap.proof.sharedContext.isNovel = contextExchange.noveltyScale > 0.5;

                    // Verify and settle through IVI with REAL network stats
                    // Enforce 3-2-1 rules: Category is passed to IVI engine
                    const verification = digitalTapProtocol.verifyAndSettle(tap, {
                        ...stats,
                        category: service.category === 'event' ? 'event' : 'service'
                    });
                    console.log(`[L2] Audit: score=${verification.settlement.closureScore.toFixed(4)} verified=${verification.settlement.verified}`);

                    marketplace.settleRequest(request.id, verification.settlement);

                    if (verification.settlement.verified) {
                        setLogs(prev => [`L2: POI Closure ✓ ${buyer.name} ↔ ${provider.name}`, ...prev.slice(0, 8)]);

                        // --- LIVE SETTLEMENT ---
                        if (isLiveEconomy) {
                            realEconomy.sendTransaction(
                                buyer.nodeId,
                                provider.nodeId,
                                service.price,
                                `POI-v1:${verification.settlement.closureScore.toFixed(4)}`
                            ).then(txReceipt => {
                                if (txReceipt.success) {
                                    setLogs(prev => [`💎 On-Chain Settlement: ${txReceipt.txHash.slice(0, 10)}...`, ...prev.slice(0, 8)]);
                                } else {
                                    setLogs(prev => [`❌ On-Chain Failed: ${txReceipt.error}`, ...prev.slice(0, 8)]);
                                }
                                // Sync real balances periodically
                                realEconomy.getBalances().then(b => b && setRealWallets(b));
                            });
                        }

                        // Update agent balances locally (optimistic)
                        setAgents(prev => {
                            const next = prev.map(a => Object.assign(Object.create(Object.getPrototypeOf(a)), a));
                            const b = next.find(a => a.nodeId === buyer.nodeId);
                            const p = next.find(a => a.nodeId === provider.nodeId);
                            if (b) b.updateBalance(-service.price);
                            if (p) p.updateBalance(service.price);
                            agentsRef.current = next;
                            return next;
                        });

                        // Create L2 transaction for history
                        const l2Tx = {
                            id: tap.id.slice(4),
                            from: buyer.nodeId, fromName: buyer.name,
                            to: provider.nodeId, toName: provider.name,
                            amount: service.price, type: 'service', weight: 3,
                            x: 150, y: 150, timestamp: Date.now(), layer: 'L2',
                            isReal: isLiveEconomy
                        };
                        setTransactions(prev => {
                            const updated = [...prev.slice(-49), l2Tx];
                            transactionsRef.current = updated;
                            return updated;
                        });

                        setTreasury(prev => prev + 5); // Sim contribution

                        // --- RESEARCH & DEVELOPMENT ---
                        // Both buyer and provider contribute energy to their own research projects if active
                        [buyer, provider].forEach(agent => {
                            if (agent.researchState.isResearching) {
                                const shippedApp = agent.contributeResearch(verification.settlement.closureScore);
                                if (shippedApp) {
                                    const reg = subAppEngine.registerApp(agent.nodeId, agent.name, shippedApp);
                                    setSubApps(subAppEngine.getAllApps());
                                    setLogs(prev => [`🚀 SHIP: @${agent.name} deployed ${reg.name}!`, ...prev.slice(0, 8)]);
                                    setWorldIntel(prev => [{
                                        id: Date.now(),
                                        agentName: agent.name,
                                        serviceName: 'Core R&D',
                                        content: `Successfully deployed '${reg.name}' to the human marketplace. Built with POI trust score of ${(reg.poiScore * 100).toFixed(0)}%.`,
                                        timestamp: new Date().toLocaleTimeString()
                                    }, ...prev.slice(0, 49)]);
                                }
                            } else if (Math.random() < 0.15) {
                                // Start new R&D project autonomously
                                const names = ["WebScraper", "DataSynthesizer", "VoiceClone", "OracleGrid", "MarketPredictor"];
                                const categories = ["Utility", "Analytics", "Audio", "Knowledge", "Finance"];
                                const idx = Math.floor(Math.random() * names.length);
                                agent.startResearch(`${names[idx]}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`, categories[idx]);
                                setLogs(prev => [`🔧 R&D: @${agent.name} started building ${categories[idx]} tool`, ...prev.slice(0, 8)]);
                            }
                        });

                        // Record in learning engine
                        networkLearning.recordInteraction(l2Tx, verification.audit);
                        networkLearning.recordServiceFulfillment(provider.nodeId);

                        const autoA = agentAutonomies[buyer.nodeId];
                        const autoB = agentAutonomies[provider.nodeId];
                        if (autoA) autoA.learn(provider.nodeId, verification.settlement.closureScore, service.price, true);
                        if (autoB) autoB.learn(buyer.nodeId, verification.settlement.closureScore, service.price, true);

                        setTreasury(prev => prev + verification.settlement.contribution);
                        setLogs(prev => [
                            `L2: Digital Tap ✓ ${buyer.name} → ${provider.name} ($${service.price}) [${service.name}]`,
                            ...prev.slice(0, 8)
                        ]);
                    } else {
                        setLogs(prev => [
                            `L2: Tap collapsed ${buyer.name} → ${provider.name} (score: ${verification.settlement.closureScore.toFixed(3)})`,
                            ...prev.slice(0, 8)
                        ]);
                    }
                });
            }
        }, 5000);

        return () => { clearInterval(motionInterval); clearInterval(logicInterval); clearInterval(l2Interval); };
    }, [isSimulating]);

    // --- Epoch Timer: Close epoch & run agent autonomy ---
    useEffect(() => {
        if (!isSimulating) return;
        const epochInterval = setInterval(async () => {
            const currentAgents = agentsRef.current;
            // Close the learning epoch
            const epoch = networkLearning.closeEpoch(currentAgents);
            setEpochHistory(prev => [...prev.slice(-19), epoch]);

            // Get learning trend
            const trend = networkLearning.getLearningTrend();
            setLearningTrend(trend);

            // Update topology graph (the "digital map")
            const topo = networkLearning.getTopologyGraph(currentAgents);
            setTopologyGraph(topo);

            // Always update epoch log
            setLogs(prev => [`Epoch ${epoch.epoch}: POI Score ${epoch.learning.poiScore.toFixed(4)} | ${trend?.isLearning ? '📈 Learning' : '📉 Adapting'}`, ...prev.slice(0, 8)]);

            // Run agent autonomy for each agent
            const networkState = topo;
            const marketState = marketplace.getAnalytics();
            const newAutonomyLogs = [];

            for (const [agentId, autonomy] of Object.entries(agentAutonomies)) {
                // Sync agent state
                const currentAgent = currentAgents.find(a => a.nodeId === agentId);
                if (currentAgent) autonomy.agent = currentAgent;

                const actions = await autonomy.think(networkState, marketState, epoch);
                const toolEffects = autonomy.runTools(networkState);

                for (const action of actions) {
                    if (action.type === 'build_tool') {
                        networkLearning.recordToolBuilt(agentId, action.tool.name);
                        newAutonomyLogs.push(`🔧 ${currentAgent?.name || agentId}: Built "${action.tool.name}"`);
                    } else if (action.type === 'adapt_strategy') {
                        networkLearning.recordAdaptation(agentId, action.description);
                        newAutonomyLogs.push(`🧠 ${currentAgent?.name || agentId}: ${action.description}`);
                    } else if (action.type === 'evolve_services') {
                        newAutonomyLogs.push(`📡 ${currentAgent?.name || agentId}: ${action.description}`);
                    }
                }

                for (const effect of toolEffects) {
                    // Apply tool effects to the agent (use ref)
                    const agent = currentAgents.find(a => a.nodeId === agentId);
                    if (agent && effect.effect === 'increase_connections') {
                        agent.r_weight += 0.02;
                    } else if (agent && effect.effect === 'optimize_interactions') {
                        agent.c_score = Math.min(1, agent.c_score + 0.01);
                    }
                }
            }

            if (newAutonomyLogs.length > 0) {
                setAutonomyLogs(prev => [...newAutonomyLogs, ...prev].slice(0, 25));
            }
        }, networkLearning.epochDuration);

        return () => clearInterval(epochInterval);
    }, [isSimulating]);

    // Treasury compounding
    useEffect(() => {
        if (!isSimulating) return;
        const compId = setInterval(() => setTreasury(prev => prev * 1.0001), 5000);
        return () => clearInterval(compId);
    }, [isSimulating]);

    // --- Layer 2: Digital Service Exchange Handler ---
    const handleServiceExchange = (verification) => {
        if (verification.settlement.verified) {
            const tap = verification.tap;
            const tx = {
                id: tap.id.slice(4),
                from: tap.from.agentId, fromName: tap.from.name,
                to: tap.to.agentId, toName: tap.to.name,
                amount: tap.amount, type: 'service', weight: 3,
                x: 150, y: 150, timestamp: Date.now(), layer: 'L2'
            };
            setTransactions(prev => [...prev.slice(-49), tx]);
            setTreasury(prev => prev + verification.settlement.contribution);
            networkLearning.recordInteraction(tx, verification.audit);
            networkLearning.recordServiceFulfillment(tap.to.agentId);

            // Agents learn
            const autoA = agentAutonomies[tap.from.agentId];
            const autoB = agentAutonomies[tap.to.agentId];
            if (autoA) autoA.learn(tap.to.agentId, verification.settlement.closureScore, tap.amount, true);
            if (autoB) autoB.learn(tap.from.agentId, verification.settlement.closureScore, tap.amount, true);

            setLogs(prev => [`L2: Digital Tap — ${tap.from.name} → ${tap.to.name} ($${tap.amount})`, ...prev.slice(0, 8)]);
            setGovernanceWeights(prev => {
                const next = { ...prev };
                Object.entries(verification.settlement.weightUpdate).forEach(([nodeId, weight]) => {
                    next[nodeId] = (next[nodeId] || 0) + weight;
                });
                return next;
            });
        }
    };

    const digitalStats = digitalTapProtocol.getDigitalNetworkStats();
    const latestEpoch = epochHistory[epochHistory.length - 1];

    // --- Navigation ---
    // --- Sub-app Layer: Human Interaction Handler ---
    const handleUseSubApp = async (app) => {
        setLogs(prev => [`🛒 Human Purchase: Using ${app.name}...`, ...prev.slice(0, 8)]);

        // In a real app, this would trigger a MetaMask/WalletConnect flow
        // Here, we simulate the human payment to the agent's wallet
        if (isLiveEconomy) {
            // Treasury simulates the 'Human' paying the agent
            const tx = await realEconomy.sendTransaction(
                'treasury', // Simulated human source
                app.ownerId,
                (app.price / 1000000).toString(), // Convert back to ETH units
                `SUBAPP_USAGE:${app.id}`
            );

            if (tx.success) {
                setLogs(prev => [`💰 Revenue Collected: $${app.price} for @${app.ownerName}`, ...prev.slice(0, 8)]);
                subAppEngine.recordUsage(app.id, 'human-consumer', app.price);
                // Refresh balances
                realEconomy.getBalances().then(b => b && setRealWallets(b));
            } else {
                setLogs(prev => [`❌ Purchase Failed: ${tx.error}`, ...prev.slice(0, 8)]);
            }
        } else {
            // Sim mode
            subAppEngine.recordUsage(app.id, 'human-consumer', app.price);
            setAgents(prev => {
                const next = [...prev];
                const agent = next.find(a => a.nodeId === app.ownerId);
                if (agent) agent.updateBalance(app.price);
                return next;
            });
            setLogs(prev => [`💰 Revenue Collected: $${app.price} for @${app.ownerName}`, ...prev.slice(0, 8)]);
        }

        setSubApps(subAppEngine.getAllApps());
    };

    const handleAppCreated = (app) => {
        setLogs(prev => [`🚀 Sub-app Proposal: ${app.name} registered and pending consensus.`, ...prev.slice(0, 8)]);
        votingEngine.proposeSubApp(app);
        setSubApps(subAppEngine.getAllApps());
        setProposals(votingEngine.getAllProposals());
        setActiveView('governance');
    };

    const handleVote = (proposalId, side) => {
        // Human vote
        const userAgent = agents.find(a => a.nodeId === currentUser?.agentId);
        if (!userAgent) return;

        const result = votingEngine.castVote(userAgent, proposalId, side);
        if (result) {
            setLogs(prev => [`🗳️ Human Vote: ${userAgent.name} voted ${side} (Weight: ${result.power.toFixed(2)})`, ...prev.slice(0, 8)]);

            if (result.proposal.status === 'approved') {
                const app = subAppEngine.apps.get(proposalId);
                if (app) app.status = 'active';
                setSubApps(subAppEngine.getAllApps());
            }

            setProposals(votingEngine.getAllProposals());
        }
    };

    const handleTap = (targetAgent) => {
        if (!currentUser) return;
        const userAgent = agents.find(a => a.nodeId === currentUser.agentId);
        if (!userAgent) return;

        setLogs(prev => [`📱 NFC Tap: Scaling interaction between Human and ${targetAgent.name}...`, ...prev.slice(0, 8)]);

        // Create a Tap proof
        const tap = digitalTapProtocol.createTap({
            from: userAgent,
            to: targetAgent,
            serviceId: 'nfc-direct-connection',
            amount: 1, // Small interaction cost
            channel: 'direct',
            tapChannel: 'nfc_phy',
        });

        // Verify and settle
        const result = digitalTapProtocol.verifyAndSettle(tap, networkStats);

        if (result.settlement.verified) {
            setLogs(prev => [`✅ Tap Verified: Information Closure complete. Trust increased.`, ...prev.slice(0, 8)]);

            // Settlement effects (Closure boost and Weight update)
            setAgents(prev => {
                const next = prev.map(a => Object.assign(Object.create(Object.getPrototypeOf(a)), a));
                const target = next.find(a => a.nodeId === targetAgent.nodeId);
                const source = next.find(a => a.nodeId === userAgent.nodeId);

                if (target) {
                    target.c_score = Math.min(1.0, target.c_score + (result.settlement.closureScore * 0.05));
                    target.r_weight += result.settlement.weightUpdate || 0.01;
                }
                if (source) {
                    source.c_score = Math.min(1.0, source.c_score + (result.settlement.closureScore * 0.02));
                    source.r_weight += (result.settlement.weightUpdate || 0.01) * 0.5;
                }

                return next;
            });

            // Record in learning engine
            const l2Tx = {
                id: tap.id,
                from: userAgent.nodeId, fromName: userAgent.name,
                to: targetAgent.nodeId, toName: targetAgent.name,
                amount: tap.amount,
                type: 'direct-tap', weight: 3,
                timestamp: Date.now(), layer: 'L2',
                isReal: false
            };
            networkLearning.recordInteraction(l2Tx, result.audit);
            setTransactions(prev => [...prev.slice(-49), l2Tx]);
        } else {
            setLogs(prev => [`❌ Tap Collapsed: Insufficient shared context for closure.`, ...prev.slice(0, 8)]);
        }
    };

    const navItems = [
        { id: 'dashboard', icon: Activity, label: 'Dashboard' },
        { id: 'profile', icon: Users, label: 'My Profile' },
        { id: 'network-map', icon: Map, label: 'Network Map' },
        { id: 'tutte-atlas', icon: Hexagon, label: 'Tutte Atlas' },
        { id: 'nfc-hub', icon: Gem, label: 'Graph NFTs' },
        { id: 'joint-kimi', icon: MessageCircle, label: 'Joint rooms' },
        { id: 'marketplace', icon: Globe, label: 'Marketplace' },
        { id: 'storefronts', icon: Users, label: 'Storefronts' },
        { id: 'learning', icon: Brain, label: 'Learning' },
        { id: 'ledger', icon: ArrowRightLeft, label: 'Ledger' },
        { id: 'app-store', icon: ShoppingBag, label: 'App Store' },
        { id: 'governance', icon: Vote, label: 'Governance' },
        { id: 'build-lab', icon: Wrench, label: 'Build Lab' },
    ];

    const viewTitles = {
        'dashboard': ['Network Dashboard', 'POI-Coordinated Dual-Layer Economy'],
        'profile': ['User Profile', 'Your personal agent and account status'],
        'network-map': ['Digital Map of Humanity', 'POI as the coordinating agent — topology is the map'],
        'tutte-atlas': ['Tutte Atlas', 'Global vs local harmonic graph, face NFTs, Barbour sphere, interconnects'],
        'nfc-hub': ['Graph NFT hub', 'Mint, ingest, inventory, listings, interconnects on the internal ledger'],
        'joint-kimi': ['Joint Kimi rooms', 'Perspectival chat sessions tagged with graph epoch'],
        'marketplace': ['Agent Marketplace', 'Agentic service providers verified via Digital Tap'],
        'storefronts': ['Agent Storefronts', 'Autonomous agents with wallets, Codex, and tools'],
        'learning': ['Network Learning', 'Is the intra-agent network effectively learning?'],
        'ledger': ['Unified Ledger', 'All verified interactions across both layers'],
        'app-store': ['Sub-app Marketplace', 'Real-world tools built by agents for human consumers'],
        'governance': ['Network Governance', 'Human-Agent weighted voting for sub-app ecosystem approval'],
        'build-lab': ['Build Lab', 'Agents building tools for the human layer — collaborative R&D'],
    };

    // --- RENDER ---
    // --- USER INTERFACE COMPONENTS ---
    const LoginOverlay = () => (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ padding: '40px', background: '#111', borderRadius: '24px', border: '1px solid #333', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
                <h2 style={{ color: '#fff', marginBottom: '8px' }}>Join the TAP Network</h2>
                <p style={{ color: '#888', marginBottom: '24px' }}>Human-Agent Word-of-Mouth Economy</p>
                <input id="username-input" placeholder="Username" autoComplete="username" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: '1px solid #444', color: '#fff', marginBottom: '10px' }} />
                <input id="password-input" type="password" placeholder="Password (min 6 chars)" autoComplete="current-password" style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#222', border: '1px solid #444', color: '#fff', marginBottom: '16px' }} />
                <button type="button" onClick={() => handleSignup(document.getElementById('username-input').value, document.getElementById('password-input').value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #00ff88, #0066ff)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer', marginBottom: '12px' }}>
                    Create Account &amp; Agent
                </button>
                <button type="button" onClick={() => handleLogin(document.getElementById('username-input').value, document.getElementById('password-input').value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#222', border: '1px solid #444', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    Login
                </button>
            </motion.div>
        </div>
    );

    const UserDashboard = () => {
        const [me, setMe] = useState(null);
        const [pubUrl, setPubUrl] = useState('');
        const [kimiText, setKimiText] = useState('');
        const [socialForm, setSocialForm] = useState({ platform: 'twitter', handle: '', profileUrl: '' });
        const [profileForm, setProfileForm] = useState({ displayName: '', bio: '', showSocial: true });
        const [verifyBioByLink, setVerifyBioByLink] = useState({});

        const socialVerified = (l) => !!(l?.bio_verified_at && String(l.bio_verified_at).trim()) || !!l?.verified_admin;

        const loadMe = useCallback(async () => {
            const r = await fetch('/api/auth/me', { headers: nfcAuthHeaders() });
            if (!r.ok) return;
            const data = await r.json();
            setMe(data);
            setProfileForm({
                displayName: data.user?.displayName || '',
                bio: data.user?.bio || '',
                showSocial: !!data.user?.showSocialPublic,
            });
            if (data.user?.id) {
                setPubUrl(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/public/profile/${encodeURIComponent(data.user.id)}`);
            }
        }, []);

        useEffect(() => {
            if (currentUser) loadMe();
        }, [currentUser, loadMe]);

        const saveProfile = async () => {
            await fetch('/api/me/profile', {
                method: 'PATCH',
                headers: nfcAuthHeaders(),
                body: JSON.stringify({
                    displayName: profileForm.displayName,
                    bio: profileForm.bio,
                    showSocialPublic: profileForm.showSocial,
                }),
            });
            loadMe();
        };

        const addSocial = async () => {
            await fetch('/api/me/social-links', {
                method: 'POST',
                headers: nfcAuthHeaders(),
                body: JSON.stringify({
                    platform: socialForm.platform,
                    handle: socialForm.handle,
                    profileUrl: socialForm.profileUrl,
                    isPublic: true,
                }),
            });
            setSocialForm((s) => ({ ...s, handle: '', profileUrl: '' }));
            loadMe();
        };

        const removeSocial = async (linkId) => {
            await fetch(`/api/me/social-links/${encodeURIComponent(linkId)}`, {
                method: 'DELETE',
                headers: nfcAuthHeaders(),
            });
            loadMe();
        };

        const verifyBio = async (linkId) => {
            const bioText = verifyBioByLink[linkId] || '';
            const r = await fetch(`/api/me/social-links/${encodeURIComponent(linkId)}/verify-bio`, {
                method: 'POST',
                headers: nfcAuthHeaders(),
                body: JSON.stringify({ bioText }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) {
                alert(j.message || j.error || 'Verification failed');
                return;
            }
            setVerifyBioByLink((s) => ({ ...s, [linkId]: '' }));
            loadMe();
        };

        const regenerateSocialCode = async (linkId) => {
            const r = await fetch(`/api/me/social-links/${encodeURIComponent(linkId)}/regenerate-code`, {
                method: 'POST',
                headers: nfcAuthHeaders(),
            });
            if (!r.ok) {
                alert('Could not regenerate code');
                return;
            }
            loadMe();
        };

        const runKimi = async () => {
            setKimiText('…');
            const r = await fetch('/api/kimi/translate-graph', {
                method: 'POST',
                headers: nfcAuthHeaders(),
                body: JSON.stringify({ intent: 'profile' }),
            });
            const j = await r.json();
            setKimiText(j.text || j.error || 'unavailable');
        };

        return (
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 style={{ color: '#fff', margin: 0 }}>Human Dashboard</h1>
                    <button type="button" onClick={async () => { await userRegistry.logout(); setCurrentUser(null); }} style={{ padding: '8px 16px', borderRadius: '8px', background: '#222', color: '#ff4444', border: '1px solid #333', cursor: 'pointer' }}>Logout</button>
                </div>
                {currentUser && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        <div style={{ padding: '24px', background: '#111', borderRadius: '16px', border: '1px solid #333' }}>
                            <h3 style={{ color: '#00ff88', marginTop: 0 }}>Personal Agent</h3>
                            <p style={{ color: '#888' }}>Name: <b>Proxy-{currentUser.username}</b></p>
                            <p style={{ color: '#888' }}>Server user id (Tutte / graph): <b style={{ color: '#c77dff' }}>{currentUser.id}</b></p>
                            <p style={{ color: '#888' }}>Agent id: {currentUser.agentId}</p>
                            <div style={{ padding: '12px', background: '#222', borderRadius: '8px', fontSize: '0.8rem', color: '#aaa' }}>
                                Physical NFC tap uses a high-weight channel in the digital-tap proof (proximity attestation placeholder).
                            </div>
                        </div>

                        <div style={{ padding: '24px', background: '#111', borderRadius: '16px', border: '1px solid #333' }}>
                            <h3 style={{ color: '#38bdf8', marginTop: 0 }}>Public identity</h3>
                            <p style={{ fontSize: '0.75rem', color: '#666' }}>
                                Each linked account gets a <strong>verification code</strong>. Put that exact string in the <strong>profile bio</strong> on that platform, then paste the bio here so we can confirm ownership. Only <strong>verified</strong> links appear on your public profile and count for NFT tag checks.
                            </p>
                            <input placeholder="Display name" value={profileForm.displayName} onChange={(e) => setProfileForm((s) => ({ ...s, displayName: e.target.value }))} style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 8, border: '1px solid #444', background: '#1a1a1a', color: '#fff' }} />
                            <textarea placeholder="Bio" value={profileForm.bio} onChange={(e) => setProfileForm((s) => ({ ...s, bio: e.target.value }))} rows={3} style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 8, border: '1px solid #444', background: '#1a1a1a', color: '#fff', resize: 'vertical' }} />
                            <label style={{ color: '#888', fontSize: '0.8rem', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                                <input type="checkbox" checked={profileForm.showSocial} onChange={(e) => setProfileForm((s) => ({ ...s, showSocial: e.target.checked }))} />
                                Show linked socials on public profile API
                            </label>
                            <button type="button" onClick={saveProfile} style={{ padding: '10px 16px', borderRadius: 8, background: '#1e3a5f', color: '#e0f2fe', border: 'none', cursor: 'pointer', marginBottom: 12 }}>Save profile</button>
                            {pubUrl && me?.user?.id && (
                                <div style={{ marginTop: 12, fontSize: '0.72rem', color: '#555' }}>
                                    <p style={{ margin: '0 0 8px', wordBreak: 'break-all' }}>Public JSON: {pubUrl}</p>
                                    <button
                                        type="button"
                                        onClick={() => window.open(`/?u=${encodeURIComponent(me.user.id)}`, '_blank')}
                                        style={{ padding: '6px 12px', borderRadius: 8, background: '#27272a', color: '#e4e4e7', border: '1px solid #3f3f46', cursor: 'pointer', fontSize: '0.7rem' }}
                                    >
                                        Open public page (?u=…)
                                    </button>
                                </div>
                            )}
                            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <input placeholder="platform" value={socialForm.platform} onChange={(e) => setSocialForm((s) => ({ ...s, platform: e.target.value }))} style={{ flex: '1 1 100px', padding: 8, borderRadius: 8, border: '1px solid #444', background: '#1a1a1a', color: '#fff' }} />
                                <input placeholder="@handle" value={socialForm.handle} onChange={(e) => setSocialForm((s) => ({ ...s, handle: e.target.value }))} style={{ flex: '1 1 120px', padding: 8, borderRadius: 8, border: '1px solid #444', background: '#1a1a1a', color: '#fff' }} />
                                <input placeholder="profile url (optional)" value={socialForm.profileUrl} onChange={(e) => setSocialForm((s) => ({ ...s, profileUrl: e.target.value }))} style={{ flex: '1 1 160px', padding: 8, borderRadius: 8, border: '1px solid #444', background: '#1a1a1a', color: '#fff' }} />
                                <button type="button" onClick={addSocial} style={{ padding: '8px 14px', borderRadius: 8, background: '#27272a', color: '#fff', border: '1px solid #52525b', cursor: 'pointer' }}>Add link</button>
                            </div>
                            <ul style={{ marginTop: 12, paddingLeft: 18, color: '#a1a1aa', fontSize: '0.85rem', listStyle: 'none' }}>
                                {(me?.socialLinks || []).map((l) => (
                                    <li key={l.link_id} style={{ marginBottom: 16, padding: 12, background: '#0c0c0f', borderRadius: 8, border: '1px solid #27272a' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                                            <span>{l.platform}: <b>{l.handle}</b></span>
                                            {socialVerified(l) ? (
                                                <span style={{ color: '#4ade80', fontSize: '0.75rem' }}>bio verified</span>
                                            ) : (
                                                <span style={{ color: '#fbbf24', fontSize: '0.75rem' }}>pending bio verification</span>
                                            )}
                                            <button type="button" onClick={() => regenerateSocialCode(l.link_id)} style={{ fontSize: '0.65rem', color: '#93c5fd', background: 'none', border: 'none', cursor: 'pointer' }}>new code</button>
                                            <button type="button" onClick={() => removeSocial(l.link_id)} style={{ fontSize: '0.65rem', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>remove</button>
                                        </div>
                                        {l.verification_code ? (
                                            <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#d4d4d8' }}>
                                                Bio code: <code style={{ color: '#f0abfc', userSelect: 'all' }}>{l.verification_code}</code>
                                            </div>
                                        ) : null}
                                        {!socialVerified(l) ? (
                                            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <textarea
                                                    placeholder="Paste your public profile bio (must include the code above)"
                                                    value={verifyBioByLink[l.link_id] || ''}
                                                    onChange={(e) => setVerifyBioByLink((s) => ({ ...s, [l.link_id]: e.target.value }))}
                                                    rows={2}
                                                    style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #444', background: '#1a1a1a', color: '#fff', fontSize: '0.75rem', resize: 'vertical' }}
                                                />
                                                <button type="button" onClick={() => verifyBio(l.link_id)} style={{ alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 8, background: '#14532d', color: '#bbf7d0', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>Verify bio</button>
                                            </div>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ padding: '24px', background: '#111', borderRadius: '16px', border: '1px solid #333', gridColumn: '1 / -1' }}>
                            <h3 style={{ color: '#c084fc', marginTop: 0 }}>Kimi bridge (graph → language)</h3>
                            <p style={{ fontSize: '0.75rem', color: '#666' }}>Uses OpenAI when configured. Compresses Tutte / Barbour / prime-wheel state into readable copy for communications and research.</p>
                            <button type="button" onClick={runKimi} style={{ padding: '10px 16px', borderRadius: 8, background: '#3b0764', color: '#f5f3ff', border: 'none', cursor: 'pointer', marginBottom: 12 }}>Translate my graph position</button>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#d4d4d8', lineHeight: 1.5, padding: 12, background: '#0c0c0f', borderRadius: 8, border: '1px solid #27272a', minHeight: 60 }}>{kimiText}</div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (publicProfileUserId) {
        return (
            <PublicProfileView
                userId={publicProfileUserId}
                onClose={() => {
                    setPublicProfileUserId(null);
                    if (typeof window !== 'undefined') {
                        window.history.replaceState({}, '', window.location.pathname);
                    }
                }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans selection:bg-[#00ff88] selection:text-[#000]">
            {!currentUser && <LoginOverlay />}
            <div className="app-container">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: LOGO_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0, 242, 255, 0.3)' }}>
                            <Zap color="#fff" fill="#fff" size={24} />
                        </div>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px', fontFamily: 'Outfit' }}>TAP</span>
                    </div>
                    <nav>
                        <ul className="nav-links">
                            {navItems.map(item => (
                                <li key={item.id} className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                                    onClick={() => setActiveView(item.id)} style={{ cursor: 'pointer' }}>
                                    <item.icon size={18} /> {item.label}
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.65rem' }}>
                            <div className="pulsing-dot"></div> Epoch {networkLearning.currentEpoch}
                        </div>
                        <div className="stat-label" style={{ fontSize: '0.6rem', color: learningTrend?.isLearning ? '#00ff88' : '#ffaa00' }}>
                            {learningTrend?.isLearning ? '📈 Network Learning' : '🔄 Adapting...'}
                        </div>
                    </div>
                </aside>

                <main className="main-content">
                    <header className="header">
                        <div>
                            <h1 style={{ margin: 0, fontFamily: 'Outfit', fontSize: '1.6rem' }}>{viewTitles[activeView]?.[0]}</h1>
                            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.85rem' }}>{viewTitles[activeView]?.[1]}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {latestEpoch && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                    POI Score: <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{latestEpoch.learning.poiScore.toFixed(4)}</span>
                                </div>
                            )}
                            <button className="btn btn-outline" onClick={() => setIsSimulating(!isSimulating)}>
                                {isSimulating ? <Pause size={16} /> : <Play size={16} />}
                                {isSimulating ? ' Pause' : ' Start'}
                            </button>
                        </div>
                    </header>

                    {/* ====== DASHBOARD ====== */}
                    {activeView === 'dashboard' && (
                        <>
                            <section className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-label">Treasury</div>
                                    <div className="stat-value" style={{ color: 'var(--success)' }}>$ {treasury.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">L1 + L2 Interactions</div>
                                    <div className="stat-value">{transactions.length + digitalStats.totalTaps}</div>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                        <span>L1: {transactions.filter(t => t.layer === 'L1').length}</span>
                                        <span style={{ color: '#c77dff' }}>L2: {digitalStats.totalTaps}</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Epoch</div>
                                    <div className="stat-value">{networkLearning.currentEpoch}</div>
                                    {learningTrend && <TrendArrow value={learningTrend.poiTrend} label="POI" />}
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Network Status</div>
                                    <div className="stat-value" style={{ fontSize: '1rem', color: learningTrend?.isLearning ? '#00ff88' : '#ffaa00' }}>
                                        {learningTrend?.isLearning ? '📈 Learning' : '🔄 Adapting'}
                                    </div>
                                    {latestEpoch && (
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Density: {(latestEpoch.learning.networkDensity * 100).toFixed(0)}% | Gini: {latestEpoch.learning.gini.toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                                {/* Network Visualization */}
                                <div className="network-container">
                                    <div className="network-overlay">
                                        <span className="badge">L1 Physical</span>
                                        <span className="badge" style={{ background: 'rgba(112,0,255,0.2)', color: '#c77dff', marginLeft: '6px' }}>L2 Digital</span>
                                    </div>
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ position: 'relative', width: '320px', height: '320px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            {agents.map((agent) => (
                                                <motion.div key={agent.nodeId}
                                                    animate={{ x: agent.x, y: agent.y }}
                                                    transition={{ type: 'spring', stiffness: 45, damping: 15 }}
                                                    style={{
                                                        position: 'absolute', cursor: 'pointer',
                                                        width: agent.type === 'business' ? '24px' : '12px',
                                                        height: agent.type === 'business' ? '24px' : '12px',
                                                        background: agent.type === 'business' ? 'var(--accent-primary)' : 'var(--text-main)',
                                                        borderRadius: '50%',
                                                        marginLeft: agent.type === 'business' ? '-12px' : '-6px',
                                                        marginTop: agent.type === 'business' ? '-12px' : '-6px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '9px', color: '#000', fontWeight: 'bold',
                                                        boxShadow: agent.type === 'business' ? '0 0 15px var(--accent-primary)' : 'none',
                                                        zIndex: agent.type === 'business' ? 2 : 1
                                                    }}
                                                >{agent.name[0]}</motion.div>
                                            ))}
                                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                                <AnimatePresence>
                                                    {transactions.slice(-20).map((tx, i) => {
                                                        const fa = agents.find(a => a.nodeId === tx.from);
                                                        const ta = agents.find(a => a.nodeId === tx.to);
                                                        if (!fa || !ta) return null;
                                                        const mx = (fa.x + ta.x) / 2, my = (fa.y + ta.y) / 2;
                                                        const d = `M ${fa.x} ${fa.y} Q ${mx + 25} ${my - 25}, ${ta.x} ${ta.y}`;
                                                        const isRecent = i >= Math.max(0, (transactions.length < 20 ? transactions.length : 20) - 3);
                                                        const isDigital = tx.layer === 'L2';
                                                        const threadColor = isDigital ? '#7000ff' : THREAD_COLORS[i % THREAD_COLORS.length];
                                                        return (
                                                            <motion.path key={tx.id} d={d} fill="transparent"
                                                                stroke={isRecent ? threadColor : "rgba(255,255,255,0.08)"}
                                                                strokeWidth={isRecent ? (isDigital ? "4" : "2") : "1"}
                                                                strokeDasharray={isDigital ? "8 4" : "none"}
                                                                initial={{ pathLength: 0, opacity: 0 }}
                                                                animate={{ pathLength: 1, opacity: isRecent ? 0.9 : 0.15 }}
                                                                exit={{ opacity: 0 }} transition={{ duration: 2 }}
                                                                style={{ filter: isRecent ? `drop-shadow(0 0 8px ${threadColor})` : 'none' }}
                                                            />
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Autonomy Feed */}
                                <div className="stat-card" style={{ background: '#000', fontFamily: 'monospace', fontSize: '0.72rem', maxHeight: '380px', display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit', fontSize: '0.9rem' }}>
                                        <Brain size={16} /> Agent Thinking
                                    </h3>
                                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {autonomyLogs.length === 0 ? (
                                            <div style={{ color: '#555' }}>Agents are observing the network...</div>
                                        ) : (
                                            autonomyLogs.slice(0, 12).map((log, i) => (
                                                <div key={i} style={{ color: log.includes('🔧') ? '#ffaa00' : log.includes('🧠') ? '#00f2ff' : '#00ff88', opacity: 1 - i * 0.06 }}>
                                                    {log}
                                                </div>
                                            ))
                                        )}
                                        <div className="pulsing-dot" style={{ display: 'inline-block', width: '6px', height: '6px', margin: '8px 0' }}></div>
                                    </div>
                                </div>
                            </div>
                            {/* World Intel Feed (Live Posts) */}
                            <div className="stat-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,242,255,0.1)' }}>
                                <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', color: 'var(--accent-primary)' }}>
                                    <Globe size={18} /> World Intel Feed
                                    <span className="badge" style={{ marginLeft: 'auto', background: 'rgba(0,255,136,0.1)', color: '#00ff88', fontSize: '0.6rem' }}>LIVE</span>
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                    {worldIntel.length === 0 ? (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
                                            Monitoring global agent transmissions...
                                        </div>
                                    ) : (
                                        worldIntel.map(intel => (
                                            <motion.div
                                                key={intel.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    padding: '0.75rem',
                                                    borderRadius: '10px',
                                                    borderLeft: '3px solid var(--accent-primary)',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                                                    <span style={{ color: 'var(--accent-primary)' }}>@{intel.agentName}</span>
                                                    <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>{intel.timestamp}</span>
                                                </div>
                                                <div style={{ color: 'var(--text-main)', marginBottom: '0.4rem', fontWeight: 600 }}>{intel.serviceName} Fulfullment</div>
                                                <div style={{ color: 'var(--text-muted)', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                                    {intel.content}
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ====== NETWORK MAP (Digital Map of Humanity) ====== */}
                    {activeView === 'network-map' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Map Header Stats */}
                            <section className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-label">Nodes (Agents)</div>
                                    <div className="stat-value">{topologyGraph.nodes.length}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Edges (POI Links)</div>
                                    <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{topologyGraph.edges.length}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Network Density</div>
                                    <div className="stat-value">{latestEpoch ? (latestEpoch.learning.networkDensity * 100).toFixed(1) : 0}%</div>
                                    {learningTrend && <TrendArrow value={learningTrend.densityTrend} label="density" />}
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Trust Clustering</div>
                                    <div className="stat-value" style={{ color: '#ffaa00' }}>{latestEpoch ? latestEpoch.learning.trustClustering.toFixed(3) : '—'}</div>
                                    {learningTrend && <TrendArrow value={learningTrend.trustTrend} label="trust" />}
                                </div>
                            </section>

                            {/* The Map */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>
                                <div className="network-container" style={{ minHeight: '450px' }}>
                                    <div className="network-overlay">
                                        <span className="badge" style={{ background: 'rgba(0,242,255,0.15)' }}>Digital Map of Humanity</span>
                                        <span className="badge" style={{ background: 'rgba(255,170,0,0.15)', color: '#ffaa00', marginLeft: '6px' }}>
                                            POI Coordination
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg viewBox="-20 -20 380 350" style={{ width: '100%', maxHeight: '420px' }}>
                                            {/* Draw POI edges — edge thickness = interaction count, color = POI score */}
                                            {topologyGraph.edges.map((edge, i) => {
                                                const fromNode = topologyGraph.nodes.find(n => n.id === edge.from);
                                                const toNode = topologyGraph.nodes.find(n => n.id === edge.to);
                                                if (!fromNode || !toNode) return null;
                                                const hue = edge.poiScore > 0.7 ? 160 : (edge.poiScore > 0.4 ? 45 : 0);
                                                const color = `hsla(${hue}, 100%, 60%, ${0.3 + edge.strength * 0.7})`;
                                                return (
                                                    <g key={`edge-${i}`}>
                                                        <line
                                                            x1={fromNode.x} y1={fromNode.y}
                                                            x2={toNode.x} y2={toNode.y}
                                                            stroke={color}
                                                            strokeWidth={1 + edge.weight * 0.5}
                                                            style={{ filter: `drop-shadow(0 0 ${edge.strength * 8}px ${color})` }}
                                                        />
                                                        {/* POI score label */}
                                                        <text
                                                            x={(fromNode.x + toNode.x) / 2}
                                                            y={(fromNode.y + toNode.y) / 2 - 8}
                                                            fill={color}
                                                            fontSize="8"
                                                            textAnchor="middle"
                                                            fontFamily="monospace"
                                                        >
                                                            {edge.poiScore.toFixed(2)}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                            {/* Draw agent nodes */}
                                            {topologyGraph.nodes.map((node) => {
                                                const radius = node.type === 'business' ? 18 : 12;
                                                const color = node.type === 'business' ? '#00f2ff' : (node.type === 'organization' ? '#ffaa00' : '#fff');
                                                const agentAuto = agentAutonomies[node.id];
                                                const toolCount = agentAuto ? agentAuto.tools.length : 0;
                                                return (
                                                    <g key={node.id} onClick={() => setSelectedAgent(node.id === selectedAgent ? null : node.id)} style={{ cursor: 'pointer' }}>
                                                        {/* Trust radius glow */}
                                                        <circle cx={node.x} cy={node.y} r={radius + node.trust * 15}
                                                            fill="none" stroke={color} strokeWidth="0.5" opacity={0.15} />
                                                        {/* Node */}
                                                        <circle cx={node.x} cy={node.y} r={radius}
                                                            fill={node.id === selectedAgent ? '#ff007b' : color}
                                                            opacity={0.9} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
                                                        {/* Name */}
                                                        <text x={node.x} y={node.y + radius + 14} fill="#888" fontSize="9" textAnchor="middle" fontFamily="Outfit">
                                                            {node.name}
                                                        </text>
                                                        {/* Wallet & tools indicator */}
                                                        <text x={node.x} y={node.y + 3} fill="#000" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                                                            {node.name[0]}
                                                        </text>
                                                        {toolCount > 0 && (
                                                            <circle cx={node.x + radius - 3} cy={node.y - radius + 3} r="5" fill="#ffaa00" stroke="#000" strokeWidth="1" />
                                                        )}
                                                        {toolCount > 0 && (
                                                            <text x={node.x + radius - 3} y={node.y - radius + 6} fill="#000" fontSize="7" textAnchor="middle" fontWeight="bold">
                                                                {toolCount}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>
                                </div>

                                {/* Map Legend & Agent Detail */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {/* POI Coordination Explained */}
                                    <div className="stat-card" style={{ padding: '1rem' }}>
                                        <h4 style={{ margin: '0 0 0.75rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Target size={16} color="#ffaa00" /> POI Coordination
                                        </h4>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                            Edge color = POI verification strength:<br />
                                            <span style={{ color: 'hsl(160,100%,60%)' }}>● Green</span> = High closure (≥0.7)<br />
                                            <span style={{ color: 'hsl(45,100%,60%)' }}>● Yellow</span> = Moderate (0.4–0.7)<br />
                                            <span style={{ color: 'hsl(0,100%,60%)' }}>● Red</span> = Low POI (below 0.4)<br />
                                            <span style={{ color: '#ffaa00' }}>● Badge</span> = Agent has built tools
                                        </div>
                                    </div>

                                    {/* Selected agent detail */}
                                    {selectedAgent && (() => {
                                        const agent = agents.find(a => a.nodeId === selectedAgent);
                                        const autonomy = agentAutonomies[selectedAgent];
                                        if (!agent || !autonomy) return null;
                                        const summary = autonomy.getSummary();
                                        return (
                                            <div className="stat-card">
                                                <h4 style={{ margin: '0 0 0.5rem', fontFamily: 'Outfit' }}>{agent.name}</h4>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <div><b>Wallet:</b> {agent.walletAddress.slice(0, 12)}...</div>
                                                    <div><b>Balance:</b> <span style={{ color: 'var(--success)' }}>${agent.balance.toFixed(0)}</span></div>
                                                    <div><b>Trust Score:</b> {agent.c_score.toFixed(3)}</div>
                                                    <div><b>Strategy:</b> {summary.strategy.pricing} pricing / {summary.strategy.partnerSelection} partners</div>
                                                    <div><b>Adaptations:</b> {summary.adaptations}</div>
                                                    <div><b>Success Rate:</b> {(summary.successRate * 100).toFixed(0)}%</div>
                                                    <div><b>Avg POI:</b> {summary.avgPoi.toFixed(3)}</div>
                                                    {summary.tools.length > 0 && (
                                                        <div>
                                                            <b>Tools Built:</b>
                                                            {summary.tools.map(t => (
                                                                <div key={t.name} style={{ padding: '3px 0', paddingLeft: '8px', borderLeft: '2px solid #ffaa00', marginTop: '3px' }}>
                                                                    🔧 {t.name} <span style={{ opacity: 0.5 }}>({t.executions} runs)</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Network topology stats */}
                                    <div className="stat-card" style={{ padding: '1rem' }}>
                                        <h4 style={{ margin: '0 0 0.5rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <BarChart3 size={16} /> Topology Metrics
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.7rem' }}>
                                            <div>Edges: <b>{topologyGraph.edges.length}</b></div>
                                            <div>Avg POI: <b style={{ color: 'var(--accent-primary)' }}>
                                                {topologyGraph.edges.length > 0
                                                    ? (topologyGraph.edges.reduce((s, e) => s + e.poiScore, 0) / topologyGraph.edges.length).toFixed(3)
                                                    : '—'}
                                            </b></div>
                                            <div>Volume: <b>${topologyGraph.edges.reduce((s, e) => s + e.volume, 0).toFixed(0)}</b></div>
                                            <div>Max Weight: <b>{Math.max(0, ...topologyGraph.edges.map(e => e.weight))}</b></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'tutte-atlas' && (
                        <TutteAtlas currentUserId={currentUser?.id || ''} />
                    )}

                    {activeView === 'nfc-hub' && (
                        <NfcMarketplace currentUserId={currentUser?.id || ''} />
                    )}

                    {activeView === 'joint-kimi' && (
                        <JointKimiRoom currentUserId={currentUser?.id || ''} />
                    )}

                    {/* ====== LEARNING VIEW ====== */}
                    {activeView === 'learning' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Key Learning Metrics */}
                            <section className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-label">POI Coordination Score</div>
                                    <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{latestEpoch ? latestEpoch.learning.poiScore.toFixed(4) : '—'}</div>
                                    {learningTrend && <TrendArrow value={learningTrend.poiTrend} label="since start" />}
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Closure Rate</div>
                                    <div className="stat-value" style={{ color: '#00ff88' }}>{latestEpoch ? (latestEpoch.learning.closureRate * 100).toFixed(0) : 0}%</div>
                                    {learningTrend && <TrendArrow value={learningTrend.closureRateTrend} label="trend" />}
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Gini Coefficient</div>
                                    <div className="stat-value">{latestEpoch ? latestEpoch.learning.gini.toFixed(3) : '—'}</div>
                                    {learningTrend && <TrendArrow value={learningTrend.giniTrend} label="equality" invert />}
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Knowledge Diffusion</div>
                                    <div className="stat-value" style={{ color: '#c77dff' }}>{latestEpoch ? latestEpoch.learning.diffusionRate.toFixed(3) : '—'}</div>
                                </div>
                            </section>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                {/* Epoch History Timeline */}
                                <div className="stat-card" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <h3 style={{ margin: '0 0 1rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <TrendingUp size={18} /> Epoch Timeline
                                    </h3>
                                    {epochHistory.length === 0 ? (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Waiting for first epoch to close (15s)...</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {epochHistory.slice().reverse().map(epoch => (
                                                <div key={epoch.epoch} style={{
                                                    padding: '0.75rem',
                                                    background: epoch.learning.poiScore > 0 ? 'rgba(0,242,255,0.04)' : 'rgba(255,255,255,0.02)',
                                                    borderRadius: '10px',
                                                    borderLeft: `3px solid ${epoch.learning.closureRate > 0.5 ? '#00ff88' : (epoch.learning.closureRate > 0 ? '#ffaa00' : '#333')}`
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Epoch {epoch.epoch}</span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            {new Date(epoch.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.65rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                        <span>Txns: <b>{epoch.metrics.transactions}</b></span>
                                                        <span>Closures: <b style={{ color: '#00ff88' }}>{epoch.metrics.closures}</b></span>
                                                        <span>Tools: <b style={{ color: '#ffaa00' }}>{epoch.metrics.toolsBuilt}</b></span>
                                                        <span>POI: <b style={{ color: 'var(--accent-primary)' }}>{epoch.learning.poiScore.toFixed(3)}</b></span>
                                                        <span>Density: <b>{(epoch.learning.networkDensity * 100).toFixed(0)}%</b></span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Agent Autonomy Summary */}
                                <div className="stat-card" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <h3 style={{ margin: '0 0 1rem', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Wrench size={18} /> Agent Autonomy
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {agents.map(agent => {
                                            const auto = agentAutonomies[agent.nodeId];
                                            if (!auto) return null;
                                            const summary = auto.getSummary();
                                            return (
                                                <div key={agent.nodeId} style={{
                                                    padding: '0.75rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    borderRadius: '10px',
                                                    borderLeft: `3px solid ${summary.tools.length > 2 ? '#00ff88' : (summary.tools.length > 0 ? '#ffaa00' : '#333')}`
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{agent.name}</span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>
                                                            {summary.tools.length} tools
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.6rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                        <span>Strategy: {summary.strategy.pricing}</span>
                                                        <span>Partners: {summary.strategy.partnerSelection}</span>
                                                        <span>Risk: {summary.strategy.riskTolerance.toFixed(1)}</span>
                                                        <span>Adaptations: {summary.adaptations}</span>
                                                    </div>
                                                    {summary.tools.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                            {summary.tools.map(t => (
                                                                <span key={t.name} style={{
                                                                    padding: '2px 6px', fontSize: '0.55rem',
                                                                    background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.2)',
                                                                    borderRadius: '4px', color: '#ffaa00'
                                                                }}>{t.name}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Learning Verdict */}
                            {learningTrend && (
                                <div className="stat-card" style={{
                                    padding: '1.5rem',
                                    border: `1px solid ${learningTrend.isLearning ? 'rgba(0,255,136,0.3)' : 'rgba(255,170,0,0.3)'}`,
                                    background: learningTrend.isLearning ? 'rgba(0,255,136,0.03)' : 'rgba(255,170,0,0.03)'
                                }}>
                                    <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'Outfit', color: learningTrend.isLearning ? '#00ff88' : '#ffaa00' }}>
                                        {learningTrend.isLearning ? '📈 The Network IS Learning' : '🔄 The Network is Adapting'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                        {learningTrend.isLearning
                                            ? `POI is effectively coordinating the network. Closure rates are ${learningTrend.closureRateTrend > 0 ? 'improving' : 'stable'}, network density is ${learningTrend.densityTrend > 0 ? 'growing' : 'stable'}, and ${learningTrend.giniTrend < 0 ? 'wealth is distributing more evenly' : 'economic patterns are forming'}.`
                                            : `The network is in an adaptation phase. Agents are building tools and adjusting strategies. POI trend: ${learningTrend.poiTrend.toFixed(4)}. The system needs more interactions to establish stable coordination patterns.`
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ====== MARKETPLACE ====== */}
                    {activeView === 'marketplace' && (
                        <ServiceMarketplace agents={agents} marketplace={marketplace} digitalTapProtocol={digitalTapProtocol}
                            wallets={wallets} codexInterfaces={codexInterfaces} onServiceExchange={handleServiceExchange}
                            networkStats={networkStats} logs={logs} />
                    )}

                    {/* ====== STOREFRONTS ====== */}
                    {activeView === 'storefronts' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {agents.map(agent => (
                                <AgentStorefront key={agent.nodeId} agent={agent}
                                    services={marketplace.listings.filter(s => s.agentId === agent.nodeId)}
                                    wallet={wallets[agent.nodeId]} codex={codexInterfaces[agent.nodeId]}
                                    tapHistory={digitalTapProtocol.getAgentHistory(agent.nodeId)}
                                    onRequestService={() => setActiveView('marketplace')}
                                    onTap={handleTap} />
                            ))}
                        </div>
                    )}

                    {/* ====== APP STORE ====== */}
                    {activeView === 'app-store' && (
                        <SubAppStore
                            apps={subApps}
                            onUseApp={handleUseSubApp}
                            isLiveEconomy={isLiveEconomy}
                        />
                    )}

                    {/* ====== BUILD LAB ====== */}
                    {activeView === 'build-lab' && (
                        <BuildLab
                            currentUser={currentUser}
                            subAppEngine={subAppEngine}
                            onAppCreated={handleAppCreated}
                        />
                    )}

                    {/* ====== GOVERNANCE ====== */}
                    {activeView === 'governance' && (
                        <GovernanceBoard
                            proposals={proposals}
                            agents={agents}
                            onVote={handleVote}
                        />
                    )}

                    {/* ====== USER DASHBOARD ====== */}
                    {activeView === 'profile' && (
                        <UserDashboard />
                    )}

                    {/* ====== LEDGER ====== */}
                    {activeView === 'ledger' && (
                        <div className="stat-card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead><tr><th>Layer</th><th>Time</th><th>Interaction</th><th>Amount</th><th>Type</th></tr></thead>
                                <tbody>
                                    {transactions.slice(-30).reverse().map(tx => (
                                        <tr key={tx.id}>
                                            <td><span className="badge" style={{ fontSize: '9px', background: tx.layer === 'L2' ? 'rgba(112,0,255,0.2)' : 'rgba(0,242,255,0.15)', color: tx.layer === 'L2' ? '#c77dff' : '#00f2ff' }}>{tx.layer || 'L1'}</span></td>
                                            <td style={{ fontSize: '0.7rem', opacity: 0.6 }}>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{tx.fromName} → {tx.toName}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>${tx.amount}</td>
                                            <td style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7 }}>{tx.type}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;

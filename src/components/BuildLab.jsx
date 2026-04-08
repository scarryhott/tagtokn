import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Save, X } from 'lucide-react';

/**
 * BuildLab Component
 * Allows a logged-in human user to define a new sub-app manifest and register it.
 */
const BuildLab = ({ currentUser, subAppEngine, onAppCreated }) => {
    const [showForm, setShowForm] = useState(false);
    const [manifest, setManifest] = useState({
        name: '',
        description: '',
        category: 'Utility',
        suggestedPrice: 5,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setManifest((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        if (!manifest.name) return;
        const app = subAppEngine.registerApp(
            currentUser.agentId,
            currentUser.username,
            manifest
        );
        onAppCreated(app);
        setShowForm(false);
        setManifest({ name: '', description: '', category: 'Utility', suggestedPrice: 5 });
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ color: '#00ff88' }}>Build Lab – Create Your Sub‑App</h2>
            {showForm ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: '#111', padding: '20px', borderRadius: '16px', border: '1px solid #333' }}
                >
                    <input
                        name="name"
                        placeholder="App Name"
                        value={manifest.name}
                        onChange={handleChange}
                        style={{ width: '100%', marginBottom: '10px', padding: '8px', background: '#222', border: '1px solid #444', color: '#fff' }}
                    />
                    <textarea
                        name="description"
                        placeholder="Description"
                        value={manifest.description}
                        onChange={handleChange}
                        rows={4}
                        style={{ width: '100%', marginBottom: '10px', padding: '8px', background: '#222', border: '1px solid #444', color: '#fff' }}
                    />
                    <input
                        name="category"
                        placeholder="Category"
                        value={manifest.category}
                        onChange={handleChange}
                        style={{ width: '100%', marginBottom: '10px', padding: '8px', background: '#222', border: '1px solid #444', color: '#fff' }}
                    />
                    <input
                        name="suggestedPrice"
                        type="number"
                        placeholder="Price (ETH)"
                        value={manifest.suggestedPrice}
                        onChange={handleChange}
                        style={{ width: '100%', marginBottom: '10px', padding: '8px', background: '#222', border: '1px solid #444', color: '#fff' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleSubmit} style={{ flex: 1, padding: '10px', background: '#00ff88', color: '#000', border: 'none', borderRadius: '8px' }}>
                            <Save size={16} /> Create
                        </button>
                        <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px', background: '#ff4444', color: '#000', border: 'none', borderRadius: '8px' }}>
                            <X size={16} /> Cancel
                        </button>
                    </div>
                </motion.div>
            ) : (
                <button
                    onClick={() => setShowForm(true)}
                    style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #00ff88, #0066ff)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 700 }}
                >
                    <Plus size={16} /> New Sub‑App
                </button>
            )}
        </div>
    );
};

export default BuildLab;

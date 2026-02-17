import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DEFAULT_CONFIG } from '../utils/config';

function AdminPanel({ isOpen, onClose }) {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, 'settings', 'gameConfig');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setConfig(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching config:", error);
            } finally {
                setLoading(false);
            }
        };
        if (isOpen) fetchConfig();
    }, [isOpen]);

    const handleSave = async () => {
        setSaveStatus('saving');
        try {
            await setDoc(doc(db, 'settings', 'gameConfig'), config);
            setSaveStatus('saved');
            setTimeout(() => {
                setSaveStatus(null);
                onClose();
            }, 800);
        } catch (error) {
            console.error("Error saving config:", error);
            setSaveStatus('error');
        }
    };

    const updateDuration = (key, value) => {
        setConfig(prev => ({
            ...prev,
            durations: {
                ...(prev?.durations || DEFAULT_CONFIG.durations),
                [key]: parseInt(value) || 0
            }
        }));
    };

    const updateRoleCount = (key, value) => {
        setConfig(prev => ({
            ...prev,
            roles: {
                ...(prev?.roles || DEFAULT_CONFIG.roles),
                counts: {
                    ...(prev?.roles?.counts || DEFAULT_CONFIG.roles.counts),
                    [key]: parseInt(value) || 0
                }
            }
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay admin-panel-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="glass-card modal-content admin-modal">
                <div className="modal-header">
                    <h2>⚙️ Pengaturan</h2>
                </div>
                <button className="close-btn corner-close" onClick={onClose} title="Tutup">×</button>

                {loading ? <p>Memuat konfigurasi...</p> : (
                    <div className="admin-scroll-area">
                        <section>
                            <h3>⏱️ Durasi Fase (Detik)</h3>
                            <div className="config-grid">
                                {Object.entries(config?.durations || {}).map(([phase, time]) => (
                                    <div key={phase} className="config-item">
                                        <label>{phase.replace('_', ' ').toUpperCase()}</label>
                                        <input
                                            type="number"
                                            value={time}
                                            onChange={(e) => updateDuration(phase, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3>🐺 Pengaturan Role (Manual)</h3>
                            <p className="section-desc">Pemain sisa akan otomatis menjadi Warga.</p>
                            <div className="config-grid">
                                {Object.entries(config?.roles?.counts || {}).map(([role, count]) => (
                                    <div key={role} className="config-item">
                                        <label>{role.toUpperCase()}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="5"
                                            value={count}
                                            onChange={(e) => updateRoleCount(role, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="danger-zone">
                            <h3>⚠️ Reset Konfigurasi</h3>
                            <button className="secondary-btn" onClick={() => setConfig(DEFAULT_CONFIG)}>
                                Kembalikan ke Default
                            </button>
                        </section>
                    </div>
                )}

                <div className="modal-actions">
                    {saveStatus === 'saved' && <span className="status-msg success">Tersimpan!</span>}
                    {saveStatus === 'error' && <span className="status-msg error">Gagal menyimpan!</span>}
                    <button className="secondary-btn" onClick={onClose}>BATAL</button>
                    <button className="glow-btn" onClick={handleSave} disabled={saveStatus === 'saving'}>
                        {saveStatus === 'saving' ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
                    </button>
                </div>
            </div>
            <style jsx>{`
                .admin-modal {
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    padding-top: 4rem;
                }
                .admin-scroll-area {
                    overflow-y: auto;
                    padding: 1rem 0;
                }
                .config-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 1rem;
                    margin-top: 0.5rem;
                }
                .config-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }
                .config-item label {
                    font-size: 0.7rem;
                    opacity: 0.8;
                }
                .config-item input {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 0.5rem;
                    border-radius: 8px;
                    outline: none;
                    transition: border 0.3s;
                }
                .config-item input:focus {
                    border-color: #E0006F;
                }
                section {
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                h3 {
                    font-size: 1rem;
                    margin-bottom: 1rem;
                    color: #94a3b8;
                }
                .status-msg {
                    margin-right: 1rem;
                    font-size: 0.9rem;
                }
                .success { color: #10b981; }
                .error { color: #ef4444; }
                .danger-zone {
                    opacity: 0.8;
                }
            `}</style>
        </div>
    );
}

export default AdminPanel;

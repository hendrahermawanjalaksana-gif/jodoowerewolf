import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

function HistoryModal({ isOpen, onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const q = query(collection(db, "history"), orderBy("timestamp", "desc"), limit(20));
                const snapshot = await getDocs(q);
                const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setHistory(historyData);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };
        if (isOpen) fetchHistory();
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="glass-card modal-content history-modal">
                <div className="modal-header">
                    <h2>🕒 Riwayat Pertandingan</h2>
                    <button className="close-btn corner-close" onClick={onClose}>×</button>
                </div>

                <div className="history-list">
                    {loading ? <p>Memuat riwayat...</p> : history.length === 0 ? <p>Belum ada riwayat game.</p> : (
                        history.map(game => (
                            <div key={game.id} className="history-item">
                                <div className="history-game-info">
                                    <span className={`win-status ${game.winner}`}>
                                        {game.winner === 'villagers' ? '🏘️ WARGA MENANG' : '🐺 SERIGALA MENANG'}
                                    </span>
                                    <span className="game-date">{new Date(game.timestamp).toLocaleDateString()}</span>
                                </div>
                                <div className="history-players">
                                    {game.players.slice(0, 5).map((p, i) => (
                                        <span key={i} className="mini-player-tag">{p.username} ({p.role})</span>
                                    ))}
                                    {game.players.length > 5 && <span className="mini-player-tag">+{game.players.length - 5} lainnya</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <style jsx>{`
                .history-modal {
                    max-width: 600px;
                    width: 95%;
                    max-height: 80vh;
                }
                .history-list {
                    overflow-y: auto;
                    padding: 1rem 0;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .history-item {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 1rem;
                    border-radius: 12px;
                }
                .history-game-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.8rem;
                }
                .win-status {
                    font-weight: bold;
                    font-size: 0.9rem;
                }
                .win-status.villagers { color: #10b981; }
                .win-status.werewolves { color: #ef4444; }
                .game-date {
                    font-size: 0.8rem;
                    opacity: 0.6;
                }
                .history-players {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .mini-player-tag {
                    font-size: 0.7rem;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px 8px;
                    border-radius: 4px;
                    opacity: 0.8;
                }
            `}</style>
        </div>
    );
}

export default HistoryModal;

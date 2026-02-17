import React, { useState, useEffect } from 'react';

function GameView({
    gameState,
    currentRoom,
    user,
    handleNightAction,
    handleVote,
    isChatOpen,
    setIsChatOpen,
    messages,
    sendChatMessage,
    chatInput,
    setChatInput,
    showingRole,
    setShowingRole,
    winner,
    playAgain
}) {
    const [localHidden, setLocalHidden] = useState(false);

    // Reset local hidden when phase changes
    useEffect(() => {
        setLocalHidden(false);
    }, [gameState.phase]);

    const isNight = gameState.phase === 'night';
    const phaseTitle = {
        'night': '🌙 Malam Hari',
        'morning_result': '☀️ Matahari Terbit',
        'discuss': '💬 Waktu Diskusi',
        'vote': '🗳️ Waktu Voting',
        'elimination_result': '⚖️ Hasil Voting'
    }[gameState.phase];

    const pendingActions = currentRoom?.pendingActions || {};

    return (
        <div className="main-content game-view">
            <div className={`game-header ${isNight ? 'night' : 'day'}`}>
                <div className="phase-info">
                    <h2>{phaseTitle}</h2>
                    <span>Hari Ke-{gameState.day}</span>
                </div>
                <div className="timer-circle">
                    <svg viewBox="0 0 36 36">
                        <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="circle" strokeDasharray={`${(gameState.timer / (gameState.phase === 'discuss' ? 60 : 15)) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <span className="timer-text">{gameState.timer}</span>
                </div>
            </div>

            <div className="game-layout">
                <div className="game-main-area">
                    <div className="game-players-list">
                        {currentRoom?.players?.map(player => {
                            const voteCount = Object.values(currentRoom?.votes || {}).filter(v => v === player.id).length;
                            const isMySelection = (currentRoom?.votes || {})[user?.id] === player.id;

                            return (
                                <div key={player.id} className={`game-player-card ${player.alive ? 'alive' : 'dead'} ${player.id === user?.id ? 'me' : ''} ${isMySelection ? 'voted' : ''}`}>
                                    <img src={player.avatar} alt="Avatar" />
                                    <div className="player-details">
                                        <span className="username">{player.username}</span>
                                        {player.id === user?.id && <span className="your-role">Peran: {player.role?.name}</span>}
                                        {!player.alive && <span className="dead-label">ELIMINASI</span>}
                                    </div>

                                    {gameState.phase === 'vote' && player.alive && voteCount > 0 && (
                                        <div className="vote-badge">{voteCount}</div>
                                    )}

                                    {isNight && player.alive && player.id !== user?.id && user?.alive && (
                                        <div className="action-container">
                                            {user?.role?.team === 'werewolves' && (
                                                <button className={`action-btn kill ${pendingActions.kill === player.id ? 'active' : ''}`} onClick={() => handleNightAction(player.id, 'kill')}>🔪</button>
                                            )}
                                            {user?.role?.name === 'Penerawang' && (
                                                <button className={`action-btn peek ${pendingActions.peek === player.id ? 'active' : ''}`} onClick={() => handleNightAction(player.id, 'peek')}>👁️</button>
                                            )}
                                            {user?.role?.name === 'Dokter' && (
                                                <button className={`action-btn protect ${pendingActions.protect === player.id ? 'active' : ''}`} onClick={() => handleNightAction(player.id, 'protect')}>💊</button>
                                            )}
                                            {user?.role?.name === 'Penjaga' && (
                                                <button className={`action-btn guard ${pendingActions.guard === player.id ? 'active' : ''}`} onClick={() => handleNightAction(player.id, 'guard')}>🛡️</button>
                                            )}
                                            {/* Seer Feedback */}
                                            {user?.role?.name === 'Penerawang' && pendingActions.peek === player.id && (
                                                <div className="seer-reveal">
                                                    {player.role?.team === 'werewolves' ? '🐺 SERIGALA' : '🏘️ AMAN'}
                                                </div>
                                            )}
                                            {/* Hunter Logic */}
                                            {user?.role?.name === 'Pemburu' && !user.alive && !user.hasFired && (
                                                <button className={`action-btn kill ${pendingActions.hunterShot === player.id ? 'active' : ''}`} onClick={() => handleNightAction(player.id, 'hunterShot')}>🏹</button>
                                            )}
                                        </div>
                                    )}

                                    {gameState.phase === 'vote' && player.alive && player.id !== user?.id && user?.alive && (
                                        <button className={`vote-btn ${isMySelection ? 'active' : ''}`} onClick={() => handleVote(player.id)}>VOTE</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="game-footer">
                        <div className="game-chat-preview">
                            {gameState.logs.slice(-2).map((log, i) => (
                                <p key={i} className="system-log">{log}</p>
                            ))}
                        </div>
                        <button className="glow-btn chat-toggle-btn" onClick={() => setIsChatOpen(!isChatOpen)}>
                            {isChatOpen ? 'TUTUP CHAT' : 'BUKA CHAT'}
                        </button>
                    </div>
                </div>

                <div className={`chat-sidebar ${isChatOpen ? 'open' : ''}`}>
                    <div className="chat-sidebar-overlay" onClick={() => setIsChatOpen(false)}></div>
                    <div className="glass-card chat-drawer">
                        <div className="chat-header">
                            <h3>{gameState.phase === 'night' && user?.role?.team === 'werewolves' ? '🐺 CHAT SERIGALA' : '💬 CHAT WARGA'}</h3>
                            <button className="close-chat" onClick={() => setIsChatOpen(false)}>×</button>
                        </div>
                        <div className="chat-history">
                            {messages.map(msg => (
                                <div key={msg.id} className={`chat-bubble ${msg.senderId === user?.id ? 'me' : ''}`}>
                                    <span className="sender">{msg.senderName}</span>
                                    <p>{msg.text}</p>
                                    <span className="time">{msg.timestamp}</span>
                                </div>
                            ))}
                        </div>
                        <form className="chat-input-area" onSubmit={sendChatMessage}>
                            <input type="text" placeholder="Ketik pesan..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                            <button type="submit">🕊️</button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Phase Overlays */}
            {gameState.phase === 'morning_result' && !localHidden && (
                <div className="phase-result-overlay" onClick={(e) => { if (e.target === e.currentTarget) setLocalHidden(true); }}>
                    <div className="result-card glass-card">
                        <button className="close-btn corner-close" onClick={() => setLocalHidden(true)}>×</button>
                        <h3>Tadi Malam...</h3>
                        {gameState.lastNightVictim ? (
                            <div className="victim-display">
                                <img src={gameState.lastNightVictim.avatar} alt="victim" />
                                <p><strong>{gameState.lastNightVictim.username}</strong> ditemukan tewas mengenaskan.</p>
                            </div>
                        ) : (
                            <p>Syukurlah, tidak ada yang mati semalam.</p>
                        )}
                    </div>
                </div>
            )}

            {gameState.phase === 'elimination_result' && !localHidden && (
                <div className="phase-result-overlay" onClick={(e) => { if (e.target === e.currentTarget) setLocalHidden(true); }}>
                    <div className="result-card glass-card">
                        <button className="close-btn corner-close" onClick={() => setLocalHidden(true)}>×</button>
                        <h3>Keputusan Warga...</h3>
                        {gameState.lastVotedOut ? (
                            <div className="victim-display">
                                <img src={gameState.lastVotedOut.avatar} alt="victim" />
                                <p><strong>{gameState.lastVotedOut.username}</strong> telah dieksekusi mati.</p>
                            </div>
                        ) : (
                            <p>Warga tidak sepakat. Tidak ada yang dieksekusi.</p>
                        )}
                    </div>
                </div>
            )}

            {showingRole && (
                <div className="role-reveal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowingRole(false); }}>
                    <div className="role-card-container">
                        <div className="role-card" style={{ borderColor: user?.role?.color }}>
                            <button className="close-btn corner-close" onClick={() => setShowingRole(false)}>×</button>
                            <span className="role-icon">{user?.role?.icon}</span>
                            <h1>KAMU ADALAH</h1>
                            <h2 style={{ color: user?.role?.color }}>{user?.role?.name?.toUpperCase()}</h2>
                            <p>{user?.role?.description}</p>
                            <button className="glow-btn" onClick={() => setShowingRole(false)}>MENGERTI</button>
                        </div>
                    </div>
                </div>
            )}

            {winner && (
                <div className="win-overlay" onClick={(e) => { if (e.target === e.currentTarget) playAgain(); }}>
                    <div className="win-content">
                        <button className="close-btn corner-close" onClick={playAgain}>×</button>
                        <div className="win-icon">{winner === 'villagers' ? '🏘️' : '🐺'}</div>
                        <h1>{winner === 'villagers' ? 'WARGA MENANG' : 'SERIGALA MENANG'}</h1>
                        <p>{winner === 'villagers' ? 'Semua serigala telah dimusnahkan.' : 'Serigala telah menguasai desa.'}</p>
                        <button className="glow-btn" onClick={playAgain}>MAIN LAGI</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GameView;

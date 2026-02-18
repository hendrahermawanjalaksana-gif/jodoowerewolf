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
    // chatInput props removed
    showingRole,
    setShowingRole,
    winner,
    playAgain
}) {
    const [localHidden, setLocalHidden] = useState(false);
    const [chatInput, setChatInput] = useState('');

    // Reset local hidden when phase changes
    // Also Close Chat if phase is not 'discuss' (auto-close for vote phase)
    useEffect(() => {
        setLocalHidden(false);
        if (gameState.phase === 'vote' || gameState.phase === 'night' || gameState.phase === 'morning_result') {
            setIsChatOpen(false);
        }
    }, [gameState.phase, setIsChatOpen]);

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
                <div className="game-header-inner">
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
                                        {player.id === user?.id && <span className="your-role">Peran Anda: {player.role?.name}</span>}
                                        {!player.alive && <span className="dead-label">ELIMINASI</span>}

                                        {/* Actions moved inside details for vertical stacking */}
                                        <div className="action-container-vertical">
                                            {isNight && player.alive && player.id !== user?.id && user?.alive && (
                                                <>
                                                    {user?.role?.team === 'werewolves' && (
                                                        <button className={`action-btn kill ${pendingActions.kill === player.id ? 'active' : ''}`} title="Bunuh" onClick={() => handleNightAction(player.id, 'kill')}>🔪</button>
                                                    )}
                                                    {user?.role?.name === 'Penerawang' && (
                                                        <button
                                                            className={`action-btn see ${pendingActions.see === player.id ? 'active' : ''}`}
                                                            disabled={!!pendingActions.see && pendingActions.see !== player.id}
                                                            title="Terawang"
                                                            onClick={() => handleNightAction(player.id, 'see')}
                                                        >
                                                            👁️
                                                        </button>
                                                    )}
                                                    {user?.role?.name === 'Dokter' && (
                                                        <button className={`action-btn protect ${pendingActions.protect === player.id ? 'active' : ''}`} title="Lindungi" onClick={() => handleNightAction(player.id, 'protect')}>💊</button>
                                                    )}
                                                    {user?.role?.name === 'Penjaga' && (
                                                        <button className={`action-btn guard ${pendingActions.guard === player.id ? 'active' : ''}`} title="Jaga" onClick={() => handleNightAction(player.id, 'guard')}>🛡️</button>
                                                    )}

                                                    {/* Seer Reveal Logic */}
                                                    {user?.role?.name === 'Penerawang' && pendingActions.see === player.id && (
                                                        <div className="seer-reveal-compact">
                                                            {player.role?.team === 'werewolves' ? '🐺 !' : '🏘️'}
                                                        </div>
                                                    )}

                                                    {/* Hunter Action */}
                                                    {user?.role?.name === 'Pemburu' && !user.alive && !user.hasFired && (
                                                        <button className={`action-btn hunter-shot ${pendingActions.hunterShot === player.id ? 'active' : ''}`} title="Tembak" onClick={() => handleNightAction(player.id, 'hunterShot')}>🏹</button>
                                                    )}
                                                </>
                                            )}

                                            {gameState.phase === 'vote' && player.alive && user.alive && player.id !== user.id && (
                                                <button className={`vote-btn-inline ${(currentRoom.votes || {})[user.id] === player.id ? 'active' : ''}`} onClick={() => handleVote(player.id)}>
                                                    🗳️ Pilih {player.username}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {gameState.phase === 'vote' && player.alive && voteCount > 0 && (
                                        <div className="vote-badge">{voteCount}</div>
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
                    <div className="glass-card chat-drawer">
                        <button className="corner-close" onClick={() => setIsChatOpen(false)}>×</button>
                        <div className="chat-header">
                            <h3>{gameState.phase === 'night' && user?.role?.team === 'werewolves' ? '🐺 CHAT SERIGALA' : '💬 CHAT WARGA'}</h3>
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
                        {(user.alive && gameState.phase === 'discuss') ? (
                            <form className="chat-input-area" onSubmit={(e) => {
                                e.preventDefault();
                                if (chatInput.trim()) {
                                    sendChatMessage(chatInput);
                                    setChatInput('');
                                }
                            }}>
                                <input
                                    type="text"
                                    id="game-chat-input"
                                    name="chatMessage"
                                    placeholder="Ketik pesan..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    autoComplete="off"
                                />
                                <button type="submit">🕊️</button>
                            </form>
                        ) : (
                            <div className="chat-input-area" style={{ justifyContent: 'center', color: '#888' }}>
                                <i>Chat hanya aktif saat sesi diskusi.</i>
                            </div>
                        )}
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
                        <button className="corner-close" onClick={playAgain}>×</button>
                        <div className="winner-avatar-display">
                            <img src={user?.avatar} alt="Winner" className={`winner-img ${user?.role?.team === winner ? 'celebrate' : 'gray'}`} />
                            <div className="win-icon-mini">{winner === 'villagers' ? '🏘️' : '🐺'}</div>
                        </div>
                        <h1>{winner === 'villagers' ? 'WARGA MENANG' : 'SERIGALA MENANG'}</h1>
                        <p>{user?.role?.team === winner ? 'Selamat! Kamu berhasil memenangkan pertandingan.' : 'Tim kamu kalah, coba lagi di pertandingan berikutnya.'}</p>
                        <button className="glow-btn" onClick={playAgain}>MAIN LAGI</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GameView;

import React from 'react';

function RoomView({ currentRoom, user, leaveRoom, startGame }) {
    return (
        <div className="main-content">
            <div className="glass-card room-container">
                <div className="room-header">
                    <div className="room-info">
                        <h2>{currentRoom?.name}</h2>
                        <span className="room-code">KODE: {currentRoom?.code}</span>
                    </div>
                    <button className="leave-btn" onClick={leaveRoom}>KELUAR</button>
                </div>
                <div className="room-players-grid">
                    {Array.from({ length: currentRoom?.maxPlayers || 0 }).map((_, index) => {
                        const player = currentRoom?.players[index];
                        return (
                            <div key={index} className={`player-slot ${player ? 'occupied' : 'empty'}`}>
                                {player ? (
                                    <>
                                        <div className="avatar-wrapper">
                                            <img src={player.avatar} alt="Avatar" />
                                            {player.id === currentRoom?.host && <span className="host-crown">👑</span>}
                                            {player.isReady && <span className="ready-badge">READY</span>}
                                        </div>
                                        <span className="player-name">{player.username}</span>
                                    </>
                                ) : (
                                    <div className="empty-slot-content"><span className="plus">+</span><span>Menunggu...</span></div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="room-footer">
                    <div className="room-meta">
                        <span>Mode: {currentRoom?.mode}</span>
                        <span>{currentRoom?.players.length}/{currentRoom?.maxPlayers} Players</span>
                    </div>
                    {currentRoom?.host === user?.id ? (
                        <button
                            className={`glow-btn start-btn ${currentRoom?.players.length < 5 ? 'disabled' : ''}`}
                            disabled={currentRoom?.players.length < 5}
                            onClick={startGame}
                        >
                            MULAI GAME
                        </button>
                    ) : (
                        <button className="glow-btn ready-btn">SIAP</button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RoomView;

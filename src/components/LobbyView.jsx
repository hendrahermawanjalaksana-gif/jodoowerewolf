import React from 'react';

function LobbyView({
    user,
    handleLogout,
    joinCode,
    setJoinCode,
    handleJoinByCode,
    lobbyError,
    rooms,
    handleJoinRoom,
    setIsCreatingRoom,
    isCreatingRoom,
    roomForm,
    setRoomForm,
    handleCreateRoom,
    setIsHistoryOpen,
    handleAvatarUpload,
    handleDeleteRoom
}) {
    const fileInputRef = React.useRef(null);

    return (
        <div className="main-content">
            <div className="glass-card lobby-container">
                <div className="lobby-header">
                    <div className="user-profile">
                        <div className="user-avatar-section">
                            <div className="avatar-upload-wrapper">
                                <img src={user?.avatar} alt="Avatar" className="avatar" />
                            </div>
                            <button className="secondary-btn history-lobby-btn" onClick={() => setIsHistoryOpen(true)}>
                                🕒 Riwayat Game
                            </button>
                        </div>
                        <div className="user-info">
                            <h3>{user?.username}</h3>
                            <div className="user-stats-mini">
                                <span>🎮 {user?.gamesPlayed || 0}</span>
                                <span className="stat-win">🏆 {user?.wins || 0}</span>
                                <span className="stat-loss">💀 {user?.losses || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="lobby-actions">
                        <button className="logout-icon-btn" onClick={handleLogout} title="Logout">🚪</button>
                    </div>
                </div>
                <div className="lobby-content">
                    <div className="lobby-title-bar">
                        <h2>LOBBY GLOBAL</h2>
                        <form className="join-code-form" onSubmit={handleJoinByCode}>
                            <input
                                type="text"
                                placeholder="Kode Room..."
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                            />
                            <button type="submit">GABUNG</button>
                        </form>
                    </div>
                    <div className="room-list">
                        {lobbyError ? (
                            <div className="empty-rooms error">
                                <p>Gagal Terhubung ke Database</p>
                                <span>{lobbyError}</span>
                                <p style={{ marginTop: '1rem', fontSize: '0.8rem' }}>Pastikan Firestore sudah dibuat dan rules diset public.</p>
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="empty-rooms">
                                <p>Tidak ada room aktif.</p>
                                <span>Jadilah yang pertama membuat room!</span>
                            </div>
                        ) : (
                            <div className="rooms-grid">
                                {rooms.map(room => (
                                    <div key={room.id} className="room-card" onClick={() => handleJoinRoom(room)}>
                                        <div className="room-card-header">
                                            <div className="room-info-stack">
                                                <h4>{room.name}</h4>
                                                <code className="room-mini-code">#{room.code}</code>
                                            </div>
                                            <span className="room-card-mode">{room.mode}</span>
                                        </div>
                                        <div className="room-card-footer">
                                            <span className="players-count">{room.players.length}/{room.maxPlayers} Pemain</span>
                                            <div className="room-card-actions">
                                                <button className="join-tiny-btn">GABUNG</button>
                                                {room.host === user?.id && (
                                                    <button
                                                        className="delete-tiny-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteRoom(room.id);
                                                        }}
                                                    >
                                                        HAPUS
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="lobby-footer">
                        <button className="glow-btn full-width" onClick={() => setIsCreatingRoom(true)}>BUAT ROOM BARU</button>
                    </div>
                </div>

                {isCreatingRoom && (
                    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsCreatingRoom(false); }}>
                        <div className="glass-card modal-content">
                            <button className="close-btn corner-close" type="button" onClick={() => setIsCreatingRoom(false)}>×</button>
                            <h3>Buat Room Baru</h3>
                            <form onSubmit={handleCreateRoom}>
                                <div className="form-group">
                                    <label>Nama Room</label>
                                    <input type="text" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} required />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Maks. Pemain (5-12)</label>
                                        <input type="number" min="5" max="12" value={roomForm.maxPlayers} onChange={(e) => setRoomForm({ ...roomForm, maxPlayers: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Mode</label>
                                        <select value={roomForm.mode} onChange={(e) => setRoomForm({ ...roomForm, mode: e.target.value })}>
                                            <option value="Classic">Classic</option>
                                            <option value="Fast">Fast</option>
                                            <option value="Chaos">Chaos</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group checkbox">
                                    <input type="checkbox" id="private" checked={roomForm.isPrivate} onChange={(e) => setRoomForm({ ...roomForm, isPrivate: e.target.checked })} />
                                    <label htmlFor="private">Room Privat</label>
                                </div>
                                {roomForm.isPrivate && (
                                    <div className="form-group">
                                        <label>Password Room</label>
                                        <input
                                            type="password"
                                            placeholder="Masukkan password..."
                                            value={roomForm.password || ''}
                                            onChange={(e) => setRoomForm({ ...roomForm, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                )}
                                <div className="modal-actions">
                                    <button type="button" className="secondary-btn" onClick={() => setIsCreatingRoom(false)}>BATAL</button>
                                    <button type="submit" className="glow-btn">BUAT</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default LobbyView;

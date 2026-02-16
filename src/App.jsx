import React, { useState, useEffect } from 'react'
import SpookyEyes from './components/SpookyEyes'
import { generateUsername, generateAvatar } from './utils/generators'
import { assignRoles, checkWinCondition } from './utils/gameLogic'
import { playSound, stopSound, preloadSounds } from './utils/sounds'
import './App.css'
import { auth, googleProvider, db } from './firebase'
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth'
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
    arrayUnion,
    setDoc,
    getDocs,
    increment
} from 'firebase/firestore'

function App() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [view, setView] = useState('login'); // 'login', 'lobby', 'room', 'game'
    const [rooms, setRooms] = useState([]); // List of active rooms from Firestore
    const [lobbyError, setLobbyError] = useState(null);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [showingRole, setShowingRole] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [winner, setWinner] = useState(null);

    // Game State
    const [gameState, setGameState] = useState({
        phase: 'waiting', // 'night', 'morning_result', 'discuss', 'vote', 'elimination_result'
        day: 1,
        timer: 0,
        alivePlayers: [],
        logs: []
    });



    const [usernameInput, setUsernameInput] = useState('');
    const [joinCode, setJoinCode] = useState('');

    // Room Form
    const [roomForm, setRoomForm] = useState({
        name: '',
        maxPlayers: 8,
        mode: 'Classic',
        isPrivate: false
    });

    useEffect(() => {
        preloadSounds();
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            if (authUser) {
                const firebaseUser = authUser;
                const userData = {
                    id: firebaseUser.uid,
                    username: firebaseUser.displayName || generateUsername(),
                    avatar: firebaseUser.photoURL || generateAvatar(),
                    email: firebaseUser.email
                };
                setUser(userData);
                setView('lobby');
                localStorage.setItem('ww_user', JSON.stringify(userData));
            } else {
                setUser(null);
                setView('login');
            }
            setLoading(false);
        });

        // Listen only for rooms waiting for players
        const roomsQuery = query(collection(db, "rooms"), where("status", "==", "waiting"));
        const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
            const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Lobby updated:", roomsData);
            setRooms(roomsData);
            setLobbyError(null);
        }, (error) => {
            console.error("Lobby Listener Error:", error);
            setLobbyError(error.message);
        });

        return () => {
            unsubscribe();
            unsubscribeRooms();
        };
    }, []);

    useEffect(() => {
        // Room listener
        let unsubscribeRoom;
        let unsubscribeMessages;
        if (currentRoom?.id) {
            unsubscribeRoom = onSnapshot(doc(db, "rooms", currentRoom.id), (docRef) => {
                if (docRef.exists()) {
                    const data = docRef.data();
                    const updatedRoom = { id: docRef.id, ...data };

                    // Sync game state if playing
                    if (data.status === 'playing') {
                        setGameState(data.gameState);

                        // Sync my own state (role, alive) if in game
                        const myPlayer = data.players.find(p => p.id === user?.id);
                        if (myPlayer) {
                            if (myPlayer.role && (!user?.role || myPlayer.alive !== user?.alive)) {
                                setUser(prev => ({
                                    ...prev,
                                    role: myPlayer.role,
                                    alive: myPlayer.alive
                                }));

                                if (view !== 'game' && myPlayer.role) {
                                    setShowingRole(true);
                                    setView('game');
                                    playSound('game_start');
                                    // Start BGM if needed or specific sound

                                    setTimeout(() => setShowingRole(false), 6000);
                                }
                            }
                        }

                        // Sync winner state
                        if (data.winner) {
                            setWinner(data.winner);
                            setTimeout(() => playSound('win_fanfare'), 500);
                        }
                    } else if (data.status === 'waiting' && view === 'game') {
                        // Return to lobby if game ended
                        setView('room');
                    }

                    setCurrentRoom(updatedRoom);
                }
            });

            // Chat listener
            const messagesQuery = query(
                collection(db, "rooms", currentRoom.id, "messages")
            );
            unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
                const msgs = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                setMessages(msgs);
            });
        }
        return () => {
            unsubscribeRoom && unsubscribeRoom();
            unsubscribeMessages && unsubscribeMessages();
        };
    }, [currentRoom?.id, user?.id, view]);

    useEffect(() => {
        let interval;
        // Only the host manages the timer in Firestore
        if (view === 'game' && currentRoom?.host === user?.id && gameState.timer > 0 && !winner) {
            if (gameState.timer <= 5) playSound('vote_tick'); // Ticking sound for last 5 seconds

            interval = setInterval(async () => {
                if (!currentRoom?.id) return;
                const roomRef = doc(db, "rooms", currentRoom.id);
                try {
                    await updateDoc(roomRef, {
                        'gameState.timer': increment(-1)
                    });
                } catch (error) {
                    console.error("Timer update error:", error);
                }
            }, 1000);
        } else if (view === 'game' && currentRoom?.host === user?.id && gameState.timer === 0 && !winner) {
            handlePhaseTransition();
        }
        return () => clearInterval(interval);
    }, [view, gameState.timer, gameState.phase, winner, currentRoom?.host, user?.id]);

    const handlePhaseTransition = async () => {
        if (!currentRoom || currentRoom.host !== user?.id) return;

        const roomRef = doc(db, "rooms", currentRoom.id);
        const nextState = { ...gameState };
        let updatedPlayers = [...currentRoom.players];

        if (gameState.phase === 'night') {
            // Process Night Results
            const actions = currentRoom.pendingActions || {};
            const killTargetId = actions.kill;
            const protectTargetId = actions.protect;

            let victim = null;
            if (killTargetId && killTargetId !== protectTargetId) {
                victim = currentRoom.players.find(p => p.id === killTargetId);
            }

            if (victim) {
                updatedPlayers = updatedPlayers.map(p => p.id === victim.id ? { ...p, alive: false } : p);
                nextState.logs = [...nextState.logs, `Pagi telah tiba... ${victim.username} ditemukan tewas.`];
                nextState.lastNightVictim = victim;
                playSound('kill_slash');
            } else {
                nextState.logs = [...nextState.logs, `Pagi telah tiba... malam yang tenang.`];
                nextState.lastNightVictim = null;
            }

            nextState.phase = 'morning_result';
            nextState.timer = 7;
            setTimeout(() => playSound('morning_rooster'), 500);
        } else if (gameState.phase === 'morning_result') {
            nextState.phase = 'discuss';
            nextState.timer = 60;
            nextState.logs = [...nextState.logs, `Diskusi Dimulai.`];
        } else if (gameState.phase === 'discuss') {
            nextState.phase = 'vote';
            nextState.timer = 15;
            nextState.logs = [...nextState.logs, `Waktunya Voting!`];
        } else if (gameState.phase === 'vote') {
            // Process Vote Results
            const votes = currentRoom.votes || {};
            const voteCounts = {};
            Object.values(votes).forEach(targetId => {
                voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
            });

            let highestVotedId = null;
            let maxVotes = 0;
            Object.entries(voteCounts).forEach(([id, count]) => {
                if (count > maxVotes) {
                    maxVotes = count;
                    highestVotedId = id;
                }
            });

            if (highestVotedId) {
                const victim = currentRoom.players.find(p => p.id === highestVotedId);
                updatedPlayers = updatedPlayers.map(p => p.id === victim.id ? { ...p, alive: false } : p);
                nextState.logs = [...nextState.logs, `Warga telah memilih... ${victim.username} dieksekusi.`];
                nextState.lastVotedOut = victim;
                playSound('kill_slash');
            } else {
                nextState.logs = [...nextState.logs, `Warga bingung memilih.`];
                nextState.lastVotedOut = null;
            }

            nextState.phase = 'elimination_result';
            nextState.timer = 7;
        } else if (gameState.phase === 'elimination_result') {
            nextState.phase = 'night';
            setTimeout(() => playSound('wolf_howl'), 500);
            nextState.day = gameState.day + 1;
            nextState.timer = 30;
            nextState.logs = [...nextState.logs, `Malam tiba di hari ke-${nextState.day}.`];
        }

        try {
            await updateDoc(roomRef, {
                gameState: nextState,
                players: updatedPlayers,
                votes: {}, // Clear votes for next round
                pendingActions: {} // Clear actions for next round
            });

            // Check for winner after important state changes
            const winnerResult = checkWinCondition(updatedPlayers);
            if (winnerResult) {
                await updateDoc(roomRef, { winner: winnerResult });
            }
        } catch (error) {
            console.error("Transition Error:", error);
        }
    };

    const checkWinner = () => {
        if (!currentRoom?.players) return;
        const result = checkWinCondition(currentRoom.players);
        if (result && !winner) {
            setWinner(result);
            playSound(result === 'villagers' ? 'win_villagers' : 'win_werewolves');
        }
    };

    // We need an effect to check winner AFTER currentRoom updates
    useEffect(() => {
        if (currentRoom?.players && view === 'game') {
            const gameWinner = checkWinCondition(currentRoom.players);
            if (gameWinner) {
                setWinner(gameWinner);
                playSound(gameWinner === 'villagers' ? 'win_villagers' : 'win_werewolves');
            }
        }
    }, [currentRoom?.players, view]);

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed:", error);
            if (error.code !== 'auth/popup-closed-by-user') {
                alert("Gagal masuk dengan Google. Pastikan domain ini diizinkan di Firebase Console.");
            }
        }
    };

    const handleGuestLogin = async () => {
        const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
        const name = usernameInput.trim() || generateUsername();
        const userData = {
            id: guestId,
            username: name,
            avatar: generateAvatar(guestId),
            isGuest: true
        };
        setUser(userData);
        setView('lobby');
        localStorage.setItem('ww_user', JSON.stringify(userData));
        setRoomForm(prev => ({ ...prev, name: `${name}'s Room` }));
    };

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const roomData = {
            name: roomForm.name,
            maxPlayers: roomForm.maxPlayers,
            mode: roomForm.mode,
            isPrivate: roomForm.isPrivate,
            code: roomCode,
            host: user?.id,
            players: [{ ...user, isReady: true, alive: true }],
            status: 'waiting',
            createdAt: new Date().toISOString(),
            gameState: {
                phase: 'waiting',
                day: 1,
                timer: 0,
                alivePlayers: [],
                logs: [`Room created by ${user?.username}`]
            }
        };

        try {
            const docRef = await addDoc(collection(db, "rooms"), roomData);
            setCurrentRoom({ id: docRef.id, ...roomData });
            setView('room');
            setIsCreatingRoom(false);
            playSound('lobby_transition');
        } catch (error) {
            console.error("Error creating room:", error);
            alert("Failed to create room.");
        }
    };

    const handleJoinByCode = async (e) => {
        e.preventDefault();
        const codeToSearch = joinCode.toUpperCase().trim();
        if (!codeToSearch) return;

        // 1. Try searching in locally loaded rooms first
        const localMatch = rooms.find(r => r.code === codeToSearch);
        if (localMatch) {
            handleJoinRoom(localMatch);
            setJoinCode('');
            return;
        }

        // 2. If not found locally, try deep search in Firestore
        const q = query(collection(db, "rooms"), where("code", "==", codeToSearch));
        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                alert(`Room "${codeToSearch}" not found. If your friend just created it, wait 2-3 seconds and try again.`);
                return;
            }
            const roomData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
            handleJoinRoom(roomData);
            setJoinCode('');
        } catch (error) {
            console.error("Firebase Search Error:", error);
            alert("Connection error. Please try again.");
        }
    };

    const handleJoinRoom = async (room) => {
        if (room.players.length >= room.maxPlayers) {
            alert("Room is full!");
            return;
        }

        if (room.players.some(p => p.id === user?.id)) {
            setCurrentRoom(room);
            setView('room');
            return;
        }

        const roomRef = doc(db, "rooms", room.id);
        try {
            await updateDoc(roomRef, {
                players: arrayUnion({ ...user, isReady: false, alive: true })
            });
            setCurrentRoom(room);
            setView('room');
            playSound('lobby_transition');
        } catch (error) {
            console.error("Error joining room:", error);
            alert("Failed to join room.");
        }
    };

    const startGame = async () => {
        if (!currentRoom || currentRoom.players.length < 5) {
            alert("Need at least 5 players to start!");
            return;
        }

        const playersWithRoles = assignRoles(currentRoom.players);
        const roomRef = doc(db, "rooms", currentRoom.id);

        try {
            await updateDoc(roomRef, {
                status: 'playing',
                players: playersWithRoles,
                gameState: {
                    phase: 'night',
                    day: 1,
                    timer: 30,
                    alivePlayers: playersWithRoles.map(p => p.id),
                    logs: ['The game has started. It is now night 1.']
                }
            });
        } catch (error) {
            console.error("Error starting game:", error);
        }
    };

    const handleNightAction = async (targetId, type) => {
        if (!user?.alive || !currentRoom) return;

        const roomRef = doc(db, "rooms", currentRoom.id);
        try {
            await updateDoc(roomRef, {
                [`pendingActions.${type}`]: targetId
            });
            playSound('action_select');
        } catch (error) {
            console.error("Action Error:", error);
        }
    };

    const handleVote = async (targetId) => {
        if (!user?.alive || !currentRoom) return;

        const roomRef = doc(db, "rooms", currentRoom.id);
        try {
            await updateDoc(roomRef, {
                [`votes.${user?.id}`]: targetId
            });
            playSound('vote_click');
        } catch (error) {
            console.error("Vote Error:", error);
        }
    };

    const sendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !currentRoom) return;

        const chatRef = collection(db, "rooms", currentRoom.id, "messages");
        const newMessage = {
            senderId: user?.id,
            senderName: user?.username,
            text: chatInput,
            createdAt: new Date().toISOString(),
        };

        try {
            await addDoc(chatRef, newMessage);
            setChatInput('');
            playSound('chat_send');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const playAgain = async () => {
        if (currentRoom?.id) {
            const roomRef = doc(db, "rooms", currentRoom.id);
            try {
                // If host clicks play again, we can either reset the room or delete it.
                // For simplicity and to avoid bugs, let's remove the current player and go to lobby.
                await leaveRoom();
            } catch (error) {
                console.error("Play Again Error:", error);
            }
        }
        setWinner(null);
        setMessages([]);
        setGameState({ phase: 'waiting', day: 1, timer: 0, alivePlayers: [], logs: [] });
    };

    const leaveRoom = async () => {
        if (!currentRoom || !user) return;

        const roomRef = doc(db, "rooms", currentRoom.id);
        const updatedPlayers = currentRoom.players.filter(p => p.id !== user.id);

        try {
            if (updatedPlayers.length === 0) {
                // Delete room if no one is left
                // Note: In production you might want to use a cloud function or just mark as finished
                await updateDoc(roomRef, { status: 'finished' });
            } else {
                await updateDoc(roomRef, {
                    players: updatedPlayers,
                    host: currentRoom.host === user.id ? updatedPlayers[0].id : currentRoom.host
                });
            }
            setCurrentRoom(null);
            setView('lobby');
        } catch (error) {
            console.error("Leave Room Error:", error);
            // Fallback for UI
            setCurrentRoom(null);
            setView('lobby');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('ww_user');
            setUser(null);
            setView('login');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    if (loading) {
        return (
            <div className="splash-screen">
                <div className="logo-container">
                    <div className="wolf-icon">🐺</div>
                    <h1>JODOO</h1>
                    <p>WEREWOLF</p>
                </div>
                <div className="loading-bar"><div className="loading-progress"></div></div>
            </div>
        );
    }

    if (view === 'login') {
        return (
            <div className="main-content">
                <div className="glass-card login-container">
                    <div className="header">
                        <h1 className="neon-title">JODOO WEREWOLF</h1>
                        <p>Bergabunglah dengan warga atau pimpin para serigala.</p>
                    </div>
                    <div className="login-options">
                        <SpookyEyes />
                        <input
                            type="text"
                            className="username-input"
                            placeholder="Masukkan Nama Anda (Opsional)"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            maxLength={12}
                        />
                        <button className="glow-btn" onClick={handleGuestLogin}>MASUK</button>
                        <div className="divider"><span>ATAU</span></div>
                        <button className="google-btn" onClick={handleGoogleLogin}>
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" />
                            Masuk dengan Google
                        </button>
                    </div>
                    <div className="footer"><p>Dengan bermain, Anda menyetujui Ketentuan Layanan.</p></div>
                </div>
            </div>
        );
    }

    if (view === 'lobby') {
        return (
            <div className="main-content">
                <div className="glass-card lobby-container">
                    <div className="lobby-header">
                        <div className="user-profile">
                            <img src={user?.avatar} alt="Avatar" className="avatar" />
                            <div className="user-info">
                                <h3>{user?.username}</h3>
                                <p>Status: <span className="online-indicator">Online</span></p>
                            </div>
                        </div>
                        <button className="logout-icon-btn" onClick={handleLogout} title="Logout">🚪</button>
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
                                                <button className="join-tiny-btn">GABUNG</button>
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
                        <div className="modal-overlay">
                            <div className="glass-card modal-content">
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

    if (view === 'room' && currentRoom) {
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

    if (view === 'game' && currentRoom) {
        const isNight = gameState.phase === 'night';
        const phaseTitle = {
            'night': '🌙 Malam Hari',
            'morning_result': '☀️ Matahari Terbit',
            'discuss': '💬 Waktu Diskusi',
            'vote': '🗳️ Waktu Voting',
            'elimination_result': '⚖️ Hasil Voting'
        }[gameState.phase];

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
                                const pendingActions = currentRoom?.pendingActions || {};

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
                                                {/* Seer Feedback */}
                                                {user?.role?.name === 'Penerawang' && pendingActions.peek === player.id && (
                                                    <div className="seer-reveal">
                                                        {player.role?.team === 'werewolves' ? '🐺 SERIGALA' : '🏘️ AMAN'}
                                                    </div>
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
                {gameState.phase === 'morning_result' && (
                    <div className="phase-result-overlay">
                        <div className="result-card glass-card">
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

                {gameState.phase === 'elimination_result' && (
                    <div className="phase-result-overlay">
                        <div className="result-card glass-card">
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
                    <div className="role-reveal-overlay">
                        <div className="role-card-container">
                            <div className="role-card" style={{ borderColor: user?.role?.color }}>
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
                    <div className="win-overlay">
                        <div className="win-content">
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

    return null;
}

export default App

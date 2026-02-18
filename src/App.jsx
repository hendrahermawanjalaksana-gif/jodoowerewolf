import React, { useState, useEffect } from 'react'
import { generateUsername, generateAvatar } from './utils/generators'
import { assignRoles, checkWinCondition } from './utils/gameLogic'
import { playSound, stopSound, preloadSounds } from './utils/sounds'
import { auth, googleProvider, db, storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { signInWithPopup, onAuthStateChanged, signOut, signInAnonymously, updateProfile } from 'firebase/auth'
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
    setDoc,
    arrayUnion,
    getDoc,
    getDocs,
    increment,
    deleteDoc
} from 'firebase/firestore'
import './App.css'

// New Components
import LoginView from './components/LoginView'
import LobbyView from './components/LobbyView'
import RoomView from './components/RoomView'
import GameView from './components/GameView'
import AdminPanel from './components/AdminPanel'
import HistoryModal from './components/HistoryModal'
import { DEFAULT_CONFIG } from './utils/config'

function App() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [view, setView] = useState('login');
    const [rooms, setRooms] = useState([]);
    const [lobbyError, setLobbyError] = useState(null);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [showingRole, setShowingRole] = useState(false);
    const [messages, setMessages] = useState([]);
    // chatInput state removed - moved to GameView
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [winner, setWinner] = useState(null);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [gameConfig, setGameConfig] = useState(DEFAULT_CONFIG);

    // Game State
    const [gameState, setGameState] = useState({
        phase: 'waiting',
        day: 1,
        timer: 0,
        alivePlayers: [],
        logs: []
    });

    const [usernameInput, setUsernameInput] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [roomForm, setRoomForm] = useState({
        name: '',
        maxPlayers: 8,
        mode: 'Classic',
        isPrivate: false
    });

    // 1. Initial Load & Auth & Global Config
    useEffect(() => {
        preloadSounds();
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                const userData = {
                    id: authUser.uid,
                    username: authUser.displayName || generateUsername(),
                    avatar: authUser.photoURL || generateAvatar(authUser.uid),
                    email: authUser.email,
                    isGuest: authUser.isAnonymous
                };
                setUser(userData);
                setView('lobby');

                // Listen for User Stats
                onSnapshot(doc(db, 'users', authUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        setUser(prev => ({ ...prev, ...docSnap.data() }));
                    }
                });
            } else {
                // Check local storage for persistent guest session
                const savedUser = localStorage.getItem('ww_user');
                if (savedUser) {
                    setUser(JSON.parse(savedUser));
                    setView('lobby');
                } else {
                    setUser(null);
                    setView('login');
                }
            }
            setLoading(false);
        });

        // Room Cleanup Logic (Runs once on app load/lobby entry)
        const cleanupOldRooms = async () => {
            try {
                const now = new Date();
                const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();

                // Query finished rooms or very old rooms
                const q = query(collection(db, "rooms"), where("createdAt", "<", yesterday));
                const oldRooms = await getDocs(q);
                oldRooms.forEach(async (roomDoc) => {
                    await deleteDoc(doc(db, "rooms", roomDoc.id));
                });
            } catch (e) { console.error("Cleanup error:", e); }
        };
        cleanupOldRooms();

        // Listen for Global Config
        const unsubConfig = onSnapshot(doc(db, 'settings', 'gameConfig'), (docSnap) => {
            if (docSnap.exists()) {
                setGameConfig(docSnap.data());
            }
        });

        // Lobby Room Listener
        const roomsQuery = query(collection(db, "rooms"), where("status", "==", "waiting"));
        const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
            const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRooms(roomsData);
            setLobbyError(null);
        }, (error) => {
            setLobbyError(error.message);
        });

        return () => {
            unsubscribe();
            unsubConfig();
            unsubscribeRooms();
        };
    }, []);

    // 1.5 Handle Avatar Upload
    const handleAvatarUpload = async (file) => {
        if (!user || !file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            alert("Hanya boleh mengunggah file gambar!");
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert("Ukuran file terlalu besar! Maksimal 2MB.");
            return;
        }

        try {
            const storageRef = ref(storage, `avatars/${user.id}_${Date.now()}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Update user document
            await setDoc(doc(db, 'users', user.id), { avatar: downloadURL }, { merge: true });

            // Also update local state to reflect change immediately
            setUser(prev => ({ ...prev, avatar: downloadURL }));
            alert("Foto profil berhasil diperbarui!");
        } catch (error) {
            console.error("Error uploading avatar:", error);
            if (error.code === 'storage/unauthorized') {
                alert("Gagal: Akses ditolak. Pastikan 'Storage Rules' di Firebase Console sudah diset menjadi 'public' atau 'allow write if auth != null'.");
            } else if (error.code === 'storage/project-not-found') {
                alert("Gagal: Storage belum diaktifkan di Firebase Console untuk proyek ini.");
            } else {
                alert("Gagal mengunggah foto profil: " + error.message);
            }
        }
    };

    // 2. Room & Chat Listeners
    useEffect(() => {
        let unsubscribeRoom;
        let unsubscribeMessages;
        if (currentRoom?.id) {
            unsubscribeRoom = onSnapshot(doc(db, "rooms", currentRoom.id), (docRef) => {
                if (docRef.exists()) {
                    const data = docRef.data();
                    const updatedRoom = { id: docRef.id, ...data };

                    if (data.gameState) {
                        setGameState(data.gameState);
                        const myPlayer = data.players?.find(p => p.id === user?.id);
                        if (myPlayer) {
                            if (myPlayer.role && (!user?.role || myPlayer.alive !== user?.alive || myPlayer.lastProtected !== user?.lastProtected || myPlayer.hasFired !== user?.hasFired)) {
                                setUser(prev => ({ ...prev, role: myPlayer.role, alive: myPlayer.alive, lastProtected: myPlayer.lastProtected, hasFired: myPlayer.hasFired }));
                                if (view !== 'game' && myPlayer.role && data.status === 'playing') {
                                    setShowingRole(true);
                                    setView('game');
                                    playSound('game_start');
                                    setTimeout(() => setShowingRole(false), 6000);
                                }
                            }
                        }
                    }
                    // Host Migration Logic
                    if (data.host && !data.players.some(p => p.id === data.host)) {
                        // Host has left the room
                        if (data.players.length > 0) {
                            const newHostId = data.players[0].id;
                            updateDoc(doc(db, "rooms", docRef.id), { host: newHostId });
                        }
                    }

                    if (data.winner) setWinner(data.winner);

                    if (data.status === 'waiting' && view === 'game') {
                        setView('room');
                    }
                    setCurrentRoom(updatedRoom);
                }
            });

            const messagesQuery = query(collection(db, "rooms", currentRoom.id, "messages"));
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

    // 3. Game Timer Logic (Host Only)
    useEffect(() => {
        let interval;
        if (view === 'game' && currentRoom?.host === user?.id && gameState.timer > 0 && !winner) {
            if (gameState.timer <= 5) playSound('vote_tick');
            interval = setInterval(async () => {
                const roomRef = doc(db, "rooms", currentRoom.id);
                try {
                    await updateDoc(roomRef, { 'gameState.timer': increment(-1) });
                } catch (error) { console.error("Timer error:", error); }
            }, 1000);
        } else if (view === 'game' && currentRoom?.host === user?.id && gameState.timer === 0 && !winner) {
            handlePhaseTransition();
        }
        return () => clearInterval(interval);
    }, [view, gameState.timer, gameState.phase, winner, currentRoom?.host]);

    // 4. Phase Transitions (Uses Game Config)
    const handlePhaseTransition = async () => {
        if (!currentRoom || currentRoom.host !== user?.id) return;
        const roomRef = doc(db, "rooms", currentRoom.id);
        const nextState = { ...gameState };
        let updatedPlayers = [...currentRoom.players];
        const durations = gameConfig.durations;
        const actions = currentRoom.pendingActions || {};

        if (gameState.phase === 'night') {
            const killTargetId = actions.kill;
            const protectTargetId = actions.protect;
            const guardTargetId = actions.guard;

            let victim = null;
            if (killTargetId && killTargetId !== protectTargetId && killTargetId !== guardTargetId) {
                victim = currentRoom.players.find(p => p.id === killTargetId);
            }

            if (victim) {
                updatedPlayers = updatedPlayers.map(p => p.id === victim.id ? { ...p, alive: false } : p);
                nextState.logs = [...nextState.logs, `Pagi telah tiba... ${victim.username} ditemukan tewas.`];
                nextState.lastNightVictim = victim;
                playSound('kill_slash');

                // HUNTER LOGIC: If hunter dies at night
                if (victim.role?.name === 'Pemburu' && actions.hunterShot) {
                    const hunterVictim = currentRoom.players.find(p => p.id === actions.hunterShot);
                    if (hunterVictim && hunterVictim.alive) {
                        updatedPlayers = updatedPlayers.map(p => {
                            if (p.id === hunterVictim.id) return { ...p, alive: false };
                            if (p.id === victim.id) return { ...p, hasFired: true };
                            return p;
                        });
                        nextState.logs = [...nextState.logs, `Tembakan terakhir Pemburu mengenai ${hunterVictim.username}!`];
                    }
                }
            } else {
                nextState.logs = [...nextState.logs, `Pagi telah tiba... malam yang tenang.`];
                nextState.lastNightVictim = null;
            }
            nextState.phase = 'morning_result';
            nextState.timer = durations.morning_result;
            setTimeout(() => playSound('morning_rooster'), 500);
        } else if (gameState.phase === 'morning_result') {
            nextState.phase = 'discuss';
            nextState.timer = durations.discuss;
            nextState.logs = [...nextState.logs, `Diskusi Dimulai.`];
        } else if (gameState.phase === 'discuss') {
            nextState.phase = 'vote';
            nextState.timer = durations.vote;
            nextState.logs = [...nextState.logs, `Waktunya Voting!`];
        } else if (gameState.phase === 'vote') {
            const votes = currentRoom.votes || {};
            const voteCounts = {};
            Object.values(votes).forEach(id => { voteCounts[id] = (voteCounts[id] || 0) + 1; });
            let maxVotes = 0;
            Object.values(voteCounts).forEach(count => {
                if (count > maxVotes) maxVotes = count;
            });

            // Find all candidates with max votes
            const startCandidates = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);

            // If strictly 1 player has highest vote, and maxVotes > 0
            let victim = null;
            if (startCandidates.length === 1 && maxVotes > 0) {
                victim = currentRoom.players.find(p => p.id === startCandidates[0]);
            }

            if (victim) {
                updatedPlayers = updatedPlayers.map(p => p.id === victim.id ? { ...p, alive: false } : p);
                nextState.logs = [...nextState.logs, `Warga telah memilih... ${victim.username} dieksekusi dengan ${maxVotes} suara.`];
                nextState.lastVotedOut = victim;
                playSound('kill_slash');

                // HUNTER LOGIC FOR VOTING: If hunter is voted out
                if (victim.role?.name === 'Pemburu' && actions.hunterShot) {
                    const hunterVictim = currentRoom.players.find(p => p.id === actions.hunterShot);
                    if (hunterVictim && hunterVictim.alive) {
                        updatedPlayers = updatedPlayers.map(p => {
                            if (p.id === hunterVictim.id) return { ...p, alive: false };
                            if (p.id === victim.id) return { ...p, hasFired: true };
                            return p;
                        });
                        nextState.logs = [...nextState.logs, `Tembakan terakhir Pemburu mengenai ${hunterVictim.username}!`];
                    }
                }
            } else {
                if (startCandidates && startCandidates.length > 1) {
                    nextState.logs = [...nextState.logs, `Hasil voting seri (${maxVotes} suara). Tidak ada yang dieksekusi.`];
                } else {
                    nextState.logs = [...nextState.logs, `Warga tidak memilih siapa pun.`];
                }
                nextState.lastVotedOut = null;
            }
            nextState.phase = 'elimination_result';
            nextState.timer = durations.elimination_result;
        } else if (gameState.phase === 'elimination_result') {
            nextState.phase = 'night';
            nextState.day = gameState.day + 1;
            nextState.timer = durations.night;
            nextState.logs = [...nextState.logs, `Malam ke-${nextState.day} tiba.`];
            setTimeout(() => playSound('wolf_howl'), 500);
        }

        // Update Guardian's lastProtected
        if (actions.guard) {
            updatedPlayers = updatedPlayers.map(p => {
                if (p.role?.name === 'Penjaga') return { ...p, lastProtected: actions.guard };
                return p;
            });
        }

        try {
            await updateDoc(roomRef, {
                gameState: nextState,
                players: updatedPlayers,
                votes: {},
                pendingActions: {}
            });

            const winRes = checkWinCondition(updatedPlayers);
            if (winRes) {
                await updateDoc(roomRef, { winner: winRes, status: 'finished' });

                // Save Game History
                const gameHistory = {
                    roomName: currentRoom.name,
                    winner: winRes,
                    players: updatedPlayers.map(p => ({
                        username: p.username,
                        role: p.role?.name,
                        team: p.role?.team,
                        alive: p.alive
                    })),
                    duration: gameState.day,
                    timestamp: new Date().toISOString()
                };
                await addDoc(collection(db, "history"), gameHistory);

                // Update Player Stats
                for (const player of updatedPlayers) {
                    const userRef = doc(db, "users", player.id);
                    const userSnap = await getDoc(userRef);
                    const isWin = player.role?.team === winRes;

                    const statsUpdate = {
                        gamesPlayed: increment(1),
                        wins: isWin ? increment(1) : increment(0),
                        losses: isWin ? increment(0) : increment(1),
                        lastPlayed: new Date().toISOString()
                    };

                    if (userSnap.exists()) {
                        await updateDoc(userRef, statsUpdate);
                    } else {
                        await setDoc(userRef, {
                            username: player.username,
                            avatar: player.avatar,
                            gamesPlayed: 1,
                            wins: isWin ? 1 : 0,
                            losses: isWin ? 0 : 1,
                            lastPlayed: new Date().toISOString()
                        });
                    }
                }
            }
        } catch (e) { console.error("Transition error:", e); }
    };

    // 5. Auth Handlers
    const handleGoogleLogin = async () => {
        try { await signInWithPopup(auth, googleProvider); }
        catch (e) { if (e.code !== 'auth/popup-closed-by-user') alert("Login gagal."); }
    };

    const handleGuestLogin = async () => {
        try {
            const userCredential = await signInAnonymously(auth);
            const user = userCredential.user;
            const name = usernameInput.trim() || generateUsername();

            // Set display name for anonymous user
            await updateProfile(user, {
                displayName: name,
                photoURL: generateAvatar(user.uid)
            });

            // Force update local state immediately for better UX
            const userData = {
                id: user.uid,
                username: name,
                avatar: generateAvatar(user.uid),
                isGuest: true
            };
            setUser(userData);
            setView('lobby');

        } catch (error) {
            console.error("Guest login error:", error);
            alert("Gagal masuk sebagai tamu: " + error.message);
        }
    };

    const handleLogout = async () => {
        if (currentRoom) await leaveRoom();
        try {
            await signOut(auth);
            localStorage.removeItem('ww_user');
            localStorage.removeItem('ww_guest_name');
            setUser(null);
            setView('login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    // 6. Room Handlers
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const roomData = {
            name: roomForm.name,
            maxPlayers: roomForm.maxPlayers,
            mode: roomForm.mode,
            isPrivate: roomForm.isPrivate,
            password: roomForm.isPrivate ? roomForm.password : null,
            code: roomCode,
            host: user?.id,
            players: [{ ...user, isReady: true, alive: true }],
            status: 'waiting',
            createdAt: new Date().toISOString(),
            gameState: { phase: 'waiting', day: 1, timer: 0, logs: [`Room created by ${user?.username}`] }
        };
        try {
            const docRef = await addDoc(collection(db, "rooms"), roomData);
            // Wait for creating room to confirm
            setCurrentRoom({ id: docRef.id, ...roomData });
            setRoomForm({ name: '', maxPlayers: 8, mode: 'Classic', isPrivate: false, password: '' });
            setIsCreatingRoom(false); // Close modal first
            setView('room'); // Then switch view
            playSound('lobby_transition');
        } catch (e) {
            console.error(e);
            alert("Gagal buat room: " + e.message);
        }
    };

    const handleJoinRoom = async (room) => {
        if (room.players.length >= room.maxPlayers) { alert("Room penuh!"); return; }

        // Password Check for Private Rooms
        if (room.isPrivate && room.host !== user?.id) {
            const password = prompt("Masukkan password untuk masuk ke room ini:");
            if (password !== room.password) {
                alert("Password salah!");
                return;
            }
        }

        if (room.players.some(p => p.id === user?.id)) { setCurrentRoom(room); setView('room'); return; }
        try {
            await updateDoc(doc(db, "rooms", room.id), { players: arrayUnion({ ...user, isReady: false, alive: true }) });
            setCurrentRoom(room);
            setView('room');
            playSound('lobby_transition');
        } catch (e) { alert("Gagal gabung."); }
    };

    const handleDeleteRoom = async (roomId) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus room ini?")) {
            try {
                await deleteDoc(doc(db, "rooms", roomId));
            } catch (e) {
                console.error("Error deleting room:", e);
                alert("Gagal menghapus room.");
            }
        }
    };

    const handleJoinByCode = async (e) => {
        e.preventDefault();
        const code = joinCode.toUpperCase().trim();
        const q = query(collection(db, "rooms"), where("code", "==", code));
        const snap = await getDocs(q);
        if (snap.empty) { alert("Room tidak ditemukan."); return; }
        handleJoinRoom({ id: snap.docs[0].id, ...snap.docs[0].data() });
    };

    const startGame = async () => {
        if (currentRoom.players.length < 5) { alert("Butuh minimal 5 pemain!"); return; }
        const playersWithRoles = assignRoles(currentRoom.players, gameConfig.roles.counts);
        try {
            await updateDoc(doc(db, "rooms", currentRoom.id), {
                status: 'playing',
                players: playersWithRoles,
                gameState: {
                    phase: 'night',
                    day: 1,
                    timer: gameConfig.durations.night,
                    alivePlayers: playersWithRoles.map(p => p.id),
                    logs: ['Permainan dimulai. Malam pertama tiba.']
                }
            });
        } catch (e) { console.error(e); }
    };

    const toggleReady = async () => {
        if (!currentRoom) return;
        const updatedPlayers = currentRoom.players.map(p =>
            p.id === user.id ? { ...p, isReady: !p.isReady } : p
        );
        try {
            await updateDoc(doc(db, "rooms", currentRoom.id), { players: updatedPlayers });
            playSound('vote_click');
        } catch (e) { console.error(e); }
    };

    const leaveRoom = async () => {
        if (!currentRoom) return;
        const updatedPlayers = currentRoom.players.filter(p => p.id !== user.id);
        try {
            if (updatedPlayers.length === 0) {
                // Delete the room if it's empty
                await deleteDoc(doc(db, "rooms", currentRoom.id));
            } else {
                await updateDoc(doc(db, "rooms", currentRoom.id), {
                    players: updatedPlayers,
                    host: currentRoom.host === user.id ? updatedPlayers[0].id : currentRoom.host
                });
            }
            setCurrentRoom(null);
            setView('lobby');
        } catch (e) { setView('lobby'); }
    };

    // 7. Game Actions
    const handleNightAction = async (targetId, type) => {
        // Hunter can act while dead for their legacy shot
        if (!user?.alive && user?.role?.name !== 'Pemburu') return;

        // Seer cannot change their mind once they have peeked (as they see the result immediately)
        if (type === 'see' && currentRoom.pendingActions?.see) {
            alert("Kamu hanya bisa mengecek satu orang dalam satu malam!");
            return;
        }

        // Guardian cannot protect the same person twice
        if (type === 'guard' && user?.lastProtected === targetId) {
            alert("Tidak bisa melindungi orang yang sama dua kali berturut-turut!");
            return;
        }

        try {
            await updateDoc(doc(db, "rooms", currentRoom.id), { [`pendingActions.${type}`]: targetId });
            playSound('action_select');
        } catch (e) { console.error(e); }
    };

    const handleVote = async (targetId) => {
        if (!user?.alive) return;
        try {
            await updateDoc(doc(db, "rooms", currentRoom.id), { [`votes.${user.id}`]: targetId });
            playSound('vote_click');
        } catch (e) { console.error(e); }
    };

    const sendChatMessage = async (text) => {
        if (!text.trim()) return;
        try {
            await addDoc(collection(db, "rooms", currentRoom.id, "messages"), {
                senderId: user?.id,
                senderName: user?.username,
                text: text,
                createdAt: new Date().toISOString()
            });
            playSound('chat_send');
        } catch (e) { console.error(e); }
    };

    const playAgain = () => { leaveRoom(); setWinner(null); setMessages([]); };

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

    return (
        <div className="app-container">
            {view === 'login' && (
                <LoginView
                    usernameInput={usernameInput}
                    setUsernameInput={setUsernameInput}
                    handleGuestLogin={handleGuestLogin}
                    handleGoogleLogin={handleGoogleLogin}
                />
            )}
            {view === 'lobby' && (
                <div className="view-wrapper">
                    <LobbyView
                        user={user}
                        handleLogout={handleLogout}
                        joinCode={joinCode}
                        setJoinCode={setJoinCode}
                        handleJoinByCode={handleJoinByCode}
                        lobbyError={lobbyError}
                        rooms={rooms}
                        handleJoinRoom={handleJoinRoom}
                        setIsCreatingRoom={setIsCreatingRoom}
                        isCreatingRoom={isCreatingRoom}
                        roomForm={roomForm}
                        setRoomForm={setRoomForm}
                        handleCreateRoom={handleCreateRoom}
                        setIsHistoryOpen={setIsHistoryOpen}
                        handleAvatarUpload={handleAvatarUpload}
                        handleDeleteRoom={handleDeleteRoom}
                    />
                    <button className="admin-trigger-btn" onClick={() => setIsAdminOpen(true)}>⚙️</button>
                </div>
            )}
            {view === 'room' && (
                <RoomView
                    currentRoom={currentRoom}
                    user={user}
                    leaveRoom={leaveRoom}
                    startGame={startGame}
                    toggleReady={toggleReady}
                />
            )}
            {view === 'game' && (
                <GameView
                    gameState={gameState}
                    currentRoom={currentRoom}
                    user={user}
                    handleNightAction={handleNightAction}
                    handleVote={handleVote}
                    isChatOpen={isChatOpen}
                    setIsChatOpen={setIsChatOpen}
                    messages={messages}
                    sendChatMessage={sendChatMessage}
                    // chatInput props removed
                    showingRole={showingRole}
                    setShowingRole={setShowingRole}
                    winner={winner}
                    playAgain={playAgain}
                />
            )}

            <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
        </div>
    );
}

export default App;

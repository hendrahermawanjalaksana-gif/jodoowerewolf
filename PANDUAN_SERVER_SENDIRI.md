# Panduan Migrasi ke Server Sendiri (Self-Hosted)

Dokumen ini menjelaskan langkah-langkah teknis jika Anda ingin memindahkan game Jodoo Werewolf dari **Firebase (Serverless)** ke **Server Pribadi (VPS/Dedicated)**.

## Arsitektur Baru
Anda perlu membangun sistem **Client-Server** tradisional:

1.  **Frontend (React):** Tetap sama, tapi hapus `firebase.js`.
2.  **Backend (Node.js):** Aplikasi baru yang harus Anda buat untuk mengelola logika game.
3.  **Database:** Tempat menyimpan data user dan game history.

## Teknologi yang Disarankan
-   **Runtime:** Node.js (JavaScript di server).
-   **Framework:** Express.js (Untuk API).
-   **Realtime Engine:** **Socket.io** (Sangat Vital! Ini pengganti Firestore Realtime).
-   **Database:** MongoDB (Paling mirip dengan struktur data game saat ini).

## Langkah Teknis Migrasi

### 1. Buat Backend (Server Side)
Anda harus menulis kode server (misal: `server.js`) yang menangani:
-   **Socket Connections:** Menerima pemain yang connect (`socket.on('join_room')`).
-   **Game State:** Menyimpan status game (siapa serigala, timer, fase) di memori server (Redis) atau database.
-   **Broadcasting:** Mengirim update ke semua pemain (`io.to(roomId).emit('update_game', newState)`).

*Contoh Kode Server (Socket.io Simpel):*
```javascript
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });
  
  socket.on('vote', (targetId) => {
    // Proses voting di server...
    // Lalu kirim hasil ke semua orang di room
    io.to(roomId).emit('vote_update', newVoteCounts);
  });
});
```

### 2. Ubah Frontend (Client Side)
Hapus semua kode `import { db } from './firebase'` di `App.jsx`. Ganti dengan library client Socket.io.

*Sebelum (Firebase):*
```javascript
// Mengirim data
await updateDoc(roomRef, { votes: newValue });

// Menerima data
onSnapshot(docRef, (doc) => { setGameState(doc.data()) });
```

*Sesudah (Socket.io):*
```javascript
import io from 'socket.io-client';
const socket = io('https://alamat-server-anda.com');

// Mengirim data
socket.emit('submit_vote', { target: 'player1' });

// Menerima data
socket.on('game_update', (newState) => {
    setGameState(newState);
});
```

### 3. Setup Server (VPS)
Anda membutuhkan VPS (Virtual Private Server) seperti DigitalOcean, AWS EC2, atau Linode.
1.  Install **Node.js** & **Nginx** (sebagai Reverse Proxy).
2.  Install Database (**MongoDB**).
3.  Upload kode backend dan jalankan (gunakan `PM2` agar server tetap hidup).
4.  Setup domain dan SSL (HTTPS) agar aman.

## Kesimpulan
Pindah ke server sendiri memberikan **kontrol penuh** dan **biaya bulanan tetap** (lebih murah jika trafik sangat tinggi), tapi membutuhkan usaha **coding ulang sekitar 60-70%** dari logika komunikasi game (dari Firestore SDK ke Socket.io).

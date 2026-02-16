# Panduan Mengganti Server & Database (Firebase)

Aplikasi ini menggunakan **Firebase** sebagai backend (Server & Database). Mengganti "server" berarti menghubungkannya ke **Project Firebase Anda sendiri**.

## Langkah 1: Buat Project Baru
1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Buat Project baru (misal: `MyWerewolfGame`).
3. Matikan Google Analytics (opsional) agar lebih cepat.

## Langkah 2: Aktifkan Fitur (PENTING!)
Agar game bisa jalan, Anda WAJIB mengaktifkan 2 fitur ini di menu kiri console:

### A. Authentication (Login)
1. Ke menu **Build** > **Authentication**.
2. Klik **Get Started**.
3. Di tab **Sign-in method**, aktifkan:
   - **Google** (Klik Enable, pilih email support, Save).
   - **Email/Password** (Opsional).

### B. Firestore Database (Data Game)
1. Ke menu **Build** > **Firestore Database**.
2. Klik **Create Database**.
3. Pilih lokasi server (misal: `asia-southeast2` untuk Jakarta/Singapura biar cepat).
4. Pilih **Start in Test Mode** (untuk sementara) atau **Production Mode**.
5. Klik **Enable**.

## Langkah 3: Dapatkan Kunci Konfigurasi
1. Klik icon **Gear (Settings)** di sebelah "Project Overview" (kiri atas) > **Project settings**.
2. Scroll ke bawah sampai bagian **"Your apps"**.
3. Klik icon **Web (</>)**.
4. Beri nama App (misal: `Werewolf Web`), klik **Register app**.
5. Anda akan melihat kode `const firebaseConfig = { ... }`.
6. Salin objek config tersebut (bagian di dalam `{...}`).

## Langkah 4: Ganti Kode di Laptop Anda
1. Buka file `src/firebase.js`.
2. Ganti bagian `const firebaseConfig = { ... }` dengan kode yang baru Anda salin.
   
Contoh:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyB...",
    authDomain: "my-project.firebaseapp.com",
    projectId: "my-project",
    storageBucket: "my-project.appspot.com",
    messagingSenderId: "123456...",
    appId: "1:123456:web:..."
};
```

## Langkah 5: Deploy (Upload) ke Server Baru
Buka terminal di folder project dan jalankan:

1. Login ulang ke akun Google Anda (jika beda akun):
   ```bash
   firebase logout
   firebase login
   ```
2. Hubungkan folder ini ke project baru:
   ```bash
   firebase use --add
   ```
   (Pilih project baru Anda dari daftar).
3. Upload:
   ```bash
   npm run build
   firebase deploy
   ```

Selesai! Game Anda sekarang berjalan di server pribadi Anda sendiri.

# 🐺 JODOO WEREWOLF ONLINE

Sebuah permainan deduksi sosial multiplayer real-time yang modern, dibangun dengan **React**, **Vite**, dan **Firebase**. Pemain akan berperan sebagai warga desa yang mencoba bertahan hidup dari serangan serigala, atau menjadi serigala yang mencoba menguasai desa.

![Werewolf Banner](https://img.icons8.com/clouds/200/wolf.png)

## ✨ Fitur Utama

-   **Multiplayer Real-time**: Sinkronisasi state permainan secara instan menggunakan Firebase Firestore.
-   **Sistem Role Lengkap**:
    *   🐺 **Serigala (Werewolf)**: Menghabisi warga setiap malam.
    *   👁️ **Penerawang (Seer)**: Mengetahui identitas asli pemain lain.
    *   💊 **Dokter (Doctor)**: Melindungi pemain dari serangan serigala.
    *   🛡️ **Penjaga (Guardian)**: Memberikan perlindungan ekstra (tidak bisa保护 orang yang sama berturut-turut).
    *   🏹 **Pemburu (Hunter)**: Bisa melepaskan tembakan terakhir saat tewas.
    *   🏘️ **Warga Desa (Villager)**: Mencari dan mengeksekusi serigala di siang hari.
-   **Panel Pengaturan (Admin)**: Host dapat mengatur durasi setiap fase (Malam, Diskusi, Voting) dan jumlah role secara manual.
-   **Fitur Sosial**: Chat khusus serigala di malam hari dan chat global di siang hari.
-   **Statistik & Profil**: Melacak jumlah permainan, kemenangan, dan kekalahan untuk setiap pemain.
-   **Riwayat Pertandingan**: Melihat record pertandingan sebelumnya untuk transparansi.
-   **Room Privat**: Bermain bersama teman dengan sistem password room.

## � Teknologi

-   **Frontend**: React.js (Hooks, Functional Components)
-   **Styling**: Vanilla CSS dengan Glassmorphism Design
-   **Backend-as-a-Service**: Firebase
    *   **Firestore**: Database real-time untuk state game.
    *   **Authentication**: Login Google & Guest mode.
    *   **Hosting**: Pengiriman aplikasi ke web.
-   **Build Tool**: Vite

## �️ Cara Instalasi Lokal

1.  Clone repositori ini.
2.  Install dependensi:
    ```bash
    npm install
    ```
3.  Konfigurasi Firebase:
    -   Buat project di [Firebase Console](https://console.firebase.google.com/).
    -   Aktifkan Firestore dan Authentication (Google).
    -   Salin konfigurasi SDK Firebase ke file `src/firebase.js`.
4.  Jalankan aplikasi:
    ```bash
    npm run dev
    ```

## 🎮 Cara Bermain

1.  **Login**: Masuk menggunakan akun Google atau sebagai Tamu.
2.  **Lobby**: Cari room yang tersedia atau buat room baru.
3.  **Room**: Tunggu pemain lain bergabung dan klik "Siap". Host akan memulai game jika minimal ada 5 pemain.
4.  **Fase Malam**: Gunakan peran Anda secara rahasia. Serigala berdiskusi untuk memilih korban.
5.  **Fase Pagi**: Hasil malam hari diumumkan. Warga berdiskusi siapa yang dicurigai.
6.  **Fase Voting**: Pilih pemain yang ingin dieksekusi. Pemain dengan suara terbanyak akan dieliminasi.

## � Lisensi

Proyek ini dibuat untuk tujuan hiburan dan pembelajaran. Silakan kembangkan lebih lanjut!


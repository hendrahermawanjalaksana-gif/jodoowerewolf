# Panduan Deploy ke Server Pribadi (Self-Hosted)

Panduan ini menjelaskan cara men-hosting frontend aplikasi Werewolf Online di server pribadi (VPS seperti DigitalOcean, Linode, AWS, atau PC Lokal) menggunakan **Nginx** atau **Docker**.

> **⚠️ PENTING:** Aplikasi ini adalah **Single Page Application (SPA)** React yang menggunakan Firebase sebagai backend. Meskipun Anda menaruh file web di server pribadi, aplikasi **TETAP** membutuhkan koneksi internet agar User bisa terhubung ke Database Firebase.

---

## Persiapan

1.  **Server Listrik/VPS** (OS Linux Ubuntu/Debian direkomendasikan).
2.  **Domain** (Opsional, tapi disarankan).
3.  **Akses SSH** ke server.
4.  Pastikan **Node.js** sudah terinstall di komputer lokal Anda untuk proses build.

---

## Tahap 1: Build Aplikasi (Di Komputer Lokal)

Sebelum upload ke server, kita harus mengubah kode React menjadi file statis (HTML/CSS/JS) yang siap baca.

1.  Buka terminal di folder project `werewolf-online`.
2.  Jalankan perintah build:
    ```bash
    npm run build
    ```
3.  Tunggu selesai. Akan muncul folder baru bernama **`dist/`**.
    *   Isi folder `dist` inilah yang akan kita upload ke server.

---

## Tahap 2: Upload File ke Server

Kita akan menyalin isi folder `dist` ke server. Misalkan kita akan menaruhnya di folder `/var/www/werewolf`.

### Opsi A: Menggunakan SCP (Command Line)
Jika Anda menggunakan Linux/Mac atau Git Bash di Windows:
```bash
# Format: scp -r dist/* user@ip_server:/lokasi/tujuan
scp -r dist/* root@192.168.1.10:/var/www/werewolf
```

### Opsi B: Menggunakan FileZilla (GUI)
1.  Buka FileZilla.
2.  Connect ke server via SFTP.
3.  Buat folder `/var/www/werewolf` di server.
4.  Drag & Drop semua **isi** dari folder `dist` lokal ke folder server tersebut.

---

## Tahap 3: Konfigurasi Web Server (Nginx)

Nginx adalah web server tercepat dan paling stabil untuk aplikasi React.

1.  **Login ke Server:**
    ```bash
    ssh root@ip_server_anda
    ```

2.  **Install Nginx (jika belum):**
    ```bash
    apt update
    apt install nginx -y
    ```

3.  **Buat Konfigurasi Server Block:**
    Buat file konfigurasi baru:
    ```bash
    nano /etc/nginx/sites-available/werewolf
    ```

4.  **Isi Konfigurasi (Paste kode ini):**

    ```nginx
    server {
        listen 80;
        server_name werewolf.domainanda.com; # Ganti dengan domain atau IP server

        root /var/www/werewolf; # Lokasi file yang diupload tadi
        index index.html;

        location / {
            # PENTING UNTUK REACT ROUTER:
            # Jika file tidak ditemukan, arahkan kembali ke index.html
            # agar routing aplikasi tidak error saat di-refresh.
            try_files $uri $uri/ /index.html;
        }

        # Opsional: Cache optimasi untuk file statis
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }
    }
    ```

5.  **Aktifkan Konfigurasi:**
    ```bash
    ln -s /etc/nginx/sites-available/werewolf /etc/nginx/sites-enabled/
    nginx -t # Cek apakah ada error
    systemctl restart nginx
    ```

---

## Tahap 4: Selesai

Buka browser dan akses IP server atau domain Anda. Aplikasi Werewolf Online seharusnya sudah berjalan!

---

## Alternatif: Menggunakan Docker

Jika Anda lebih suka menggunakan Docker container.

1.  Buat file bernama `Dockerfile` di dalam project lokal:
    ```dockerfile
    # Stage 1: Build
    FROM node:18-alpine as build
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    RUN npm run build

    # Stage 2: Serve with Nginx
    FROM nginx:alpine
    COPY --from=build /app/dist /usr/share/nginx/html
    # Copy custom nginx config if needed, or use default
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    ```

2.  Build Image & Run:
    ```bash
    docker build -t werewolf-app .
    docker run -d -p 80:80 werewolf-app
    ```

---

## Troubleshooting

1.  **Halaman Blank Putih?**
    *   Cek console browser (F12). Jika ada error 404 pada file .js/.css, pastikan konfigurasi Nginx `root` mengarah ke folder yang benar.

2.  **Refresh Halaman Error 404?**
    *   Pastikan baris `try_files $uri $uri/ /index.html;` ada di konfigurasi Nginx. Ini wajib untuk aplikasi React.

3.  **Tidak Bisa Login/Koneksi Firebase Error?**
    *   Pastikan domain server Anda sudah didaftarkan di **Firebase Console > Authentication > Settings > Authorized Domains**.
    *   Firebase secara default memblokir domain asing demi keamanan. Tambahkan IP atau Domain server pribadi Anda ke sana.

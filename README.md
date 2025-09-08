<p align="center">
  <a href="https://github.com/ifauzeee/Zee-Index">
    <img src="https://seekicon.com/free-icon-download/google-drive_10.svg" alt="Google Drive Icon" width="140">
  </a>
</p>

<h1 align="center">Zee-Index: The Ultimate Self-Hosted Google Drive Explorer</h1>

<p align="center">
  Ubah Google Drive Anda menjadi sebuah situs berbagi file modern, cepat, dan kaya fitur. Zee-Index adalah solusi self-hostable dengan Next.js dan TypeScript, menawarkan kontrol penuh dan antarmuka profesional.
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14.x-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
  <a href="https://next-auth.js.org/"><img src="https://img.shields.io/badge/NextAuth.js-4.x-000000?style=for-the-badge&logo=next-auth&logoColor=white" alt="NextAuth.js"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=for-the-badge" alt="License: AGPL-3.0"></a>
</p>

---

## 🌐 Live Demo

<p align="center">
  <img src="https://i.postimg.cc/fRx0hM58/image.png" alt="Zee-Index Preview" width="600"/>
</p>

<p align="center">
  <a href="https://zee-index.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Jelajahi_Live_Demo-🚀-007BFF?style=for-the-badge&logo=vercel&logoColor=white" alt="Kunjungi Live Demo">
  </a>
</p>

---

## Daftar Isi
- [Mengapa Zee-Index?](#mengapa-zee-index)
- [Fitur Unggulan](#fitur-unggulan)
- [Tumpukan Teknologi (Tech Stack)](#tumpukan-teknologi-tech-stack)
- [Arsitektur Proyek](#arsitektur-proyek)
- [Panduan Memulai](#panduan-memulai)
- [Variabel Lingkungan (.env)](#variabel-lingkungan-env)
- [Deployment](#deployment)
- [Berkontribusi](#berkontribusi)
- [Lisensi](#lisensi)

## Mengapa Zee-Index?

Zee-Index mengatasi batasan Google Drive standar dengan menyediakan:

* ⚡ **Performa Superior**: SSR Next.js + cache Redis/Vercel KV untuk pengiriman konten cepat.  
* 🔒 **Keamanan Berlapis**: Kontrol akses granular, folder privat, folder password, dan tautan berbagi aman.  
* 🎨 **Antarmuka Modern & Profesional**: Tampilan bersih, modern, dan dapat disesuaikan.  
* 👑 **Kepemilikan Penuh**: Dihosting sendiri, kontrol penuh tanpa iklan atau pelacakan pihak ketiga.  

## Fitur Unggulan

<details>
<summary><strong>📂 Manajemen & Pratinjau File</strong></summary>

* Navigasi berbasis breadcrumb  
* Tampilan Grid & Daftar  
* Pemutar Media Internal:
  - Video: `mp4`, `webm`, `mkv` (Plyr)  
  - Audio: `mp3`, `wav`  
  - Galeri Gambar: `jpg`, `png`, `gif`  
* Pratinjau Dokumen:
  - PDF Viewer  
  - Dokumen Office (`.docx`, `.xlsx`, `.pptx`)  
  - E-book Reader `.epub`  
  - Render Markdown `.md`  
  - Penampil Kode dengan syntax highlight  
* Aksi File Lengkap: Rename, Delete, Move, Copy  
* Editor Teks langsung di browser  
* Favorit untuk akses cepat  

</details>

<details>
<summary><strong>🔍 Pencarian & Filtrasi Canggih</strong></summary>

* Pencarian full-text  
* Pencarian global & lokal di folder  
* Filter pencarian (tipe file, tanggal modifikasi)  

</details>

<details>
<summary><strong>🔐 Keamanan & Kontrol Akses</strong></summary>

* Otentikasi Admin  
* Folder Privat  
* Folder Terproteksi Password  
* Autentikasi Dua Faktor (2FA) - Segera hadir  
* Log Audit Terperinci  

</details>

<details>
<summary><strong>🔗 Berbagi & Kolaborasi</strong></summary>

* Tautan berbagi aman & berbatas waktu  
* Tautan dengan syarat login  
* Analitik tautan  
* Aksi massal (bulk download ke `.zip`)  

</details>

## Tumpukan Teknologi (Tech Stack)

* **Framework**: Next.js 14 (App Router)  
* **Bahasa**: TypeScript  
* **Styling**: Tailwind CSS + Shadcn/ui + Framer Motion  
* **Otentikasi**: NextAuth.js (Google Provider)  
* **Caching**: Vercel KV / Redis  
* **API**: Google Drive API v3  
* **Package Manager**: pnpm  

## Arsitektur Proyek

1. Frontend: React + Next.js SSR, interaktivitas dengan Zustand  
2. Backend: API Routes Next.js sebagai perantara Google Drive API  
3. Otentikasi: NextAuth.js + JWT  
4. Caching: Vercel KV / Redis  
5. Cron Jobs: Pemeliharaan rutin seperti laporan mingguan  

## Panduan Memulai

### Prasyarat
* Node.js v18+  
* pnpm (`npm install -g pnpm`)  
* Akun Google Cloud  
* Git  

### Langkah 1: Kloning Repositori
```bash
git clone https://github.com/ifauzeee/Zee-Index.git
cd Zee-Index
````

### Langkah 2: Instal Dependensi

```bash
pnpm install
```

### Langkah 3: Google Cloud & API

1. Buat proyek baru di Google Cloud Console
2. Aktifkan Google Drive API
3. Konfigurasi OAuth Consent Screen
4. Buat ID Klien OAuth 2.0
5. Tambahkan redirect URI:

   * Dev: `http://localhost:3000/api/auth/callback/google`
   * Prod: `https://yourdomain.com/api/auth/callback/google`
6. Salin Client ID & Client Secret
7. Dapatkan Refresh Token via OAuth 2.0 Playground

### Langkah 4: Konfigurasi Variabel Lingkungan

```bash
cp .env.example .env.local
```

Edit `.env.local` dengan nilai kredensial Anda.

### Langkah 5: Jalankan Aplikasi

```bash
pnpm dev
```

Buka `http://localhost:3000`.

## Variabel Lingkungan (.env)

| Variabel                                       |   Wajib  | Deskripsi                                 |
| :--------------------------------------------- | :------: | :---------------------------------------- |
| GOOGLE\_CLIENT\_ID                             |     ✅    | Client ID Google OAuth                    |
| GOOGLE\_CLIENT\_SECRET                         |     ✅    | Client Secret Google OAuth                |
| GOOGLE\_REFRESH\_TOKEN                         |     ✅    | Refresh Token Drive API                   |
| NEXT\_PUBLIC\_ROOT\_FOLDER\_ID                 |     ✅    | ID folder utama Google Drive              |
| NEXT\_PUBLIC\_ROOT\_FOLDER\_NAME               |     ✅    | Nama folder utama                         |
| NEXTAUTH\_SECRET                               |     ✅    | String acak untuk enkripsi sesi           |
| NEXTAUTH\_URL                                  |     ✅    | URL lengkap aplikasi                      |
| ADMIN\_EMAILS                                  | Opsional | Daftar email admin (koma sebagai pemisah) |
| PRIVATE\_FOLDER\_IDS                           | Opsional | Folder yang disembunyikan dari non-admin  |
| SHARE\_SECRET\_KEY                             |     ✅    | Kunci untuk menandatangani tautan berbagi |
| PROTECTED\_FOLDERS\_JSON                       | Opsional | Konfigurasi folder password               |
| KV\_URL / REDIS\_URL                           | Opsional | URL database cache                        |
| SMTP\_HOST, SMTP\_PORT, SMTP\_USER, SMTP\_PASS | Opsional | Server email untuk notifikasi             |
| CRON\_SECRET                                   | Opsional | Kunci rahasia cron job                    |

## Deployment

1. Upload ke GitHub
2. Impor repositori ke Vercel
3. Set variabel lingkungan di Vercel
4. Update NEXTAUTH\_URL ke produksi
5. Tambahkan redirect URI produksi di Google OAuth
6. Deploy!

## Berkontribusi

1. Fork repositori
2. Buat branch baru: `git checkout -b feature/FiturBaruSaya`
3. Commit perubahan: `git commit -m 'feat: Menambahkan Fitur Luar Biasa'`
4. Linting: `pnpm lint`
5. Push: `git push origin feature/FiturBaruSaya`
6. Buka Pull Request

## Lisensi

Proyek ini dilisensikan di bawah **GNU AGPL v3**.
Setiap penggunaan publik/modifikasi/distribusi wajib mempertahankan pemberitahuan:

```
© 2025 All rights reserved - Muhammad Ibnu Fauzi
```

Lihat [LICENSE](https://github.com/ifauzeee/Zee-Index/blob/main/LICENSE) untuk detail lengkap.
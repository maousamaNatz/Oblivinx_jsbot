# Chatbot WhatsApp

<div align="center">
  <img src="assets/logo.svg" alt="Logo Chatbot WhatsApp" width="200"/>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/badge/Node.js-16.x+-green.svg)](https://nodejs.org/)
  [![MySQL Version](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://www.mysql.com/)
</div>

Bot WhatsApp canggih berbasis Node.js menggunakan [Baileys](https://github.com/WhiskeySockets/Baileys) dengan fitur AI terintegrasi dan manajemen grup otomatis.

## 📑 Daftar Isi
- [Fitur Utama](#-fitur-utama)
- [Persyaratan](#-persyaratan)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Penggunaan](#-penggunaan)
- [Pedoman Pengembangan](#-pedoman-pengembangan)
- [FAQ](#-faq)
- [Tim Pengembang](#-tim-pengembang)
- [Pembaruan](#-pembaruan)
- [Lisensi](#-lisensi)
- [Kontribusi](#-kontribusi)
- [Kontak](#-kontak)

## 🚀 Fitur Utama

### 🤖 Integrasi AI
- **Model GPT**
  - Dukungan GPT-3.5-turbo & GPT-4
  - Template prompt kustom
  - Manajemen memori percakapan
  
- **Multimodel AI**
  - Claude Instant & Claude 2
  - Gemini Pro
  - Model NATZ v2.0

### 👥 Manajemen Grup
- Sistem anti-spam dengan ML
- Filter link otomatis + whitelist
- Pesan selamat datang/perpisahan
- Statistik aktivitas grup
- Pembuat polling & broadcast

### 🛠 Alat Bantu
- Pencarian Wikipedia multi-bahasa
- Konverter mata uang & prakiraan cuaca
- Downloader media sosial:
  - YouTube (video/audio)
  - TikTok tanpa watermark
  - Instagram (post/reels/story)
  - Pinterest

### 🎮 Fitur Hiburan
- Game RPG & kuis interaktif
- Pembuat stiker otomatis
- Text-to-Speech (25+ bahasa)
- Generator meme acak
- Sistem memo & catatan grup

## 💻 Persyaratan

- Node.js v16.x atau lebih baru
- MySQL v8.0 atau lebih baru
- Redis (direkomendasikan untuk caching)
- PM2 untuk environment production
- Git & CLI dasar

## 📥 Instalasi

1. Clone repositori
```bash
git clone https://github.com/maousamaNatz/boring1.git
cd Chatbot_whatsapp
```

2. Install dependensi
```bash
npm install
```

3. Setup environment
```bash
cp .env.example .env
```

4. Inisialisasi database
```bash
npm run migrate
npm run seed
```

5. Jalankan bot
```bash
# Mode development
npm run dev

# Mode production
npm run prod
```

## ⚙️ Konfigurasi

### Variabel Environment (.env)
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=bot_whatsapp

# WhatsApp
OWNER_NUMBER_ONE=081910058235
OWNER_NUMBER_TWO=083156981865
PREFIX=!

# AI
ENDPOINT_PROVIDER=https://heckerai.com/v1/chat/completions
PROVIDER_API_KEY=kunci_anda_disini
```

### Konfigurasi Tambahan
- Simpan file session di `./sessions`
- File game & template di `./src/json/games`
- Backup otomatis setiap 1 jam ke `./store`

## 📝 Pedoman Pengembangan

### Struktur Kode
```
/src
  /handlers   # Command handlers
  /utils      # Utilities & helpers
  /json       # Data templates
  /middleware # Sistem middleware
```

### Aturan Kode
- Gunakan ESLint dengan konfigurasi standar
- Dokumentasi wajib untuk fungsi kompleks
- Test unit minimal 70% coverage
- Komit mengikuti konvensi Conventional Commits

### Keamanan
- Validasi semua input pengguna
- Enkripsi data sensitif dengan AES-256
- Rate limiting untuk API eksternal
- Audit keamanan mingguan

## 👥 Tim Pengembang

**Project Lead**  
- **Rio Belly** - [GitHub](https://github.com/RioBelly)  
  `Owner | Arsitektur Sistem`

- **Bagas Saputra** - [GitHub](https://github.com/BagasSaputra)  
  `Owner | Core Developer`

**Core Team**  
- **MaousamaNatz** - [GitHub](https://github.com/maousamaNatz)  
  `Lead Backend Developer`

- **Rehan Pratama** - [GitHub](https://github.com/Rehanpratama)  
  `AI Specialist`

- **SkyDcode** - [GitHub](https://github.com/SkyyDcode)  
  `Frontend Integration`

## ❓ FAQ

### Umum
**Q: Apakah bot ini gratis?**  
A: Ya, sepenuhnya open-source di bawah lisensi MIT

**Q: Bagaimana melaporkan bug?**  
A: Buat issue di GitHub atau laporkan ke grup WhatsApp

### Teknis
**Q: Cara backup session?**  
A: Session otomatis tersimpan di folder `./sessions`

**Q: Support multi-device?**  
A: Ya, menggunakan sistem multi-device Baileys

## 📋 Pembaruan

### v0.0.4
- Perbaikan sistem download YouTube
- Optimasi manajemen memori AI
- Penambahan middleware keamanan
- Peningkatan stabilitas session

[Lihat changelog lengkap](CHANGELOG.md)

## 📄 Lisensi

Dilisensikan di bawah [MIT License](LICENSE) - Bebas digunakan, dimodifikasi, dan didistribusikan

## 🤝 Kontribusi

Ikuti panduan di [CONTRIBUTING.md](CONTRIBUTING.md). Persyaratan utama:
1. Fork repository
2. Buat branch fitur (`feat/nama-fiturnya`)
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## 📞 Kontak

- Komunitas WhatsApp: [Oblivinx Group](https://chat.whatsapp.com/CHANNEL_ID)
- Email Support: riobelly@gmail.com
- Issue Tracker: [GitHub Issues](https://github.com/maousamaNatz/boring1/issues)

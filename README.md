# Chatbot WhatsApp

<div align="center">
  <img src="assets/logo.svg" alt="Logo Chatbot WhatsApp" width="200"/>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/badge/Node.js-16.x-green.svg)](https://nodejs.org/)
  [![MySQL Version](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
</div>

Bot WhatsApp yang dibuat menggunakan [Baileys](https://github.com/WhiskeySockets/Baileys) dan Node.js dengan berbagai fitur menarik.

## 📑 Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Persyaratan](#persyaratan)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Penggunaan](#penggunaan)
- [Rules & Guidelines](#rules--guidelines)
- [FAQ](#faq)
- [Tim Pengembang](#tim-pengembang)
- [Changelog](#changelog)
- [Lisensi](#lisensi)

## 🚀 Fitur Utama

### 🤖 AI Integration
- **GPT Integration**
  - Support GPT-3.5-turbo
  - Support GPT-4
  - Custom prompt templates
  
- **Claude & Gemini**
  - Claude Instant & Claude 2
  - Gemini Pro
  - Custom AI responses

- **Custom Models**
  - NATZ Model v2.0
  - O1 Language Processing
  - Copilot integration

### 👥 Group Management
- Anti-spam system dengan machine learning
- Anti-link dengan whitelist
- Welcome & goodbye message customizable
- Auto-kick inactive members
- Group statistics & analytics
- Broadcast messages
- Poll creator

### 🛠 Tools & Utilities
- Real-time earthquake information
- Social media downloader
  - YouTube (video/audio)
  - TikTok (no watermark)
  - Instagram (posts/reels/stories)
  - Pinterest
- Wikipedia search dengan multiple bahasa
- Weather forecast
- Currency converter
- URL shortener

### 🎮 Fun Features
- RPG Games
- Quiz & Trivia
- Memo & Notes
- Sticker creator
- Text to speech
- Random memes

## 💻 Persyaratan

- Node.js v16.x atau lebih tinggi
- MySQL v8.0 atau lebih tinggi
- Redis (opsional, untuk caching)
- PM2 (untuk production)
- oblixn.cmd v2.5 atau lebih tinggi

## 📥 Instalasi

1. Clone repository
```bash
git clone https://github.com/maousamaNatz/boring1.git
cd Chatbot_whatsapp
```

2. Install dependencies
```bash
npm install
```

3. Setup oblixn.cmd
```bash
# Install oblixn.cmd globally
npm install -g oblixn.cmd

# Initialize oblixn configuration
oblixn init
```

4. Konfigurasi environment
```bash
cp .env.example .env
```

5. Setup database
```bash
# Create database tables
npm run migrate

# Seed initial data
npm run seed
```

## ⚙️ Konfigurasi

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=whatsapp_bot

# API Keys
OPENAI_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here

# Bot Config
OWNER_NUMBER=628xxxxxxxxxx
BOT_NAME=NatzBot
PREFIX=!
```

### oblixn.cmd Configuration
```json
{
  "name": "whatsapp-bot",
  "version": "1.0.0",
  "commands": {
    "dev": "nodemon index.js",
    "prod": "pm2 start index.js",
    "lint": "eslint ."
  }
}
```

## 📝 Rules & Guidelines

### Code Style
- Gunakan ESLint dengan konfigurasi standar
- Ikuti format oblixn.cmd untuk command execution
- Dokumentasi wajib untuk setiap fungsi
- Unit test untuk fitur utama

### Git Workflow
1. Create feature branch
2. Develop & test locally
3. Submit pull request
4. Code review
5. Merge ke main branch

### Security Guidelines
- No API keys in code
- Validate semua input user
- Rate limiting untuk API calls
- Enkripsi data sensitif

## 👥 Tim Pengembang

- **MaosamaNatz** - [GitHub](https://github.com/maousamaNatz)
  - Project Founder
  - System Architecture
  - Core Development

### Owner
- **Resan** - [GitHub](https://github.com/resan751)
  - Owner Bot
  - System Architecture
  - Core Development

- **Bagas** 
  - Owner Bot
  - System Architecture
  - Core Development

### Lead Developers
- **MaousamaNatz** - [GitHub](https://github.com/maousamaNatz)
- **RehanPratama** - [GitHub](https://github.com/Rehanpratama)
- **SkyDcode** - [GitHub](https://github.com/SkyyDcode)

### Contributors

- **RehanPratama** - [GitHub](https://github.com/Rehanpratama)
- **SkyDcode** - [GitHub](https://github.com/SkyyDcode)

## ❓ FAQ

### Umum
1. **Q: Apakah bot ini gratis?**
   A: Ya, bot ini gratis dan open source.

2. **Q: Bagaimana cara report bug?**
   A: Buat issue di GitHub repository.

### Technical
1. **Q: Mengapa perlu oblixn.cmd?**
   A: Untuk standarisasi development workflow.

2. **Q: Apakah support multi-device?**
   A: Ya, menggunakan Baileys multi-device.

## 📋 Changelog

### v0.0.4 (Current)
- Fix error pada YouTube downloader
- Fix bug pada tools wiki
- Penghapusan fitur AI (API dibanned)
- Implementasi oblixn.cmd v2.5

[Changelog lengkap](CHANGELOG.md)

## 📄 Lisensi

Project ini dilisensikan di bawah [MIT License](LICENSE)

## 🤝 Contributing

Kami sangat menghargai kontribusi Anda! Silakan baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan detail.

### Cara Berkontribusi
1. Fork repository
2. Create feature branch
3. Commit changes
4. Push ke branch
5. Submit pull request

## 📞 Kontak

- Website: -
- Email: -
- Komunitas Whatsapp: [@Oblivinx](https://whatsapp.com/channel/0029VaqiYrGA89MnsJJFnt43)


# Panduan Kontribusi

Terima kasih telah mempertimbangkan untuk berkontribusi pada Chatbot WhatsApp! Dokumen ini berisi panduan dan standar yang harus diikuti saat berkontribusi.

## 📑 Daftar Isi
- [Proses Pengembangan](#proses-pengembangan)
- [Standar Kode](#standar-kode)
- [Pull Request](#pull-request)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Documentation](#documentation)

### Panduan Umum
- Hormati sesama kontributor
- Gunakan bahasa yang sopan dan profesional
- Fokus pada diskusi teknis, hindari SARA
- Terima kritik dan saran dengan positif

### Komunikasi
- Gunakan channel Discord untuk diskusi
- Buat issue untuk bug report
- Gunakan pull request untuk diskusi kode
- Tag maintainer jika butuh review urgent

## Proses Pengembangan

### 1. Workflow Git
```bash
# Fork repository
git clone https://github.com/YOUR-USERNAME/Chatbot_whatsapp
cd Chatbot_whatsapp

# Buat branch baru
git checkout -b feature/nama-fitur

# Commit changes
git add .
git commit -m "feat: deskripsi perubahan"

# Push ke fork Anda
git push origin feature/nama-fitur
```

### 2. Konvensi Commit
Format: `type: description`

Types:
- `feat`: Fitur baru
- `fix`: Bug fix
- `docs`: Perubahan dokumentasi
- `style`: Formatting, missing semicolons, etc
- `refactor`: Refactoring kode
- `test`: Menambah/memperbaiki test
- `chore`: Perubahan build process/tools

Contoh:
```bash
feat: menambah fitur download TikTok
fix: memperbaiki crash pada command /help
docs: update instalasi guide
```

## Standar Kode

### 1. JavaScript Style Guide
```javascript
// ✅ BENAR
function calculateTotal(items) {
    return items.reduce((total, item) => {
        return total + item.price;
    }, 0);
}

// ❌ SALAH
function calculate_total(items) {
    return items.reduce((t, i) => {
        return t + i.price
    }, 0)
}
```

### 2. Penamaan
- Gunakan camelCase untuk variabel dan fungsi
- Gunakan PascalCase untuk class
- Gunakan UPPERCASE untuk konstanta
- Prefix `_` untuk private methods

### 3. Dokumentasi
```javascript
/**
 * Mengambil data cuaca dari API
 * @param {string} city - Nama kota
 * @param {string} country - Kode negara
 * @returns {Promise<Object>} Data cuaca
 */
async function getWeather(city, country) {
    // Implementation
}
```

## Pull Request

### Checklist Sebelum Submit
- [ ] Kode sudah di-test locally
- [ ] Semua test passed
- [ ] Dokumentasi sudah diupdate
- [ ] Mengikuti code style guide
- [ ] Commit messages sesuai konvensi

### Template PR
```markdown
## Deskripsi
Jelaskan perubahan yang dilakukan

## Tipe Perubahan
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Jelaskan bagaimana menguji perubahan ini

## Screenshots (jika ada)

## Checklist:
- [ ] Code sudah di-review
- [ ] Mengikuti contributing guidelines
- [ ] Documentation sudah diupdate
```

## Development Setup

### 1. Prerequisites
- Node.js v16+
- MySQL 8.0+
- oblixn.cmd v2.5+
- Redis (optional)

### 2. Environment Setup
```bash
# Install dependencies
npm install

# Setup oblixn.cmd
npm install -g oblixn.cmd
oblixn init

# Copy environment file
cp .env.example .env

# Setup database
npm run migrate
npm run seed
```

### 3. Konfigurasi Database
```bash
# Buat database MySQL
CREATE DATABASE natzbot;

# Jalankan migrasi
npm run migrate

# Atur environment variables di .env
DB_HOST=localhost
DB_USER=user
DB_PASSWORD=password
DB_NAME=natzbot
```

### 4. Struktur Direktori
```
Chatbot_whatsapp/
├── auth_info_baileys/    # Session storage
├── config/               # Konfigurasi aplikasi
│   ├── api/              # Integrasi API eksternal
│   ├── dbConf/           # Konfigurasi database  
│   └── memoryAsync/      # Sistem penyimpanan
├── database/             # Skema dan migrasi DB
├── src/
│   ├── commands/         # Semua command handler
│   ├── handler/          # Sistem permission
│   ├── json/             # Data statis 
│   ├── lib/              # Library eksternal
│   └── utils/            # Helper functions
└── tests/                # Unit testing
```

## Testing

### Unit Testing
```javascript
describe('Calculator', () => {
    it('should add two numbers correctly', () => {
        expect(add(2, 2)).toBe(4);
    });
});
```

### Integration Testing
- Gunakan Jest untuk testing
- Coverage minimal 80%
- Test file harus berakhiran `.test.js`
- Mock external services

### 3. Contoh Testing
```javascript
// Contoh test menggunakan Mocha
const { expect } = require('chai');
const { formatBytes } = require('../src/utils/helper');

describe('Helper Functions', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(1024)).to.equal('1 KB');
    expect(formatBytes(1048576)).to.equal('1 MB');
  });
});
```

## Documentation

### 1. Inline Documentation
- Dokumentasi fungsi wajib
- Jelaskan parameter dan return value
- Berikan contoh penggunaan

### 2. API Documentation
- Gunakan format OpenAPI/Swagger
- Dokumentasi endpoint wajib
- Sertakan contoh request/response

### 3. README Updates
- Update README jika ada perubahan fitur
- Tambahkan screenshot jika perlu
- Update versi di package.json

### 4. Environment Variables
```
API_KEY=<key_dall_e>
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
MAX_CONCURRENT=5
SESSION_TIMEOUT=3600
RATE_LIMIT=10
```

### 5. Diagram Arsitektur
```
+-------------------+     +-----------------+
|   WhatsApp Web    |<--->|   Baileys WS    |
+-------------------+     +-----------------+
                               ↑  ↓
+-------------------+     +-----------------+
|  Command Handler  |<--->|  Message Queue  |
+-------------------+     +-----------------+
                               ↑  ↓
+-------------------+     +-----------------+
|  Database MySQL   |<--->|   Cache Redis   |
+-------------------+     +-----------------+
```

## Lisensi

Dengan berkontribusi, Anda setuju:
- Mematuhi tambahan ketentuan lisensi ORBIT STUDIO
- Memberikan credit ke kontributor
- Tidak menggunakan merek dagang "NatzBot" untuk komersialisasi

## Kontak

Jika ada pertanyaan, silakan hubungi:
- Discord: [Server Link]
- Email: support@natzbot.com
- GitHub Discussions

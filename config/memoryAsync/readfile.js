const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class FileManager {
    constructor() {
        this.baseDir = './src/storage';
        this.directories = {
            images: 'images',
            documents: 'documents',
            audio: 'audio',
            video: 'video',
            stickers: 'stickers',
            temp: 'temp'
        };
        this.initDirectories();
    }

    // Inisialisasi direktori yang diperlukan
    initDirectories() {
        Object.values(this.directories).forEach(dir => {
            const fullPath = path.join(this.baseDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    // Generate nama file unik
    generateFileName(originalName, type) {
        const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const hash = crypto.randomBytes(4).toString('hex');
        const ext = path.extname(originalName);
        return `oblivinx_${date}_${hash}_${type}${ext}`;
    }

    // Menyimpan file
    async saveFile(buffer, originalName, type) {
        try {
            const directory = this.directories[type] || 'temp';
            const fileName = this.generateFileName(originalName, type);
            const filePath = path.join(this.baseDir, directory, fileName);

            await fs.promises.writeFile(filePath, buffer);
            return {
                success: true,
                path: filePath,
                fileName: fileName
            };
        } catch (error) {
            console.error('Error saving file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Menghapus file
    async deleteFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    // Mendapatkan path file
    getFilePath(type, fileName) {
        return path.join(this.baseDir, this.directories[type] || 'temp', fileName);
    }

    // Mengecek apakah file ada
    fileExists(filePath) {
        return fs.existsSync(filePath);
    }

    // Mendapatkan informasi file
    async getFileInfo(filePath) {
        try {
            const stats = await fs.promises.stat(filePath);
            return {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            return null;
        }
    }

    // Membersihkan file temporary
    async cleanTempFiles(maxAge = 3600000) { // default 1 jam
        try {
            const tempDir = path.join(this.baseDir, this.directories.temp);
            const files = await fs.promises.readdir(tempDir);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.promises.stat(filePath);
                
                if (now - stats.mtimeMs > maxAge) {
                    await this.deleteFile(filePath);
                }
            }
        } catch (error) {
            console.error('Error cleaning temp files:', error);
        }
    }
}

module.exports = new FileManager();

const fs = require("fs/promises");
const { tmpdir } = require("os");
const Crypto = require("crypto");
const ff = require("fluent-ffmpeg");
const webp = require("node-webpmux");
const path = require("path");

// Fungsi utilitas untuk generate nama file unik
const generateUniqueName = (ext) => 
  path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`);

// Konfigurasi umum untuk FFmpeg
const ffmpegConfig = {
  webp: {
    scale: "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease",
    fps: 15,
    pad: "pad=320:320:-1:-1:color=white@0.0",
    palette: "split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
  },
  video: {
    duration: "00:00:05",
    preset: "superfast",
    loop: 0,
    audio: "-an"
  }
};

async function convertMedia(media, type) {
  const tmpFileIn = generateUniqueName(type === 'image' ? 'jpg' : 'mp4');
  const tmpFileOut = generateUniqueName('webp');
  
  try {
    await fs.writeFile(tmpFileIn, media);
    
    await new Promise((resolve, reject) => {
      const command = ff(tmpFileIn)
        .on("error", reject)
        .on("end", resolve)
        .outputOptions([
          "-vcodec libwebp",
          `-vf ${ffmpegConfig.webp.scale},${ffmpegConfig.webp.pad},${ffmpegConfig.webp.palette}`,
          `-fps ${ffmpegConfig.webp.fps}`
        ]);
      
      if(type === 'video') {
        command.outputOptions([
          `-t ${ffmpegConfig.video.duration}`,
          `-preset ${ffmpegConfig.video.preset}`,
          ffmpegConfig.video.audio,
          "-vsync 0"
        ]);
      }
      
      command.toFormat("webp").save(tmpFileOut);
    });

    const resultBuffer = await fs.readFile(tmpFileOut);
    return resultBuffer;
  } finally {
    await Promise.allSettled([
      fs.unlink(tmpFileIn),
      fs.unlink(tmpFileOut)
    ]);
  }
}

async function processMetadata(mediaBuffer, metadata) {
  const tmpFileIn = generateUniqueName('webp');
  const tmpFileOut = generateUniqueName('webp');
  
  try {
    await fs.writeFile(tmpFileIn, mediaBuffer);
    
    const img = new webp.Image();
    const jsonData = {
      "sticker-pack-id": `https://github.com/maousamaNatz/Oblivinx_jsbot`,
      "sticker-pack-name": metadata.packname || "Oblivinx Bot",
      "sticker-pack-publisher": metadata.author || "ORBIT STUDIO",
      emojis: metadata.categories?.length ? metadata.categories : ["✨"],
      "android-app": "https://play.google.com/store/apps/details?id=com.orbitstudio.oblivinx",
      "ios-app": "https://apps.apple.com/id/app/orbit-studio/id6479012345"
    };

    const exifHeader = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    
    const jsonBuffer = Buffer.from(JSON.stringify(jsonData), "utf-8");
    const exif = Buffer.concat([exifHeader, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);

    await img.load(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);

    return fs.readFile(tmpFileOut);
  } finally {
    await Promise.allSettled([
      fs.unlink(tmpFileIn),
      fs.unlink(tmpFileOut)
    ]);
  }
}

// Fungsi utama yang diekspos
const MediaProcessor = {
  async imageToWebp(media) {
    return convertMedia(media, 'image');
  },

  async videoToWebp(media) {
    return convertMedia(media, 'video');
  },

  async createSticker(media, metadata = {}) {
    try {
      let processedMedia;
      
      if(media.mimetype) {
        processedMedia = /webp/.test(media.mimetype) ? media.data :
          /image/.test(media.mimetype) ? await this.imageToWebp(media.data) :
          /video/.test(media.mimetype) ? await this.videoToWebp(media.data) :
          Buffer.alloc(0);
      } else {
        processedMedia = await this.imageToWebp(media);
      }

      if(Buffer.byteLength(processedMedia) === 0) {
        throw new Error("Invalid media input");
      }

      if(metadata.packname || metadata.author) {
        return processMetadata(processedMedia, metadata);
      }
      
      return processedMedia;
    } catch (error) {
      console.error("Sticker creation error:", error);
      throw new Error(`Failed to create sticker: ${error.message}`);
    }
  }
};

module.exports = {
  ...MediaProcessor,
  writeExifImg: MediaProcessor.createSticker,
  writeExifVid: MediaProcessor.createSticker,
  writeExif: MediaProcessor.createSticker
};

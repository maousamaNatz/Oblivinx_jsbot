const axios = require("axios");
const cheerio = require("cheerio");
const { color, log } = require('../utils/logger');

class InstagramDownloader {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "cookie": process.env.IG_COOKIE || "sessionid=668Q96838382%3AVyZSFuT0tzrMwv%3A16%3AAYd5KFWjTKjomxrySjP6kJJmgE1pR_eFJNSK9nmwzg;"
    };
  }

  // Validasi URL Instagram dengan pola yang diperbarui
  #validateIgUrl(url) {
    const patterns = [
      /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[\w-]+\/?/,
      /https?:\/\/instagram\.com\/stories\/[\w-]+\/\d+\/?/,
      /https?:\/\/(www\.)?instagr\.am\/(p|reel|tv|stories)\/[\w-]+\/?/
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  // Ekstrak metadata dengan error handling
  #extractMetadata(data) {
    try {
      return {
        username: data.author?.username || data.author?.name || 'N/A',
        caption: data.caption?.text || 'Tidak ada caption',
        likes: data.like_count || data.edge_media_preview_like?.count || 0,
        comments: data.comment_count || data.edge_media_to_comment?.count || 0,
        timestamp: data.taken_at_timestamp || Date.now(),
        duration: data.video_duration || 0
      };
    } catch (error) {
      log.error(`Gagal ekstrak metadata: ${error.message}`, { stack: error.stack });
      return null;
    }
  }

  // Ekstrak URL media dengan penanganan berbagai tipe konten
  #extractMediaUrls(data) {
    try {
      const media = [];
      
      // Handle video content
      if (data.video_versions) {
        const bestVideo = data.video_versions.reduce((prev, current) => 
          (current.height > prev.height) ? current : prev
        );
        media.push({
          type: "video",
          url: bestVideo.url,
          quality: `${bestVideo.height}p`,
          width: bestVideo.width,
          height: bestVideo.height
        });
      }

      // Handle image content
      if (data.image_versions2) {
        const bestImage = data.image_versions2.candidates.reduce((prev, current) => 
          (current.width > prev.width) ? current : prev
        );
        media.push({
          type: "image",
          url: bestImage.url,
          width: bestImage.width,
          height: bestImage.height
        });
      }

      // Handle carousel content
      if (data.carousel_media) {
        data.carousel_media.forEach(item => {
          if (item.video_versions) {
            media.push({
              type: "video",
              url: item.video_versions[0].url,
              quality: `${item.video_versions[0].height}p`,
              width: item.video_versions[0].width,
              height: item.video_versions[0].height
            });
          }
          if (item.image_versions2) {
            media.push({
              type: "image",
              url: item.image_versions2.candidates[0].url,
              width: item.image_versions2.candidates[0].width,
              height: item.image_versions2.candidates[0].height
            });
          }
        });
      }

      return media;
    } catch (error) {
      log.error(`Gagal ekstrak media: ${error.message}`, { stack: error.stack });
      return [];
    }
  }

  // Download post dengan penanganan struktur data baru
  async #downloadPost(url) {
    try {
      const response = await axios.get(`${url}?__a=1&__d=dis`, { headers: this.headers });
      const postData = response.data.items[0];
      
      if (!postData) {
        throw new Error('Struktur data post tidak valid');
      }

      const metadata = this.#extractMetadata(postData);
      const mediaUrls = this.#extractMediaUrls(postData);

      return {
        success: true,
        metadata: {
          ...metadata,
          url,
          media_count: mediaUrls.length
        },
        media: mediaUrls
      };
    } catch (error) {
      log.error(`Gagal download post: ${error.message}`, { 
        url,
        error: error.response?.data,
        stack: error.stack 
      });
      throw new Error(`Gagal memproses post: ${error.message}`);
    }
  }

  // Download story dengan API endpoint terbaru
  async #downloadStory(url) {
    try {
      const storyId = url.split("/")[4];
      const apiUrl = `https://www.instagram.com/stories/reels_media/?reel_ids=${storyId}`;
      const response = await axios.get(apiUrl, { headers: this.headers });
      
      const storyData = response.data.reels_media[0].items[0];
      if (!storyData) {
        throw new Error('Data story tidak ditemukan');
      }

      return {
        type: storyData.video_versions ? "video" : "image",
        url: storyData.video_versions?.[0]?.url || storyData.image_versions2.candidates[0].url,
        duration: storyData.video_duration || 0,
        timestamp: storyData.taken_at,
        mentions: storyData.mentions || []
      };
    } catch (error) {
      log.error(`Gagal download story: ${error.message}`, {
        url,
        error: error.response?.data,
        stack: error.stack
      });
      throw new Error(`Gagal memproses story: ${error.message}`);
    }
  }

  async download(url) {
    try {
      log.info(`Memproses URL Instagram: ${url}`);
      
      if (!this.#validateIgUrl(url)) {
        throw new Error("Format URL Instagram tidak valid");
      }

      if (url.includes("/stories/")) {
        const storyResult = await this.#downloadStory(url);
        return { 
          success: true,
          type: 'story',
          ...storyResult
        };
      }

      const postResult = await this.#downloadPost(url);
      return {
        ...postResult,
        type: 'post'
      };
      
    } catch (error) {
      log.error(`Error di command igdl: ${error.message}`, {
        url,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message,
        type: 'unknown'
      };
    }
  }
}

module.exports = InstagramDownloader;

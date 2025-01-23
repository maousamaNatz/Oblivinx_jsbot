const axios = require("axios");
const cheerio = require("cheerio");

class InstagramDownloader {
  constructor() {
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };
  }

  // Fungsi utilitas untuk memeriksa tipe konten
  async #fastCheck(url) {
    try {
      console.log(`[FastCheck] Mencoba mengecek konten dari URL: ${url}`);
      const resp = await axios.get(url);
      console.log(`[FastCheck] Berhasil mendapatkan content-type: ${resp.headers["content-type"]}`);
      return resp.headers["content-type"];
    } catch (error) {
      console.error(`[FastCheck] Error saat mengecek konten:`, error);
      throw new Error(`Gagal memeriksa konten: ${error.message}`);
    }
  }

  // Validasi URL post Instagram
  #isPostUrl(url) {
    console.log(`[URLValidator] Memeriksa URL post: ${url}`);
    const regex =
      /(https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([^/?#&]+)).*/;
    const isValid = regex.test(url);
    console.log(`[URLValidator] URL post valid: ${isValid}`);
    return isValid;
  }

  // Validasi URL story Instagram
  #isStoryUrl(url) {
    console.log(`[URLValidator] Memeriksa URL story: ${url}`);
    const regex =
      /(https?:\/\/(?:www\.)?instagram\.com\/(s|stories)\/([^/?#&]+)).*/;
    const isValid = regex.test(url);
    console.log(`[URLValidator] URL story valid: ${isValid}`);
    return isValid;
  }

  // Download post Instagram
  async #downloadPost(url) {
    try {
      console.log(`[PostDownloader] Memulai proses download post dari: ${url}`);
      
      console.log(`[PostDownloader] Mengakses indown.io...`);
      const res = await axios.get("https://indown.io/", {
        headers: this.headers,
      });
      console.log(`[PostDownloader] Berhasil mengakses indown.io`);

      const _$ = cheerio.load(res.data);
      console.log(`[PostDownloader] Berhasil memuat HTML dengan cheerio`);

      const formData = {
        link: url,
        referer: _$("input[name=referer]").val(),
        locale: _$("input[name=locale]").val(),
        _token: _$("input[name=_token]").val(),
      };

      console.log(`[PostDownloader] Form data yang akan dikirim:`, formData);

      console.log(`[PostDownloader] Mengirim request download ke indown.io...`);
      const { data } = await axios.post(
        "https://indown.io/download",
        new URLSearchParams(formData),
        {
          headers: {
            ...this.headers,
            cookie: res.headers["set-cookie"]?.join("; "),
          },
        }
      );
      console.log(`[PostDownloader] Berhasil mendapatkan response download`);

      const $ = cheerio.load(data);
      const __$ = cheerio.load($("#result").html());
      const result = [];

      console.log(`[PostDownloader] Memproses hasil video...`);
      __$("video").each(function () {
        const videoUrl = $(this).find("source").attr("src");
        console.log(`[PostDownloader] Menemukan video URL: ${videoUrl}`);
        result.push({
          type: "video",
          url: videoUrl,
        });
      });

      console.log(`[PostDownloader] Memproses hasil gambar...`);
      __$("img").each(function () {
        const imgUrl = $(this).attr("src");
        console.log(`[PostDownloader] Menemukan image URL: ${imgUrl}`);
        result.push({
          type: "image",
          url: imgUrl,
        });
      });

      console.log(`[PostDownloader] Total media ditemukan: ${result.length}`);
      return result;
    } catch (error) {
      console.error(`[PostDownloader] Error detail:`, error);
      throw new Error(`Gagal mengunduh post: ${error.message}`);
    }
  }

  // Download story Instagram
  async #downloadStory(url) {
    try {
      console.log(`[StoryDownloader] Memulai download story dari: ${url}`);
      
      const apiUrl = `https://instasupersave.com/api/ig/story?url=${url}`;
      console.log(`[StoryDownloader] Mengakses API: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, { headers: this.headers });
      console.log(`[StoryDownloader] Berhasil mendapatkan response dari API`);
      
      const result = response.data.result[0];
      console.log(`[StoryDownloader] Data result:`, result);

      if ("video_versions" in result) {
        console.log(`[StoryDownloader] Terdeteksi sebagai video story`);
        const videoUrl = result.video_versions[0].url;
        const type = await this.#fastCheck(videoUrl);
        console.log(`[StoryDownloader] Video URL: ${videoUrl}, Type: ${type}`);
        return { type, url: videoUrl };
      } else {
        console.log(`[StoryDownloader] Terdeteksi sebagai image story`);
        const imageUrl = result?.image_versions2?.candidates[0].url;
        const type = await this.#fastCheck(imageUrl);
        console.log(`[StoryDownloader] Image URL: ${imageUrl}, Type: ${type}`);
        return { type, url: imageUrl };
      }
    } catch (error) {
      console.error(`[StoryDownloader] Error detail:`, error);
      throw new Error(`Gagal mengunduh story: ${error.message}`);
    }
  }

  // Metode publik untuk mengunduh konten Instagram
  async download(url) {
    try {
      console.log(`[Downloader] Memulai proses download untuk URL: ${url}`);
      
      if (this.#isPostUrl(url)) {
        console.log(`[Downloader] Mendeteksi sebagai URL post`);
        const result = await this.#downloadPost(url);
        console.log(`[Downloader] Download post berhasil`);
        return { success: true, type: "post", data: result };
      } else if (this.#isStoryUrl(url)) {
        console.log(`[Downloader] Mendeteksi sebagai URL story`);
        const result = await this.#downloadStory(url);
        console.log(`[Downloader] Download story berhasil`);
        return { success: true, type: "story", data: result };
      } else {
        console.log(`[Downloader] URL tidak valid`);
        throw new Error("URL Instagram tidak valid");
      }
    } catch (error) {
      console.error(`[Downloader] Error dalam proses download:`, error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = InstagramDownloader;

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class PinterestScrapper extends EventEmitter {
  constructor(cookies) {
    super();
    this.cookies = cookies;
    this.baseURL = 'https://id.pinterest.com';
    this.apiURL = 'https://id.pinterest.com/resource/BaseSearchResource/get/';
    this.headers = this.initHeaders();
    this.config = {
      validImageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 10000,
      maxConcurrent: 5,
      defaultLimit: 10,
      maxLimit: 50
    };
    this.cache = new Map();
    this.rateLimiter = {
      requests: [],
      maxRequests: 30,
      timeWindow: 60000 // 1 menit
    };
  }

  initHeaders() {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://id.pinterest.com/',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': this.formatCookies(),
      'Origin': 'https://id.pinterest.com',
      'Connection': 'keep-alive'
    };
  }

  formatCookies() {
    if (!Array.isArray(this.cookies)) {
      throw new Error('Cookies harus berupa array');
    }
    return this.cookies
      .filter(cookie => cookie.name && cookie.value)
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  async searchPins(query, options = {}) {
    try {
      const defaultOptions = {
        limit: this.config.defaultLimit,
        type: 'all', // 'all', 'image', 'video', 'gif'
        sort: 'relevant', // 'relevant', 'recent'
        scope: 'pins',
        retry: true
      };

      const searchOptions = { ...defaultOptions, ...options };
      const cacheKey = this.getCacheKey(query, searchOptions);

      // Cek cache
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // Cache valid for 5 minutes
          return cached.data;
        }
      }

      // Rate limiting check
      await this.checkRateLimit();

      const results = await this.fetchPins(query, searchOptions);
      const processedResults = await this.processPins(results, searchOptions);

      // Update cache
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: processedResults
      });

      return processedResults;

    } catch (error) {
      this.emit('error', error);
      if (options.retry) {
        return this.fallbackSearch(query, options);
      }
      throw error;
    }
  }

  async fetchPins(query, options) {
    const validatedQuery = this.validateQuery(query);
    const bookmarks = [];
    let allResults = [];

    try {
        // Coba metode API terlebih dahulu
        const apiResults = await this.fetchFromAPI(validatedQuery, options);
        if (apiResults.length > 0) {
            allResults = apiResults;
        } else {
            // Jika API tidak memberikan hasil, coba scraping HTML
            const scrapedResults = await this.scrapeFromHTML(validatedQuery, options);
            allResults = scrapedResults;
        }

        // Filter dan batasi hasil
        return allResults.slice(0, options.limit);
    } catch (error) {
        this.emit('error', `Error fetching pins: ${error.message}`);
        // Jika kedua metode gagal, coba metode fallback
        return this.fallbackSearch(validatedQuery, options);
    }
  }

  async fetchFromAPI(query, options) {
    const data = {
        options: {
            query: query,
            scope: options.scope || "pins",
            bookmarks: [],
            page_size: Math.min(50, options.limit),
            field_set_key: "unauth_react",
            auto_correction_disabled: false
        }
    };

    const response = await this.makeRequest('GET', this.apiURL, {
        params: {
            source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
            data: JSON.stringify(data)
        }
    });

    return response.data?.resource_response?.data || [];
  }

  async scrapeFromHTML(query, options) {
    try {
        const url = `${this.baseURL}/search/pins/?q=${encodeURIComponent(query)}`;
        const response = await this.makeRequest('GET', url);
        const $ = cheerio.load(response.data);
        const results = [];

        // Coba berbagai selector yang mungkin
        const selectors = [
            'div[data-test-id="pin"]',
            'div[data-grid-item]',
            'div.Grid__Item',
            'div[role="listitem"]'
        ];

        for (const selector of selectors) {
            $(selector).each((_, element) => {
                try {
                    const $pin = $(element);
                    const imageElement = $pin.find('img').first();
                    const imageUrl = imageElement.attr('src');
                    
                    if (imageUrl) {
                        const pinId = $pin.attr('data-pin-id') || 
                                    $pin.attr('data-test-pin-id') || 
                                    `pin_${Date.now()}_${results.length}`;
                        
                        results.push({
                            id: pinId,
                            title: imageElement.attr('alt') || 'Untitled',
                            images: {
                                orig: {
                                    url: this.getHighResImage(imageUrl)
                                }
                            },
                            description: '',
                            grid_title: imageElement.attr('alt') || '',
                            type: 'pin'
                        });
                    }
                } catch (e) {
                    this.emit('warning', `Error processing pin element: ${e.message}`);
                }
            });

            if (results.length > 0) break;
        }

        return results;
    } catch (error) {
        this.emit('error', `Error scraping HTML: ${error.message}`);
        return [];
    }
  }

  async fallbackSearch(query, options) {
    try {
        // Coba pencarian dengan query yang lebih sederhana
        const simplifiedQuery = query.split(' ')[0]; // Ambil kata pertama saja
        const results = await this.fetchFromAPI(simplifiedQuery, options);
        
        if (results.length > 0) {
            return results;
        }

        // Jika masih tidak ada hasil, coba dengan kategori populer
        const popularCategories = ['art', 'photography', 'design', 'fashion'];
        for (const category of popularCategories) {
            const categoryResults = await this.fetchFromAPI(`${simplifiedQuery} ${category}`, options);
            if (categoryResults.length > 0) {
                return categoryResults;
            }
        }

        return [];
    } catch (error) {
        this.emit('error', `Fallback search failed: ${error.message}`);
        return [];
    }
  }

  async processPins(pins, options) {
    const processedPins = await Promise.all(
      pins.map(async pin => {
        try {
          const mediaType = this.getMediaType(pin);
          if (options.type !== 'all' && mediaType !== options.type) {
            return null;
          }

          const imageUrl = this.getBestImage(pin.images);
          if (!imageUrl) return null;

          return {
            id: pin.id,
            title: this.sanitizeText(pin.title || pin.grid_title || 'Untitled'),
            description: this.sanitizeText(pin.description || ''),
            mediaType: mediaType,
            imageUrl: imageUrl,
            originalUrl: pin.original_link || null,
            pinUrl: `https://pinterest.com/pin/${pin.id}`,
            created_at: pin.created_at,
            metadata: {
              width: pin.images?.orig?.width,
              height: pin.images?.orig?.height,
              isVideo: !!pin.videos,
              duration: pin.videos?.video_list?.V_720P?.duration,
              videoUrl: pin.videos?.video_list?.V_720P?.url 
            }
          };
        } catch (e) {
          this.emit('warning', `Error processing pin ${pin.id}: ${e.message}`);
          return null;
        }
      })
    );

    return processedPins.filter(pin => pin !== null);
  }

  async makeRequest(method, url, options = {}) {
    return this.retryOperation(async () => {
      const response = await axios({
        method,
        url,
        ...options,
        headers: { ...this.headers, ...options.headers },
        timeout: this.config.timeout
      });

      this.rateLimiter.requests.push(Date.now());
      return response;
    });
  }

  async checkRateLimit() {
    const now = Date.now();
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      time => now - time < this.rateLimiter.timeWindow
    );

    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      const oldestRequest = this.rateLimiter.requests[0];
      const waitTime = this.rateLimiter.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  getCacheKey(query, options) {
    return `${query}_${JSON.stringify(options)}`;
  }

  validateQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query pencarian tidak valid');
    }
    // Bersihkan query dari karakter khusus
    return query.replace(/[^\w\s-]/g, '').trim();
  }

  validateImageUrl(url) {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      const ext = path.extname(urlObj.pathname).toLowerCase();
      return this.config.validImageExtensions.includes(ext);
    } catch (e) {
      return false;
    }
  }

  async retryOperation(operation, retries = this.config.maxRetries) {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (i + 1)));
      }
    }
  }

  sanitizeText(text) {
    if (!text) return '';
    // Bersihkan teks dari karakter khusus dan HTML
    return text
      .replace(/<[^>]*>/g, '') // Hapus HTML tags
      .replace(/[^\w\s.,!?-]/g, '') // Hanya izinkan karakter tertentu
      .trim();
  }

  getBestImage(images) {
    if (typeof images === 'string') {
      return this.validateImageUrl(images) ? images : null;
    }
    if (!images) return null;
    
    const sizes = ['orig', 'max_size', '736x', '474x'];
    for (const size of sizes) {
      const url = images[size]?.url;
      if (url && this.validateImageUrl(url)) {
        return url;
      }
    }
    return null;
  }

  getHighResImage(url) {
    if (!url) return null;
    if (!this.validateImageUrl(url)) return null;
    
    // Coba dapatkan versi resolusi tinggi
    const highResUrl = url.replace(/\/[0-9]+x\//, '/originals/');
    return highResUrl;
  }

  getMediaType(pin) {
    try {
      if (pin.videos && Object.keys(pin.videos).length > 0) return 'video';
      const imageUrl = this.getBestImage(pin.images);
      if (imageUrl?.includes('.gif')) return 'gif';
      return 'image';
    } catch (e) {
      return 'image'; // default to image if can't determine type
    }
  }

  // New method for downloading media
  async downloadMedia(pin, outputPath) {
    try {
      const url = pin.mediaType === 'video' ? pin.metadata.videoUrl : pin.imageUrl;
      if (!url) throw new Error('No media URL available');

      const response = await this.makeRequest('GET', url, {
        responseType: 'arraybuffer'
      });

      const buffer = Buffer.from(response.data);
      
      if (outputPath) {
        const ext = path.extname(url) || (pin.mediaType === 'video' ? '.mp4' : '.jpg');
        const filename = `${pin.id}${ext}`;
        const fullPath = path.join(outputPath, filename);
        await fs.promises.writeFile(fullPath, buffer);
        return { buffer, path: fullPath };
      }

      return { buffer };
    } catch (error) {
      this.emit('error', `Failed to download media for pin ${pin.id}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PinterestScrapper;
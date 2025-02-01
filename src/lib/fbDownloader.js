const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")
const path = require("path")
const { exec } = require("child_process")

const getFbVideoInfo = async (videoUrl, options = {}) => {
    return new Promise((resolve, reject) => {
        const headers = {
            ...options.headers,
            "sec-fetch-user": "?1",
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-site": "none",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "cache-control": "max-age=0",
            authority: "www.facebook.com",
            "upgrade-insecure-requests": "1",
            "accept-language": "en-GB,en;q=0.9,tr-TR;q=0.8,tr;q=0.7,en-US;q=0.6",
            "sec-ch-ua": '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
            "user-agent": options.useragent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            cookie: options.cookie || "sb=Rn8BYQvCEb2fpMQZjsd6L382; datr=Rn8BYbyhXgw9RlOvmsosmVNT; c_user=100003164630629; _fbp=fb.1.1629876126997.444699739; wd=1920x939; spin=r.1004812505_b.trunk_t.1638730393_s.1_v.2_; xs=28%3A8ROnP0aeVF8XcQ%3A2%3A1627488145%3A-1%3A4916%3A%3AAcWIuSjPy2mlTPuZAeA2wWzHzEDuumXI89jH8a_QIV8; fr=0jQw7hcrFdas2ZeyT.AWVpRNl_4noCEs_hb8kaZahs-jA.BhrQqa.3E.AAA.0.0.BhrQqa.AWUu879ZtCw",
        }

        const parseString = (string) => JSON.parse(`{"text": "${string}"}`).text

        if (!videoUrl || !videoUrl.trim()) return reject("Silakan masukkan URL Facebook")
        if (["facebook.com", "fb.watch"].every((domain) => !videoUrl.includes(domain))) return reject("Silakan masukkan URL Facebook yang valid")

        axios.get(videoUrl, { headers }).then(({ data }) => {
            data = data.replace(/&quot;/g, '"').replace(/&amp;/g, "&")
            
            // Enhanced quality detection
            const qualityMatches = {
                '4k': data.match(/"browser_native_4k_url":"(.*?)"/),
                '1080p': data.match(/"browser_native_1080p_url":"(.*?)"/),
                '720p': data.match(/"browser_native_720p_url":"(.*?)"/),
                hd: data.match(/"browser_native_hd_url":"(.*?)"/) || data.match(/"playable_url_quality_hd":"(.*?)"/) || data.match(/hd_src\s*:\s*"([^"]*)"/),
                sd: data.match(/"browser_native_sd_url":"(.*?)"/) || data.match(/"playable_url":"(.*?)"/) || data.match(/sd_src\s*:\s*"([^"]*)"/) || data.match(/(?<="src":")[^"]*(https:\/\/[^"]*)/)
            }

            // Enhanced metadata extraction
            const metadata = {
                title: data.match(/<meta\sname="description"\scontent="(.*?)"/),
                thumbnail: data.match(/"preferred_thumbnail":{"image":{"uri":"(.*?)"/),
                duration: data.match(/"playable_duration_in_ms":[0-9]+/gm),
                uploader: data.match(/"owning_profile":{"__typename":"User","name":"([^"]*)"/) || 
                        data.match(/"publisher":{"name":"([^"]*)"/) ||
                        data.match(/<meta\sproperty="og:title"\scontent="([^"]*)\s(?:on\sFacebook|posted)/),
                description: data.match(/"text":"([^"]*?)(?:\\n|")(?=[^"]*?"type":"post"|$)/) ||
                          data.match(/<meta\sname="description"\scontent="([^"]*)"/),
                date: data.match(/"publish_time":([0-9]+)/) ||
                    data.match(/"created_time":([0-9]+)/),
                views: data.match(/"play_count":([0-9]+)/) ||
                     data.match(/"total_play_count":([0-9]+)/),
                likes: data.match(/"like_count":([0-9]+)/) ||
                     data.match(/"reaction_count":([0-9]+)/),
                shares: data.match(/"share_count":([0-9]+)/),
                resolution: data.match(/"original_dimensions":{"x":([0-9]+),"y":([0-9]+)}/),
                frame_rate: data.match(/"frame_rate":([0-9]+)/),
                audio_channels: data.match(/"audio_channels":([0-9]+)/)
            }

            if (qualityMatches.sd && qualityMatches.sd[1]) {
                const result = {
                    url: videoUrl,
                    qualities: {},
                    duration_ms: Number(metadata.duration[0].split(":")[1]),
                    title: metadata.title && metadata.title[1] ? parseString(metadata.title[1]) : data.match(/<title>(.*?)<\/title>/)?.[1] ?? "",
                    thumbnail: metadata.thumbnail && metadata.thumbnail[1] ? parseString(metadata.thumbnail[1]) : "",
                    uploader: metadata.uploader && metadata.uploader[1] ? parseString(metadata.uploader[1]) : "Tidak diketahui",
                    description: metadata.description && metadata.description[1] ? parseString(metadata.description[1]) : "",
                    uploadDate: metadata.date && metadata.date[1] ? new Date(Number(metadata.date[1]) * 1000).toISOString() : "",
                    statistics: {
                        views: metadata.views && metadata.views[1] ? Number(metadata.views[1]) : 0,
                        likes: metadata.likes && metadata.likes[1] ? Number(metadata.likes[1]) : 0,
                        shares: metadata.shares && metadata.shares[1] ? Number(metadata.shares[1]) : 0
                    },
                    technical: {
                        resolution: metadata.resolution ? {
                            width: parseInt(metadata.resolution[1]),
                            height: parseInt(metadata.resolution[2])
                        } : null,
                        frame_rate: metadata.frame_rate ? parseInt(metadata.frame_rate[1]) : null,
                        audio_channels: metadata.audio_channels ? parseInt(metadata.audio_channels[1]) : null
                    }
                }

                // Add available qualities
                Object.entries(qualityMatches).forEach(([quality, match]) => {
                    if (match && match[1]) {
                        result.qualities[quality] = parseString(match[1])
                    }
                })

                resolve(result)
            } else {
                reject("Tidak dapat mengambil informasi video saat ini. Silakan coba lagi")
            }
        }).catch((err) => {
            console.log(err)
            reject("Tidak dapat mengambil informasi video saat ini. Silakan coba lagi")
        })
    })
}

const downloadFbVideo = async (videoUrl, options = {}) => {
    const defaultOptions = {
        filename: `fb_video_${Date.now()}`,
        quality: 'best',
        format: 'mp4',
        downloadDir: path.join(process.cwd(), 'downloads'),
        maxSize: 50 * 1024 * 1024, // 50MB
        retries: 3,
        timeout: 30000,
        chunkSize: 10 * 1024 * 1024, // 10MB
        progressCallback: null,
        metadata: true,
        thumbnail: false,
        audioOnly: false
    }

    const opts = { ...defaultOptions, ...options }
    
    try {
        const info = await getFbVideoInfo(videoUrl, opts)
        const selectedQuality = opts.quality === 'best' ? 
            Object.keys(info.qualities).reverse()[0] : 
            opts.quality

        const url = info.qualities[selectedQuality]
        if (!url) throw new Error("Kualitas video tidak tersedia")

        // File size validation
        const head = await axios.head(url, { timeout: opts.timeout })
        const contentLength = head.headers['content-length']
        if (contentLength > opts.maxSize) {
            throw new Error(`Ukuran video melebihi batas ${opts.maxSize / 1024 / 1024}MB`)
        }

        console.log("Memulai download video...")
        console.log(`Kualitas: ${selectedQuality.toUpperCase()}`)
        console.log(`Format: ${opts.format}`)
        console.log(`Judul: ${info.title}`)
        console.log(`Resolusi: ${info.technical.resolution?.width}x${info.technical.resolution?.height}`)

        const tempPath = path.join(opts.downloadDir, `temp_${opts.filename}.mp4`)
        const finalPath = path.join(opts.downloadDir, `${opts.filename}.${opts.format}`)

        if (!fs.existsSync(opts.downloadDir)) {
            fs.mkdirSync(opts.downloadDir, { recursive: true })
        }

        const writer = fs.createWriteStream(tempPath)
        let downloaded = 0
        let attempts = 0

        const downloadChunk = async (start = 0) => {
            try {
                const response = await axios({
                    method: 'GET',
                    url,
                    responseType: 'stream',
                    headers: { Range: `bytes=${start}-${start + opts.chunkSize - 1}` },
                    timeout: opts.timeout
                })

                response.data.pipe(writer, { end: false })
                
                response.data.on('data', (chunk) => {
                    downloaded += chunk.length
                    if(opts.progressCallback) {
                        opts.progressCallback({
                            percent: (downloaded / contentLength) * 100,
                            downloaded: downloaded,
                            total: contentLength,
                            speed: response.headers['x-ratelimit-remaining']
                        })
                    }
                })

                response.data.on('end', () => {
                    if (downloaded < contentLength) {
                        downloadChunk(downloaded)
                    } else {
                        writer.end()
                    }
                })
            } catch (error) {
                if (attempts < opts.retries) {
                    attempts++
                    console.log(`Retry attempt ${attempts}/${opts.retries}`)
                    downloadChunk(downloaded)
                } else {
                    throw error
                }
            }
        }

        await downloadChunk(0)

        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                try {
                    // Post-processing
                    if (opts.audioOnly || opts.format !== 'mp4') {
                        await convertVideo(tempPath, finalPath, opts)
                        fs.unlinkSync(tempPath)
                    } else {
                        fs.renameSync(tempPath, finalPath)
                    }

                    // Download thumbnail
                    if (opts.thumbnail && info.thumbnail) {
                        await downloadThumbnail(info.thumbnail, path.join(opts.downloadDir, `${opts.filename}.jpg`))
                    }

                    resolve({
                        filename: `${opts.filename}.${opts.format}`,
                        path: finalPath,
                        size: contentLength,
                        quality: selectedQuality,
                        ...(opts.metadata && { metadata: info })
                    })
                } catch (error) {
                    reject(error)
                }
            })

            writer.on('error', reject)
        })
    } catch (error) {
        throw new Error(`Download gagal: ${error.message}`)
    }
}

const convertVideo = (inputPath, outputPath, options) => {
    return new Promise((resolve, reject) => {
        let ffmpegCommand = `ffmpeg -i ${inputPath} `
        
        if (options.audioOnly) {
            ffmpegCommand += `-vn -c:a libmp3lame ${outputPath}`
        } else {
            ffmpegCommand += `-c copy ${outputPath}`
        }

        exec(ffmpegCommand, (error) => {
            if (error) reject("Gagal mengkonversi video")
            else resolve()
        })
    })
}

const downloadThumbnail = async (url, outputPath) => {
    const response = await axios.get(url, { responseType: 'stream' })
    const writer = fs.createWriteStream(outputPath)
    response.data.pipe(writer)
    
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}

const downloadFbPlaylist = async (playlistUrl, options = {}) => {
    const defaultPlaylistOptions = {
        parallel: 2,
        interval: 5000,
        maxVideos: 10,
        quality: 'sd',
        format: 'mp4'
    }
    
    const opts = { ...defaultPlaylistOptions, ...options }
    const results = []
    
    // Implementasi ekstraksi playlist
    // [Fungsi ini memerlukan implementasi parser playlist Facebook]
    
    return results
}

const handleFacebookError = (error) => {
    const errorMap = {
        'ETIMEDOUT': 'Timeout terhubung ke server Facebook',
        'ENOTFOUND': 'URL tidak valid',
        'ECONNABORTED': 'Koneksi terputus',
        'ERR_BAD_REQUEST': 'Cookie tidak valid atau kedaluwarsa',
        'ERR_BAD_RESPONSE': 'Respon tidak valid dari server',
        'ERR_FR_TOO_MANY_REDIRECTS': 'Terlalu banyak redirect',
        'ENOSPC': 'Ruang penyimpanan tidak cukup'
    }
    return errorMap[error.code] || error.message
}

module.exports = {
    getFbVideoInfo,
    downloadFbVideo,
    downloadFbPlaylist,
    handleFacebookError,
    getFbCookies: () => require("../config/fb-cookies.json"),
    validateFbUrl: (url) => /(facebook\.com|fb\.watch)/.test(url),
    supportedQualities: ['4k', '1080p', '720p', 'hd', 'sd'],
    supportedFormats: ['mp4', 'mkv', 'avi', 'mp3']
}

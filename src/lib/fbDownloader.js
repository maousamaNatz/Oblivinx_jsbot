const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")
const path = require("path")

const getFbVideoInfo = async (videoUrl, cookie, useragent)=>{
    return new Promise((resolve, reject)=>{
        const headers = {
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
            "user-agent": useragent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            cookie: cookie || "sb=Rn8BYQvCEb2fpMQZjsd6L382; datr=Rn8BYbyhXgw9RlOvmsosmVNT; c_user=100003164630629; _fbp=fb.1.1629876126997.444699739; wd=1920x939; spin=r.1004812505_b.trunk_t.1638730393_s.1_v.2_; xs=28%3A8ROnP0aeVF8XcQ%3A2%3A1627488145%3A-1%3A4916%3A%3AAcWIuSjPy2mlTPuZAeA2wWzHzEDuumXI89jH8a_QIV8; fr=0jQw7hcrFdas2ZeyT.AWVpRNl_4noCEs_hb8kaZahs-jA.BhrQqa.3E.AAA.0.0.BhrQqa.AWUu879ZtCw",
        }

        const parseString = (string) => JSON.parse(`{"text": "${string}"}`).text;

        if (!videoUrl || !videoUrl.trim()) return reject("Silakan masukkan URL Facebook");
        if (["facebook.com", "fb.watch"].every((domain) => !videoUrl.includes(domain))) return reject("Silakan masukkan URL Facebook yang valid");

        axios.get(videoUrl, { headers }).then(({ data }) => {
            data = data.replace(/&quot;/g, '"').replace(/&amp;/g, "&")
            
            // Video quality matches
            const sdMatch = data.match(/"browser_native_sd_url":"(.*?)"/) || data.match(/"playable_url":"(.*?)"/) || data.match(/sd_src\s*:\s*"([^"]*)"/) || data.match(/(?<="src":")[^"]*(https:\/\/[^"]*)/)
            const hdMatch = data.match(/"browser_native_hd_url":"(.*?)"/) || data.match(/"playable_url_quality_hd":"(.*?)"/) || data.match(/hd_src\s*:\s*"([^"]*)"/)
            
            // Video metadata matches
            const titleMatch = data.match(/<meta\sname="description"\scontent="(.*?)"/)
            const thumbMatch = data.match(/"preferred_thumbnail":{"image":{"uri":"(.*?)"/)
            const duration = data.match(/"playable_duration_in_ms":[0-9]+/gm)
            
            // New metadata matches
            const uploaderMatch = data.match(/"owning_profile":{"__typename":"User","name":"([^"]*)"/) || 
                                data.match(/"publisher":{"name":"([^"]*)"/) ||
                                data.match(/<meta\sproperty="og:title"\scontent="([^"]*)\s(?:on\sFacebook|posted)/)
            const descriptionMatch = data.match(/"text":"([^"]*?)(?:\\n|")(?=[^"]*?"type":"post"|$)/) ||
                                   data.match(/<meta\sname="description"\scontent="([^"]*)"/)
            const dateMatch = data.match(/"publish_time":([0-9]+)/) ||
                            data.match(/"created_time":([0-9]+)/)
            const viewsMatch = data.match(/"play_count":([0-9]+)/) ||
                             data.match(/"total_play_count":([0-9]+)/)
            const likesMatch = data.match(/"like_count":([0-9]+)/) ||
                             data.match(/"reaction_count":([0-9]+)/)
            const sharesMatch = data.match(/"share_count":([0-9]+)/)

            if (sdMatch && sdMatch[1]) {
                const result = {
                    url: videoUrl,
                    duration_ms: Number(duration[0].split(":")[1]),
                    sd: parseString(sdMatch[1]),
                    hd: hdMatch && hdMatch[1] ? parseString(hdMatch[1]) : "",
                    title: titleMatch && titleMatch[1] ? parseString(titleMatch[1]) : data.match(/<title>(.*?)<\/title>/)?.[1] ?? "",
                    thumbnail: thumbMatch && thumbMatch[1] ? parseString(thumbMatch[1]) : "",
                    uploader: uploaderMatch && uploaderMatch[1] ? parseString(uploaderMatch[1]) : "Tidak diketahui",
                    description: descriptionMatch && descriptionMatch[1] ? parseString(descriptionMatch[1]) : "",
                    uploadDate: dateMatch && dateMatch[1] ? new Date(Number(dateMatch[1]) * 1000).toISOString() : "",
                    statistics: {
                        views: viewsMatch && viewsMatch[1] ? Number(viewsMatch[1]) : 0,
                        likes: likesMatch && likesMatch[1] ? Number(likesMatch[1]) : 0,
                        shares: sharesMatch && sharesMatch[1] ? Number(sharesMatch[1]) : 0
                    }
                }
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

const downloadFbVideo = async (videoUrl, filename, quality = "sd") => {
    const convertTime = (hms) => {
        if (hms.length < 3) {
            return hms;
        } else if (hms.length < 6) {
            const a = hms.split(':');
            return (+a[0]) * 60 + (+a[1]);
        } else {
            const a = hms.split(':');
            return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
        }
    };

    try {
        const info = await getFbVideoInfo(videoUrl);
        const url = quality === "hd" && info.hd ? info.hd : info.sd;
        
        if (!url) {
            throw new Error("Video tidak ditemukan");
        }

        console.log("Memulai download video...");
        console.log(`Judul: ${info.title}`);
        console.log(`Uploader: ${info.uploader}`);
        console.log(`Durasi: ${Math.floor(info.duration_ms/1000)} detik`);
        console.log(`Views: ${info.statistics.views.toLocaleString()}`);
        
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        const downloadDir = path.join(process.cwd(), 'downloads');
        if (!fs.existsSync(downloadDir)){
            fs.mkdirSync(downloadDir);
        }

        if (!filename.endsWith('.mp4')) {
            filename += '.mp4';
        }

        const filePath = path.join(downloadDir, filename);
        const writer = fs.createWriteStream(filePath);

        const totalLength = response.headers['content-length'];
        let downloaded = 0;

        response.data.on('data', (chunk) => {
            downloaded += chunk.length;
            const progress = (downloaded / totalLength) * 100;
            process.stdout.write(`Progress: ${progress.toFixed(2)}%\r`);
        });

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`\nVideo berhasil didownload: ${filePath}`);
                resolve({
                    filename: filename,
                    path: filePath,
                    size: totalLength,
                    quality: quality,
                    info: {
                        title: info.title,
                        uploader: info.uploader,
                        description: info.description,
                        uploadDate: info.uploadDate,
                        statistics: info.statistics
                    }
                });
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error("Error:", error.message);
        throw error;
    }
};

// Export semua fungsi dalam satu object
module.exports = {
    getFbVideoInfo,
    downloadFbVideo
};

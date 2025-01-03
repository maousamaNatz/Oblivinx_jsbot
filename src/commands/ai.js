// const axios = require("axios");
// require("dotenv").config();
// const DeepAI = require("../lib/deepai");
// global.Oblixn.cmd({
//   name: "gpt-4",
//   alias: ["openai", "chatgpt"],
//   desc: "Chat dengan AI",
//   category: "ai",
//   isAI: true,
//   async exec(msg, { args }) {
//     if (!args.length) return msg.reply("❌ Mohon masukkan pertanyaan!");

//     try {
//       const question = args.join(" ");

//       // Menggunakan endpoint dan API key dari .env
//       const response = await axios.post(
//         process.env.ENDPOINT_PROVIDER,
//         {
//           model: "gpt-4-0125-preview",
//           messages: [
//             {
//               role: "user",
//               content: question,
//             },
//           ],
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PROVIDER_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const answer = response.data.choices[0].message.content;
//       return msg.reply(`🤖 *AI Response:*\n\n${answer}`);
//     } catch (error) {
//       console.error("AI Error:", error.response?.data || error.message);

//       let errorMessage = "⚠️ Terjadi kesalahan saat berkomunikasi dengan AI.";

//       if (error.response?.status === 401) {
//         errorMessage = "⚠️ API key tidak valid atau expired.";
//       } else if (error.response?.status === 429) {
//         errorMessage = "⚠️ Limit API tercapai. Silakan coba lagi nanti.";
//       }

//       return msg.reply(errorMessage);
//     }
//   },
// });
// global.Oblixn.cmd({
//   name: "claudesonnet",
//   alias: ["openai", "chatgpt"],
//   desc: "Chat dengan AI",
//   category: "ai",
//   isAI: true,
//   async exec(msg, { args }) {
//     if (!args.length) return msg.reply("❌ Mohon masukkan pertanyaan!");

//     try {
//       const question = args.join(" ");

//       // Menggunakan endpoint dan API key dari .env
//       const response = await axios.post(
//         process.env.ENDPOINT_PROVIDER,
//         {
//           model: "claude-3.5-sonnet",
//           messages: [
//             {
//               role: "user",
//               content: question,
//             },
//           ],
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PROVIDER_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const answer = response.data.choices[0].message.content;
//       return msg.reply(`🤖 *AI Response:*\n\n${answer}`);
//     } catch (error) {
//       console.error("AI Error:", error.response?.data || error.message);

//       let errorMessage = "⚠️ Terjadi kesalahan saat berkomunikasi dengan AI.";

//       if (error.response?.status === 401) {
//         errorMessage = "⚠️ API key tidak valid atau expired.";
//       } else if (error.response?.status === 429) {
//         errorMessage = "⚠️ Limit API tercapai. Silakan coba lagi nanti.";
//       }

//       return msg.reply(errorMessage);
//     }
//   },
// });
// global.Oblixn.cmd({
//   name: "llama-3",
//   alias: ["openai", "chatgpt"],
//   desc: "Chat dengan AI",
//   category: "ai",
//   isAI: true,
//   async exec(msg, { args }) {
//     if (!args.length) return msg.reply("❌ Mohon masukkan pertanyaan!");

//     try {
//       const question = args.join(" ");

//       // Menggunakan endpoint dan API key dari .env
//       const response = await axios.post(
//         process.env.ENDPOINT_PROVIDER,
//         {
//           model: "llama-3.1-405b",
//           messages: [
//             {
//               role: "user",
//               content: question,
//             },
//           ],
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PROVIDER_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const answer = response.data.choices[0].message.content;
//       return msg.reply(`🤖 *AI Response:*\n\n${answer}`);
//     } catch (error) {
//       console.error("AI Error:", error.response?.data || error.message);

//       let errorMessage = "⚠️ Terjadi kesalahan saat berkomunikasi dengan AI.";

//       if (error.response?.status === 401) {
//         errorMessage = "⚠️ API key tidak valid atau expired.";
//       } else if (error.response?.status === 429) {
//         errorMessage = "⚠️ Limit API tercapai. Silakan coba lagi nanti.";
//       }

//       return msg.reply(errorMessage);
//     }
//   },
// });
// global.Oblixn.cmd({
//   name: "gpt-4o",
//   alias: ["openai", "chatgpt"],
//   desc: "Chat dengan AI",
//   category: "ai",
//   isAI: true,
//   async exec(msg, { args }) {
//     if (!args.length) return msg.reply("❌ Mohon masukkan pertanyaan!");

//     try {
//       const question = args.join(" ");

//       // Menggunakan endpoint dan API key dari .env
//       const response = await axios.post(
//         process.env.ENDPOINT_PROVIDER,
//         {
//           model: "gpt-4o-2024-11-20",
//           messages: [
//             {
//               role: "user",
//               content: question,
//             },
//           ],
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PROVIDER_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const answer = response.data.choices[0].message.content;
//       return msg.reply(`🤖 *AI Response:*\n\n${answer}`);
//     } catch (error) {
//       console.error("AI Error:", error.response?.data || error.message);

//       let errorMessage = "⚠️ Terjadi kesalahan saat berkomunikasi dengan AI.";

//       if (error.response?.status === 401) {
//         errorMessage = "⚠️ API key tidak valid atau expired.";
//       } else if (error.response?.status === 429) {
//         errorMessage = "⚠️ Limit API tercapai. Silakan coba lagi nanti.";
//       }

//       return msg.reply(errorMessage);
//     }
//   },
// });
// global.Oblixn.cmd({
//   name: "deepseek",
//   alias: ["openai", "chatgpt"],
//   desc: "Chat dengan AI",
//   category: "ai",
//   isAI: true,
//   async exec(msg, { args }) {
//     if (!args.length) return msg.reply("❌ Mohon masukkan pertanyaan!");

//     try {
//       const question = args.join(" ");

//       // Kirim pesan loading
//       const loadingMsg = await msg.reply("🤖 *Sedang memproses pertanyaan...*");

//       // Menggunakan endpoint dan API key dari .env
//       const response = await axios.post(
//         process.env.ENDPOINT_PROVIDER,
//         {
//           model: "@hf/thebloke/deepseek-coder-6.7b-instruct-awq",
//           messages: [
//             {
//               role: "user",
//               content: question,
//             },
//           ],
//           stream: false // Matikan streaming untuk menghindari error
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PROVIDER_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const answer = response.data.choices[0].message.content;
      
//       // Edit pesan loading dengan jawaban
//       await msg.sock.sendMessage(msg.chat, {
//         text: `🤖 *AI Response:*\n\n${answer}`,
//         edit: loadingMsg.key
//       });

//     } catch (error) {
//       console.error("AI Error:", error.response?.data || error.message);

//       let errorMessage = "⚠️ Terjadi kesalahan saat berkomunikasi dengan AI.";

//       if (error.response?.status === 401) {
//         errorMessage = "⚠️ API key tidak valid atau expired.";
//       } else if (error.response?.status === 429) {
//         errorMessage = "⚠️ Limit API tercapai. Silakan coba lagi nanti.";
//       } else if (error.response?.status === 403) {
//         errorMessage = "⚠️ Akses ke API diblokir. Mohon tunggu beberapa saat.";
//       }

//       return msg.reply(errorMessage);
//     }
//   },
// });
// global.Oblixn.cmd({
//   name: "gemini-1.5",
//   alias: ["openai", "chatgpt"],
//   desc: "Chat dengan AI",
//   category: "ai",
//   isAI: true,
//   async exec(msg, { args }) {
//     if (!args.length) return msg.reply("❌ Mohon masukkan pertanyaan!");

//     try {
//       const question = args.join(" ");

//       // Menggunakan endpoint dan API key dari .env
//       const response = await axios.post(
//         process.env.ENDPOINT_PROVIDER,
//         {
//           model: "gemini-1.5-flash",
//           messages: [
//             {
//               role: "user",
//               content: question,
//             },
//           ],
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PROVIDER_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const answer = response.data.choices[0].message.content;
//       return msg.reply(`🤖 *AI Response:*\n\n${answer}`);
//     } catch (error) {
//       console.error("AI Error:", error.response?.data || error.message);

//       let errorMessage = "⚠️ Terjadi kesalahan saat berkomunikasi dengan AI.";

//       if (error.response?.status === 401) {
//         errorMessage = "⚠️ API key tidak valid atau expired.";
//       } else if (error.response?.status === 429) {
//         errorMessage = "⚠️ Limit API tercapai. Silakan coba lagi nanti.";
//       }

//       return msg.reply(errorMessage);
//     }
//   },
// });
// global.Oblixn.cmd({
//   name: "txt2img",
//   alias: ["text2img", "ai2img", "img"],
//   desc: "Membuat gambar dari teks menggunakan DeepAI",
//   category: "ai",
//   isAI: true,
//   async exec(msg, { args }) {
//     if (!args.length) return msg.reply("❌ Mohon masukkan deskripsi gambar!");

//     try {
//       const prompt = args.join(" ");
//       const deepaiInstance = new DeepAI();
      
//       // Kirim pesan loading
//       const loadingMsg = await msg.reply("🎨 *Sedang membuat gambar...*");

//       // Gunakan method art dari class DeepAI
//       const imageUrl = await deepaiInstance.art(prompt, 768, 768);
      
//       // Download gambar
//       const imageResponse = await axios.get(imageUrl, { 
//         responseType: 'arraybuffer',
//         timeout: 60000
//       });

//       // Kirim gambar
//       await msg.sock.sendMessage(msg.chat, {
//         image: Buffer.from(imageResponse.data),
//         caption: `🖼️ *Prompt:* ${prompt}`,
//         edit: loadingMsg.key
//       });

//     } catch (error) {
//       console.error("DeepAI Error:", error.message);
      
//       let errorMessage = "⚠️ Terjadi kesalahan saat membuat gambar.";
      
//       if (error.response) {
//         if (error.response.status === 401) {
//           errorMessage = "⚠️ Gagal mengautentikasi request. Silakan coba lagi.";
//         } else if (error.response.status === 429) {
//           errorMessage = "⚠️ Terlalu banyak request. Silakan coba lagi nanti.";
//         } else if (error.response.status === 403) {
//           errorMessage = "⚠️ Akses ditolak. Mungkin perlu menunggu beberapa saat.";
//         }
//       }
      
//       return msg.reply(errorMessage);
//     }
//   },
// });
// global.Oblixn.cmd({
//   name: "natz-o1",
//   alias: ["openai", "chatgpt"],
//   desc: "Chat dengan AI",
//   category: "ai",
//   isAI: true,
//   async exec(msg, { args }) {
//     if (!args.length) return msg.reply("❌ Mohon masukkan pertanyaan!");

//     try {
//       const question = args.join(" ");
//       const systemMessage = `
//       Saya adalah Oblivinx-o1, bot yang dikembangkan oleh Natz, siswa SMK dan pendiri OBLIVINX company. 
//       Bot ini dirancang untuk bisnis automation, pengelolaan grup WhatsApp, dan komunitas Discord. 
//       Saya bangga menjadi produk dari OBLIVINX dan menjawab sesuai nilai-nilai Natz.
//     `;
//       // Menggunakan endpoint dan API key dari .env
//       const response = await axios.post(
//         process.env.ENDPOINT_PROVIDER,
//         {
//           model: "gpt-4-0125-preview",
//           messages: [
//             { role: "system", content: systemMessage },
//             { role: "user", content: question },
//           ],
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PROVIDER_API_KEY}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const answer = response.data.choices[0].message.content;
//       return msg.reply(`🤖 *AI Response:*\n\n${answer}`);
//     } catch (error) {
//       console.error("AI Error:", error.response?.data || error.message);

//       let errorMessage = "⚠️ Terjadi kesalahan saat berkomunikasi dengan AI.";

//       if (error.response?.status === 401) {
//         errorMessage = "⚠️ API key tidak valid atau expired.";
//       } else if (error.response?.status === 429) {
//         errorMessage = "⚠️ Limit API tercapai. Silakan coba lagi nanti.";
//       }

//       return msg.reply(errorMessage);
//     }
//   },
// });
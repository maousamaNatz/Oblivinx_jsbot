// const fs = require('fs');
// const path = require('path');

// // Command turn on bot
// Oblixn.cmd({
//   name: "boton",
//   alias: ["turnon", "hidupkan"],
//   desc: "Menghidupkan bot",
//   category: "ownerCommand",
//   async exec(msg) {
//     try {
//       // Debug log
//       console.log("[DEBUG] Sender:", msg.sender);
//       console.log("[DEBUG] isOwner:", Oblixn.isOwner(msg.sender));

//       if (!Oblixn.isOwner(msg.sender)) {
//         return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
//       }

//       // Set status
//       Oblixn.isOffline = false;

//       // Kirim pesan berhasil
//       await msg.reply("✅ Bot berhasil diaktifkan!");
//     } catch (error) {
//       console.error("[ERROR] Boton command error:", error);
//       await msg.reply("❌ Terjadi kesalahan saat mengaktifkan bot");
//     }
//   },
// });

// // Command turn off bot
// Oblixn.cmd({
//   name: "botoff",
//   alias: ["turnoff", "matikan"],
//   desc: "Menonaktifkan bot sementara",
//   category: "ownerCommand",
//   async exec(msg) {
//     try {
//       // Debug log
//       console.log("[DEBUG] Sender:", msg.sender);
//       console.log("[DEBUG] isOwner:", Oblixn.isOwner(msg.sender));

//       if (!Oblixn.isOwner(msg.sender)) {
//         return msg.reply("⚠️ Perintah ini hanya untuk owner bot!");
//       }

//       // Set status
//       Oblixn.isOffline = true;

//       // Kirim pesan berhasil
//       await msg.reply("✅ Bot berhasil dinonaktifkan!");
//     } catch (error) {
//       console.error("[ERROR] Botoff command error:", error);
//       await msg.reply("❌ Terjadi kesalahan saat menonaktifkan bot");
//     }
//   },
// });

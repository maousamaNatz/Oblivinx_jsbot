const { config } = require("../../config/config");
// const { RPGEngine } = require("../lib/RPGengine");
const { botlogger } = require("../utils/logger");
const fs = require("fs");

// Buat logger sederhana
const logger = {
  info: (msg) => console.log(`[RPG-CMD-INFO] ${msg}`),
  warn: (msg) => console.warn(`[RPG-CMD-WARN] ${msg}`),
  error: (msg) => console.error(`[RPG-CMD-ERROR] ${msg}`),
  debug: (msg) => console.debug(`[RPG-CMD-DEBUG] ${msg}`),
};

// Inisialisasi RPG Engine sebagai singleton
if (!global.rpgEngine) {
  global.rpgEngine = {
    async loadPlayerDataFile() {
      try {
        // Cek apakah file ada
        const filePath = "./database/rpg/players.json";
        if (!fs.existsSync(filePath)) {
          // Buat file baru jika belum ada
          await fs.writeFileSync(filePath, JSON.stringify({ players: {} }));
        }
        return JSON.parse(fs.readFileSync(filePath));
      } catch (error) {
        logger.error("Error loading player data:", error);
        throw new Error("Gagal memuat data pemain");
      }
    },

    async createPlayer(sender, className) {
      try {
        const playerData = await this.loadPlayerDataFile();

        // Template player baru
        const newPlayer = {
          class: className,
          level: 1,
          exp: 0,
          stats: {
            maxHp: 100,
            maxMp: 50,
            attack: 10,
            defense: 5,
          },
          currencies: {
            gold: 100,
            gems: 0,
          },
          reputation: {
            pvp: 0,
            guild: 0,
            trading: 0,
          },
        };

        playerData.players[sender] = newPlayer;

        // Simpan ke file
        await fs.writeFileSync(
          "./database/rpg/players.json",
          JSON.stringify(playerData, null, 2)
        );

        return newPlayer;
      } catch (error) {
        logger.error("Error creating player:", error);
        throw new Error("Gagal membuat karakter baru");
      }
    },
  };
}

// Tambahkan fungsi helper untuk mengecek status game
function isGameActive(from) {
  return global.games && global.games[from];
}

function getActiveGameName(from) {
  return global.games?.[from]?.type || null;
}

// Game Tebak Gambar
Oblixn.cmd({
  name: "tebakgambar",
  desc: "Game tebak gambar",
  category: "games",
  async exec(msg, args) {
    try {
      const { from, reply } = msg;

      // Cek apakah ada game yang sedang aktif
      const activeGame = getActiveGameName(from);
      if (activeGame) {
        return reply(
          `⚠️ Masih ada game ${activeGame} yang sedang berlangsung.\nSilahkan selesaikan atau tunggu timeout.`
        );
      }

      // Cek apakah data game tersedia
      if (!config.gameData?.tebakGambar?.data) {
        return reply("Maaf, data game tidak tersedia");
      }

      const gameData = config.gameData.tebakGambar.data;
      const puzzle = gameData[Math.floor(Math.random() * gameData.length)];

      if (!puzzle) {
        return reply("Maaf, terjadi kesalahan mengambil data puzzle");
      }

      global.games = global.games || {};
      global.games[from] = {
        type: "tebakgambar",
        answer: puzzle.answer.toLowerCase(),
        hint: puzzle.hint,
      };

      // Kirim gambar dan hint
      await sock.sendImage(
        from,
        puzzle.url,
        `🎯 TEBAK GAMBAR\n\nHint: ${puzzle.hint}\n\nWaktu: 30 detik`
      );

      // Set timer
      setTimeout(() => {
        if (global.games[from]?.type === "tebakgambar") {
          reply(`⏰ Waktu habis!\nJawaban yang benar adalah: ${puzzle.answer}`);
          delete global.games[from];
        }
      }, 30000);
    } catch (error) {
      console.error("Error in tebakgambar:", error);
      return msg.reply("Terjadi kesalahan saat menjalankan game");
    }
  },
});

// Game Tebak Kata
Oblixn.cmd({
  name: "tebakkata",
  desc: "Game tebak kata",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;

    // Cek status game aktif
    const activeGame = getActiveGameName(from);
    if (activeGame) {
      return reply(
        `⚠️ Masih ada game ${activeGame} yang sedang berlangsung.\nSilahkan selesaikan atau tunggu timeout.`
      );
    }

    const word =
      config.gameData.tebakKata[
        Math.floor(Math.random() * config.gameData.tebakKata.length)
      ];

    global.games[from] = {
      type: "tebakkata",
      answer: word.answer,
      hint: word.hint,
    };

    return reply(`🎯 TEBAK KATA\n\nHint: ${word.hint}\n\nWaktu: 30 detik`);
  },
});

// Game Trivia
Oblixn.cmd({
  name: "trivia",
  alias: ["kuis"],
  desc: "Game kuis pengetahuan umum",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const quiz =
      config.gameData.trivia[
        Math.floor(Math.random() * config.gameData.trivia.length)
      ];

    const options = quiz.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");

    global.games[from] = {
      type: "trivia",
      answer: quiz.answer,
    };

    return reply(
      `📝 TRIVIA: ${quiz.category}\n\n${quiz.question}\n\n${options}`
    );
  },
});

// 4. Puzzle Logika
Oblixn.cmd({
  name: "puzzle",
  alias: ["riddle"],
  desc: "Game teka-teki logika",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const puzzle =
      config.gameData.puzzleLogika[
        Math.floor(Math.random() * config.gameData.puzzleLogika.length)
      ];

    global.games[from] = {
      type: "puzzle",
      answer: puzzle.answer,
    };

    return reply(
      `🧩 PUZZLE LOGIKA 🧩\n\n${puzzle.question}\n\nHint: ${puzzle.hint}`
    );
  },
});

// 5. Tebak Lagu
Oblixn.cmd({
  name: "tebaklagu",
  alias: ["tl"],
  desc: "Game tebak judul lagu",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const song =
      config.gameData.tebakLagu[
        Math.floor(Math.random() * config.gameData.tebakLagu.length)
      ];

    global.games[from] = {
      type: "tebaklagu",
      answer: song.title,
      artist: song.artist,
    };

    return reply({
      audio: { url: song.audioUrl },
      caption: `🎵 TEBAK LAGU 🎵\n\nTebak judul lagu ini!\nPetunjuk: ${song.hints[0]}`,
    });
  },
});

// 6. Siapa Aku
Oblixn.cmd({
  name: "siapaaku",
  desc: "Game tebak tokoh",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const character =
      config.gameData.siapaAku[
        Math.floor(Math.random() * config.gameData.siapaAku.length)
      ];

    global.games[from] = {
      type: "siapaaku",
      answer: character.answer,
      hints: character.hints,
      currentHint: 0,
    };

    return reply(
      `👤 SIAPA AKU?\n\nPetunjuk 1: ${character.hints[0]}\n\nKetik "hint" untuk petunjuk selanjutnya`
    );
  },
});

// 7. Tebak Emoji
Oblixn.cmd({
  name: "tebakemoji",
  alias: ["te"],
  desc: "Game tebak dari emoji",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const emoji =
      config.gameData.tebakEmoji[
        Math.floor(Math.random() * config.gameData.tebakEmoji.length)
      ];

    global.games[from] = {
      type: "tebakemoji",
      answer: emoji.answer,
    };

    return reply(
      `😀 TEBAK EMOJI 😀\n\nTebak apa yang digambarkan emoji ini:\n${emoji.emojis}\n\nKategori: ${emoji.category}`
    );
  },
});

// 8. Kuis 20 Pertanyaan
Oblixn.cmd({
  name: "20pertanyaan",
  alias: ["20q"],
  desc: "Game tebak dengan 20 pertanyaan",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const object =
      config.gameData.duaPuluhPertanyaan[
        Math.floor(Math.random() * config.gameData.duaPuluhPertanyaan.length)
      ];

    global.games[from] = {
      type: "20pertanyaan",
      answer: object.name,
      category: object.category,
      questionsLeft: 20,
    };

    return reply(
      `🤔 20 PERTANYAAN 🤔\n\nAku sudah memikirkan sesuatu dari kategori: ${object.category}\nKamu punya 20 pertanyaan yang hanya bisa dijawab dengan Ya/Tidak\n\nMulai bertanya!`
    );
  },
});

// 9. Truth or Dare
Oblixn.cmd({
  name: "tod",
  alias: ["truthordare"],
  desc: "Game truth or dare",
  category: "games",
  async exec(msg, args) {
    const choice = args[0]?.toLowerCase();
    if (!choice || !["truth", "dare"].includes(choice)) {
      return msg.reply('Pilih "truth" atau "dare"!');
    }

    const questions = config.gameData.tod[choice];
    const random = questions[Math.floor(Math.random() * questions.length)];
    return msg.reply(`${choice.toUpperCase()}: ${random}`);
  },
});

// 10. Hangman
Oblixn.cmd({
  name: "hangman",
  alias: ["tebakkata"],
  desc: "Game tebak kata hangman",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const word =
      config.gameData.hangman[
        Math.floor(Math.random() * config.gameData.hangman.length)
      ];

    global.games[from] = {
      type: "hangman",
      answer: word.word,
      hint: word.hint,
      guessed: [],
      lives: 6,
      display: word.word.replace(/[A-Za-z]/g, "_"),
    };

    return reply(
      `🎯 HANGMAN 🎯\n\nKata: ${global.games[from].display}\nPetunjuk: ${word.hint}\nNyawa: ❤️❤️❤️❤️❤️❤️\n\nTebak huruf atau langsung jawab!`
    );
  },
});
// 11. Tebak Angka
Oblixn.cmd({
  name: "tebakangka",
  alias: ["ta"],
  desc: "Game tebak angka dengan petunjuk",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const number = Math.floor(Math.random() * 100) + 1;

    global.games[from] = {
      type: "tebakangka",
      answer: number,
      attempts: 0,
    };

    return reply(
      '🔢 TEBAK ANGKA 🔢\n\nAku sudah memilih angka 1-100\nCoba tebak! Aku akan memberi petunjuk "lebih besar" atau "lebih kecil"'
    );
  },
});

// 12. Quiz Harian
Oblixn.cmd({
  name: "quizharian",
  alias: ["qh"],
  desc: "Quiz harian dengan skor",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const today = new Date().toDateString();
    const quiz =
      config.gameData.quizHarian[today] ||
      config.gameData.quizHarian[
        Math.floor(Math.random() * config.gameData.quizHarian.length)
      ];

    global.games[from] = {
      type: "quizharian",
      answer: quiz.answer,
      points: quiz.points,
    };

    return reply(
      `📅 QUIZ HARIAN 📅\n\n${quiz.question}\n\nPoin: ${quiz.points}`
    );
  },
});

// 13. Tebak Film
Oblixn.cmd({
  name: "tebakfilm",
  alias: ["tf"],
  desc: "Game tebak judul film",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const film =
      config.gameData.tebakFilm[
        Math.floor(Math.random() * config.gameData.tebakFilm.length)
      ];

    global.games[from] = {
      type: "tebakfilm",
      answer: film.title,
    };

    return reply({
      image: { url: film.posterUrl },
      caption: `🎬 TEBAK FILM 🎬\n\nPetunjuk: ${film.hint}\nTahun: ${film.year}`,
    });
  },
});

// 14. Permainan Matematika
Oblixn.cmd({
  name: "matika",
  alias: ["math"],
  desc: "Game matematika cepat",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const operators = ["+", "-", "*"];
    const op = operators[Math.floor(Math.random() * operators.length)];
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;

    const answer = eval(`${num1}${op}${num2}`);

    global.games[from] = {
      type: "matika",
      answer: answer,
      startTime: Date.now(),
    };

    return reply(
      `🔢 MATEMATIKA CEPAT 🔢\n\n${num1} ${op} ${num2} = ?\n\nWaktu: 15 detik`
    );
  },
});

// 15. Tebak Warna
Oblixn.cmd({
  name: "tebakwarna",
  alias: ["tw"],
  desc: "Game tebak warna teks",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const warna =
      config.gameData.tebakWarna[
        Math.floor(Math.random() * config.gameData.tebakWarna.length)
      ];

    global.games[from] = {
      type: "tebakwarna",
      answer: warna.realColor,
    };

    return reply(
      `🎨 TEBAK WARNA 🎨\n\nWarna teks: ${warna.displayText}\nWarna font: ${warna.fontColor}\n\nKetik warna yang benar!`
    );
  },
});

// 16. Pilihan Ganda
Oblixn.cmd({
  name: "pilihanganda",
  alias: ["pg"],
  desc: "Kuis pilihan ganda",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const soal =
      config.gameData.pilihanGanda[
        Math.floor(Math.random() * config.gameData.pilihanGanda.length)
      ];

    const options = soal.options
      .map((opt, i) => `${["A", "B", "C", "D"][i]}. ${opt}`)
      .join("\n");

    global.games[from] = {
      type: "pilihanganda",
      answer: soal.answer,
    };

    return reply(`📝 PILIHAN GANDA 📝\n\n${soal.question}\n\n${options}`);
  },
});

// 17. Mafia Bot
Oblixn.cmd({
  name: "mafia",
  alias: ["mafiabot"],
  desc: "Game mafia dalam grup",
  category: "games",
  async exec(msg, args) {
    const { from, reply, groupMetadata } = msg;

    if (!msg.isGroup) return reply("Game ini hanya bisa dimainkan dalam grup!");
    if (groupMetadata.participants.length < 5)
      return reply("Minimal 5 pemain untuk memulai game!");

    const command = args[0]?.toLowerCase();

    if (command === "start") {
      // Mulai game baru
      const players = groupMetadata.participants
        .filter((p) => !p.isBot)
        .map((p) => ({
          id: p.id,
          role: null,
        }));

      // Assign roles
      const roles = [
        "mafia",
        "detective",
        "doctor",
        ...Array(players.length - 3).fill("citizen"),
      ];
      players.forEach((p) => {
        const randomRole = roles.splice(
          Math.floor(Math.random() * roles.length),
          1
        )[0];
        p.role = randomRole;
      });

      global.games[from] = {
        type: "mafia",
        phase: "night",
        players: players,
        alive: [...players],
        votes: {},
      };

      // DM each player their role
      players.forEach((p) => {
        Oblixn.sendMessage(p.id, { text: `Peran kamu: ${p.role}` });
      });

      return reply(
        "🕵️ MAFIA GAME 🕵️\n\nGame dimulai! Cek DM untuk melihat peran kamu\nMalam hari dimulai..."
      );
    }

    return reply(
      `🕵️ MAFIA COMMANDS 🕵️\n\n• mafia start - Mulai game baru\n• mafia vote @user - Vote player\n• mafia players - Lihat pemain yang masih hidup`
    );
  },
});

// 18. Chat Petualangan
Oblixn.cmd({
  name: "petualangan",
  alias: ["adventure"],
  desc: "Game petualangan berbasis cerita",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;

    // Ambil scene acak dari data petualangan
    const scenes = config.gameData.petualangan.scenes;
    const currentScene = scenes[0]; // Mulai dari scene pertama

    global.games[from] = {
      type: "petualangan",
      currentScene: currentScene.id,
      inventory: [],
    };

    return reply(
      `🗺️ PETUALANGAN 🗺️\n\n${
        currentScene.description
      }\n\nPilihan:\n${currentScene.options
        .map((opt, i) => `${i + 1}. ${opt.text}`)
        .join("\n")}`
    );
  },
});

// 19. Tebak Lokasi
Oblixn.cmd({
  name: "tebaklokasi",
  alias: ["tl"],
  desc: "Game tebak lokasi terkenal",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const location =
      config.gameData.tebakLokasi[
        Math.floor(Math.random() * config.gameData.tebakLokasi.length)
      ];

    global.games[from] = {
      type: "tebaklokasi",
      answer: location.name,
    };

    return reply({
      image: { url: location.imageUrl },
      caption: `🗺️ TEBAK LOKASI 🗺️\n\nPetunjuk: ${location.hint}\nBenua: ${location.continent}`,
    });
  },
});

// 20. Kuis Bahasa
Oblixn.cmd({
  name: "kuisbahasa",
  alias: ["kb"],
  desc: "Kuis tentang bahasa Indonesia",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const quiz =
      config.gameData.kuisBahasa[
        Math.floor(Math.random() * config.gameData.kuisBahasa.length)
      ];

    global.games[from] = {
      type: "kuisbahasa",
      answer: quiz.answer,
      timeout: setTimeout(() => {
        reply(`Waktu habis! Jawaban yang benar adalah: ${quiz.answer}`);
        delete global.games[from];
      }, 60000),
    };

    return reply(
      `📚 KUIS BAHASA 📚\n\n${quiz.question}\n\nA. ${quiz.options[0]}\nB. ${quiz.options[1]}\nC. ${quiz.options[2]}\nD. ${quiz.options[3]}`
    );
  },
});

// 21. Game Memori
Oblixn.cmd({
  name: "memori",
  alias: ["memory"],
  desc: "Game mengingat urutan",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const sequence = Array(5)
      .fill()
      .map(() => Math.floor(Math.random() * 9) + 1);

    global.games[from] = {
      type: "memori",
      answer: sequence.join(""),
      timeout: setTimeout(() => {
        reply("Sekarang ketik urutan angka yang tadi muncul!");
      }, 5000),
    };

    return reply(
      `🧠 GAME MEMORI 🧠\n\nIngat urutan angka ini dalam 5 detik!\n\n${sequence.join(
        " "
      )}`
    );
  },
});

// 22. Simon Says
Oblixn.cmd({
  name: "simon",
  alias: ["simonsays"],
  desc: "Game Simon Says",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const command =
      config.gameData.simonSays[
        Math.floor(Math.random() * config.gameData.simonSays.length)
      ];
    const isSimonSays = Math.random() < 0.5;

    global.games[from] = {
      type: "simon",
      shouldDo: isSimonSays,
      command: command,
    };

    return reply(
      `🎮 SIMON SAYS 🎮\n\n${
        isSimonSays ? "Simon says: " : ""
      }${command}\n\nKetik "done" jika sudah melakukan, "skip" jika tidak`
    );
  },
});

// 23. Tebak Zodiak
Oblixn.cmd({
  name: "tebakzodiak",
  alias: ["tz"],
  desc: "Game tebak zodiak dari ciri-ciri",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const zodiak =
      config.gameData.tebakZodiak[
        Math.floor(Math.random() * config.gameData.tebakZodiak.length)
      ];

    global.games[from] = {
      type: "tebakzodiak",
      answer: zodiak.name,
    };

    return reply(
      `⭐ TEBAK ZODIAK ⭐\n\nCiri-ciri:\n${zodiak.traits.join("\n")}`
    );
  },
});

// 24. Game Cepat Teks
Oblixn.cmd({
  name: "ketik",
  alias: ["typingrace"],
  desc: "Game mengetik cepat",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const text =
      config.gameData.typingGame[
        Math.floor(Math.random() * config.gameData.typingGame.length)
      ];

    global.games[from] = {
      type: "ketik",
      answer: text,
      startTime: Date.now(),
    };

    return reply(
      `⌨️ TYPING RACE ⌨️\n\nKetik kalimat ini secepat mungkin:\n\n"${text}"`
    );
  },
});

// 25. Tebak Sumber Meme
Oblixn.cmd({
  name: "tebakmeme",
  alias: ["tm"],
  desc: "Game tebak sumber meme",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const meme =
      config.gameData.tebakMeme[
        Math.floor(Math.random() * config.gameData.tebakMeme.length)
      ];

    global.games[from] = {
      type: "tebakmeme",
      answer: meme.source,
    };

    return reply({
      image: { url: meme.imageUrl },
      caption: `😂 TEBAK MEME 😂\n\nDari mana asal meme ini?\nPetunjuk: ${meme.hint}`,
    });
  },
});

// 26. Story Builder
Oblixn.cmd({
  name: "storybuilder",
  alias: ["sb"],
  desc: "Game membangun cerita bersama",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const starter =
      config.gameData.storyStarters[
        Math.floor(Math.random() * config.gameData.storyStarters.length)
      ];

    global.games[from] = {
      type: "storybuilder",
      story: [starter],
      currentTurn: 0,
      maxTurns: 10,
    };

    return reply(
      `📝 STORY BUILDER 📝\n\nMari buat cerita bersama!\nKalimat pertama:\n"${starter}"\n\nLanjutkan dengan satu kalimat!`
    );
  },
});

// 27. Tebak Suara
Oblixn.cmd({
  name: "tebaksuara",
  alias: ["ts"],
  desc: "Game tebak suara/efek suara",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const sound =
      config.gameData.tebakSuara[
        Math.floor(Math.random() * config.gameData.tebakSuara.length)
      ];

    global.games[from] = {
      type: "tebaksuara",
      answer: sound.name,
    };

    return reply({
      audio: { url: sound.audioUrl },
      caption: `🔊 TEBAK SUARA 🔊\n\nSuara apakah ini?\nKategori: ${sound.category}`,
    });
  },
});

// 28. Tebak Karakter
Oblixn.cmd({
  name: "tebakkarakter",
  alias: ["tk"],
  desc: "Game tebak karakter dari dialog/ciri",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const character =
      config.gameData.tebakKarakter[
        Math.floor(Math.random() * config.gameData.tebakKarakter.length)
      ];

    global.games[from] = {
      type: "tebakkarakter",
      answer: character.name,
    };

    return reply(
      `👥 TEBAK KARAKTER 👥\n\nDialog:\n"${character.quote}"\n\nDari: ${character.from}`
    );
  },
});

// 29. Kartu Virtual
Oblixn.cmd({
  name: "kartu",
  alias: ["card"],
  desc: "Game kartu virtual",
  category: "games",
  async exec(msg, args) {
    const { from, reply, groupMetadata } = msg;

    if (!msg.isGroup) return reply("Game ini hanya bisa dimainkan dalam grup!");

    const command = args[0]?.toLowerCase();
    const gameType = args[1]?.toLowerCase();

    if (command === "start") {
      if (!gameType || !["uno", "21"].includes(gameType)) {
        return reply("Pilih jenis permainan: uno/21");
      }

      const players = groupMetadata.participants
        .filter((p) => !p.isBot)
        .map((p) => ({
          id: p.id,
          cards: [],
        }));

      global.games[from] = {
        type: "kartu",
        gameType: gameType,
        players: players,
        currentTurn: 0,
        deck: config.gameData.cardGames[gameType].createDeck(),
      };

      // Deal initial cards
      players.forEach((p) => {
        p.cards = global.games[from].deck.splice(0, gameType === "uno" ? 7 : 2);
        Oblixn.sendMessage(p.id, { text: `Kartu kamu: ${p.cards.join(", ")}` });
      });

      return reply(
        `🃏 GAME KARTU: ${gameType.toUpperCase()} 🃏\n\nGame dimulai! Cek DM untuk melihat kartu kamu`
      );
    }

    return reply(
      `🃏 KARTU COMMANDS 🃏\n\n• kartu start <uno/21> - Mulai game\n• kartu draw - Ambil kartu\n• kartu play <kartu> - Mainkan kartu`
    );
  },
});

// 30. Lelang Virtual
Oblixn.cmd({
  name: "lelang",
  alias: ["auction"],
  desc: "Game lelang barang virtual",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const command = args[0]?.toLowerCase();

    if (command === "start") {
      const item =
        config.gameData.auctionItems[
          Math.floor(Math.random() * config.gameData.auctionItems.length)
        ];

      global.games[from] = {
        type: "lelang",
        item: item,
        currentBid: item.startPrice,
        highestBidder: null,
        timeout: setTimeout(() => {
          const game = global.games[from];
          if (game.highestBidder) {
            reply(
              `🔨 LELANG SELESAI 🔨\n\n${item.name} terjual kepada @${game.highestBidder} dengan harga ${game.currentBid} poin!`
            );
          } else {
            reply("Lelang selesai tanpa ada yang membeli.");
          }
          delete global.games[from];
        }, 300000),
      };

      return reply(
        `🔨 LELANG VIRTUAL 🔨\n\nItem: ${item.name}\nDeskripsi: ${item.description}\nHarga awal: ${item.startPrice} poin\n\nKetik "bid <jumlah>" untuk menawar!`
      );
    }

    return reply(
      `🔨 LELANG COMMANDS 🔨\n\n• lelang start - Mulai lelang baru\n• bid <jumlah> - Tawar dengan jumlah poin`
    );
  },
});

// 31. Game Harta Karun
Oblixn.cmd({
  name: "hartakarun",
  alias: ["treasure"],
  desc: "Game mencari harta karun",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const treasure =
      config.gameData.treasureHunt[
        Math.floor(Math.random() * config.gameData.treasureHunt.length)
      ];

    global.games[from] = {
      type: "hartakarun",
      location: treasure.location,
      clues: treasure.clues,
      currentClue: 0,
      found: false,
    };

    return reply(
      `🗺️ BERBURU HARTA KARUN 🗺️\n\nPetunjuk #1:\n${treasure.clues[0]}\n\nKetik "cari <lokasi>" untuk menebak!`
    );
  },
});

// 32. Tebak Harga
Oblixn.cmd({
  name: "tebakharga",
  alias: ["th"],
  desc: "Game tebak harga barang",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const item =
      config.gameData.tebakHarga[
        Math.floor(Math.random() * config.gameData.tebakHarga.length)
      ];

    global.games[from] = {
      type: "tebakharga",
      answer: item.price,
      tolerance: item.price * 0.1, // 10% tolerance
    };

    return reply({
      image: { url: item.imageUrl },
      caption: `💰 TEBAK HARGA 💰\n\nBerapa harga ${item.name} ini?\nKategori: ${item.category}`,
    });
  },
});

// 33. Game 2D Dungeon
Oblixn.cmd({
  name: "dungeon",
  alias: ["rpg"],
  desc: "Game petualangan dungeon",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const dungeon =
      config.gameData.dungeons[
        Math.floor(Math.random() * config.gameData.dungeons.length)
      ];

    global.games[from] = {
      type: "dungeon",
      map: dungeon.map,
      player: { x: 0, y: 0, hp: 100, items: [] },
      enemies: dungeon.enemies,
      items: dungeon.items,
    };

    return reply(
      `🗡️ DUNGEON EXPLORER 🗡️\n\n${renderMap(
        dungeon.map
      )}\n\nGunakan command:\n• move <arah>\n• attack\n• use <item>`
    );
  },
});

// 34. Tebak Fakta
Oblixn.cmd({
  name: "tebakfakta",
  alias: ["tf"],
  desc: "Game tebak fakta benar/salah",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const fact =
      config.gameData.tebakFakta[
        Math.floor(Math.random() * config.gameData.tebakFakta.length)
      ];

    global.games[from] = {
      type: "tebakfakta",
      answer: fact.isTrue,
    };

    return reply(
      `❓ TEBAK FAKTA ❓\n\n${fact.statement}\n\nApakah ini benar atau salah?`
    );
  },
});

// 35. Kuis Kepribadian
Oblixn.cmd({
  name: "kuiskepribadian",
  alias: ["personality"],
  desc: "Kuis untuk menentukan kepribadian",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const quiz = config.gameData.personalityQuiz;

    global.games[from] = {
      type: "kuiskepribadian",
      currentQuestion: 0,
      answers: [],
      questions: quiz.questions,
    };

    return reply(
      `🎭 KUIS KEPRIBADIAN 🎭\n\nPertanyaan #1:\n${
        quiz.questions[0].question
      }\n\n${quiz.questions[0].options
        .map((opt, i) => `${i + 1}. ${opt}`)
        .join("\n")}`
    );
  },
});

// Game Memory
Oblixn.cmd({
  name: "gamememory",
  alias: ["memory"],
  desc: "Game mengingat pola",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const game =
      config.gameData.gameMemory[
        Math.floor(Math.random() * config.gameData.gameMemory.length)
      ];

    global.games[from] = {
      type: "gamememory",
      pattern: game.pattern,
      timeout: setTimeout(() => {
        reply(`Waktu habis! Pola yang benar adalah: ${game.pattern}`);
        delete global.games[from];
      }, 30000),
    };

    return reply(
      `🧠 GAME MEMORY 🧠\n\nIngat pola berikut dalam 5 detik:\n${game.pattern}\n\n*Pola akan hilang dalam 5 detik...*`
    );
  },
});

// Game Mafia
Oblixn.cmd({
  name: "mafia",
  desc: "Game roleplay mafia",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const roles = config.gameData.mafia.roles;

    global.games[from] = {
      type: "mafia",
      phase: "night",
      players: {},
      alive: [],
    };

    return reply(
      `🎭 MAFIA GAME 🎭\n\nGame akan dimulai!\nKetik !join untuk bergabung\nMinimal pemain: 4\nMaksimal pemain: 8\n\nRole yang tersedia:\n${roles
        .map((r) => `• ${r.name}: ${r.description}`)
        .join("\n")}`
    );
  },
});

// Game Matematika
Oblixn.cmd({
  name: "matematika",
  alias: ["math"],
  desc: "Game perhitungan matematika",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;
    const problem =
      config.gameData.matematika[
        Math.floor(Math.random() * config.gameData.matematika.length)
      ];

    global.games[from] = {
      type: "matematika",
      answer: problem.answer,
      timeout: setTimeout(() => {
        reply(`Waktu habis! Jawaban yang benar adalah: ${problem.answer}`);
        delete global.games[from];
      }, 30000),
    };

    return reply(`🔢 MATEMATIKA 🔢\n\n${problem.question}\n\nWaktu: 30 detik`);
  },
});

// Game Petualangan
Oblixn.cmd({
  name: "petualangan",
  alias: ["adventure"],
  desc: "Game petualangan interaktif",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;

    // Ambil scene acak dari data petualangan
    const scenes = config.gameData.petualangan.scenes;
    const currentScene = scenes[0]; // Mulai dari scene pertama

    global.games[from] = {
      type: "petualangan",
      currentScene: currentScene.id,
      inventory: [],
    };

    return reply(
      `🗺️ PETUALANGAN 🗺️\n\n${
        currentScene.description
      }\n\nPilihan:\n${currentScene.options
        .map((opt, i) => `${i + 1}. ${opt.text}`)
        .join("\n")}`
    );
  },
});

// Tambahkan command untuk membatalkan game yang sedang berjalan (opsional)
Oblixn.cmd({
  name: "cancelgame",
  desc: "Batalkan game yang sedang berjalan",
  category: "games",
  async exec(msg, args) {
    const { from, reply } = msg;

    if (!isGameActive(from)) {
      return reply("❌ Tidak ada game yang sedang berlangsung.");
    }

    const gameName = getActiveGameName(from);
    delete global.games[from];
    return reply(`✅ Game ${gameName} telah dibatalkan.`);
  },
});

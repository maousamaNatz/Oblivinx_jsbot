const AIService = require('../service/AI');

Oblixn.cmd({
    name: 'ai',
    alias: ['ask', 'bot'],
    desc: 'Berinteraksi dengan AI Assistant',
    category: 'ai',
    async exec(m, t) {
        try {
            // Jika tidak ada pesan yang diberikan
            if (!t.args.length) {
                return m.reply(`🤖 *AI Assistant Commands*

▢ !ai <pertanyaan>
   Contoh: !ai Apa itu JavaScript?

▢ !ai natz <pertanyaan>
   Contoh: !ai natz Jelaskan tentang AI

▢ !ai models
   Melihat daftar model AI yang tersedia`);
            }

            // Cek jika command adalah 'models'
            if (t.args[0].toLowerCase() === 'models') {
                const models = AIService.getAvailableModels();
                const modelList = models.map(model => 
                    `▢ ${model.name} (${model.isPremium ? 'Premium' : 'Free'})`
                ).join('\n');

                return m.reply(`*📋 Daftar Model AI Tersedia*\n\n${modelList}`);
            }

            // Gabungkan semua args menjadi satu prompt
            const prompt = t.args.join(' ');

            // Cek jika pesan dimulai dengan 'natz'
            let response;
            if (t.args[0].toLowerCase() === 'natz') {
                const cleanPrompt = t.args.slice(1).join(' ');
                if (!cleanPrompt) {
                    return m.reply('Silakan masukkan pertanyaan setelah "natz"');
                }
                response = await AIService.NatzModels(cleanPrompt);
            } else {
                response = await AIService.generateResponse(prompt);
            }

            if (response.success) {
                await m.reply(`🤖 *AI Response* (${response.model})\n\n${response.message}`);
            } else {
                await m.reply('❌ Maaf, terjadi kesalahan dalam memproses permintaan Anda. Silakan coba lagi.');
            }

        } catch (error) {
            console.error('Error in AI command:', error);
            await m.reply('❌ Terjadi kesalahan sistem. Silakan coba lagi nanti.');
        }
    }
});

// Command untuk model spesifik
Oblixn.cmd({
    name: 'gpt',
    desc: 'Gunakan model GPT-4 Turbo',
    category: 'ai',
    async exec(m, t) {
        try {
            if (!t.args.length) {
                return m.reply('Silakan masukkan pertanyaan Anda');
            }

            const prompt = t.args.join(' ');
            const response = await AIService.generateResponse(prompt, 'gpt4turbo');

            if (response.success) {
                await m.reply(`🤖 *GPT-4 Turbo*\n\n${response.message}`);
            } else {
                await m.reply('❌ Maaf, terjadi kesalahan dalam memproses permintaan Anda.');
            }
        } catch (error) {
            console.error('Error in GPT command:', error);
            await m.reply('❌ Terjadi kesalahan sistem.');
        }
    }
});

// Command untuk Claude
Oblixn.cmd({
    name: 'claude',
    desc: 'Gunakan model Claude',
    category: 'ai',
    async exec(m, t) {
        try {
            if (!t.args.length) {
                return m.reply('Silakan masukkan pertanyaan Anda');
            }

            const prompt = t.args.join(' ');
            const response = await AIService.generateResponse(prompt, 'claude');

            if (response.success) {
                await m.reply(`🤖 *Claude*\n\n${response.message}`);
            } else {
                await m.reply('❌ Maaf, terjadi kesalahan dalam memproses permintaan Anda.');
            }
        } catch (error) {
            console.error('Error in Claude command:', error);
            await m.reply('❌ Terjadi kesalahan sistem.');
        }
    }
});

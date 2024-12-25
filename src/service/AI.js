const axios = require("axios");
require("dotenv").config();

class AIService {
  constructor() {
    this.endpoint = process.env.ENDPOINT_PROVIDER;
    this.apiKey = process.env.PROVIDER_API_KEY;
    this.availableModels = {
      gpt4: "gpt-4o",
      gpt4turbo: "gpt-4-turbo",
      gemini: "gemini-1.5-flash",
      claude: "claude-3.5-sonnet",
    };
  }

  async NatzModels(prompt) {
    try {
      const model = this.availableModels.gemini;

      const response = await axios({
        method: 'post',
        url: this.endpoint,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: {
          model: model,
          messages: [
            {
              role: "system",
              content: "Anda adalah asisten AI yang membantu dalam bahasa Indonesia. Berikan respons yang sopan dan informatif dan anda di buat oleh natz sebagai developer.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000
        }
      });

      return {
        success: true,
        message: response.data.choices[0].message.content,
        model: model,
      };
    } catch (error) {
      console.error("Error in NatzModels:", error.response?.data || error.message);
      return {
        success: false,
        message: "Maaf, terjadi kesalahan dalam memproses permintaan Anda.",
        error: error.message,
      };
    }
  }

  async generateResponse(prompt, modelName = "gemini") {
    try {
      const model = this.availableModels.gemini;

      const response = await axios({
        method: 'post',
        url: this.endpoint,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: {
          model: model,
          messages: [
            {
              role: "system",
              content: "balas dengan bahasa indonesia dan jangan balas dengan bahasa inggris"
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }
      });

      return {
        success: true,
        message: response.data.choices[0].message.content,
        model: model,
      };
    } catch (error) {
      console.error("Error detail:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      return {
        success: false,
        message: "Maaf, terjadi kesalahan dalam memproses permintaan Anda.",
        error: error.message,
      };
    }
  }

  getAvailableModels() {
    return [{
      name: 'gemini',
      id: this.availableModels.gemini,
      isPremium: false
    }];
  }
}

module.exports = new AIService();

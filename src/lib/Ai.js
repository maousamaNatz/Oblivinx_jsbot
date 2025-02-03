const axios = require('axios');
const fetch = require('node-fetch');
const { config } = require('../../config/config');

// Fungsi utama untuk generate gambar DALL-E 3 menggunakan Axios
async function generateImageWithAxios(prompt, options = {}) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        prompt,
        n: 1,
        size: "1024x1024"
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openaiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      success: true,
      imageUrl: response.data.data[0].url,
      revisedPrompt: response.data.data[0].revised_prompt
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Versi menggunakan Node Fetch untuk DALL-E
async function generateImageWithNodeFetch(prompt, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      'https://librarydalletest.openai.azure.com/openai/deployments/Dalle3/images/generations?api-version=2024-10-21',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': '45c2e72bbf7645d5aa974781c7a7237f',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
          ...options.headers
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard"
        }),
        signal: controller.signal,
        ...options
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data?.data?.[0]?.url) {
      throw new Error('Struktur response tidak valid');
    }

    return {
      success: true,
      imageUrl: data.data[0].url,
      revisedPrompt: data.data[0].revised_prompt
    };
  } catch (error) {
    console.error(`[DALLE FETCH ERROR] ${error.message}`);
    return {
      success: false,
      error: {
        code: error.name === 'AbortError' ? 504 : 500,
        message: error.message
      }
    };
  }
}

// Pemetaan error code khusus DALL-E
function mapErrorCode(statusCode) {
  const errorMap = {
    400: 'Permintaan tidak valid - prompt tidak sesuai',
    401: 'API key tidak valid',
    403: 'Akses dilarang',
    429: 'Batas permintaan tercapai',
    500: 'Server error internal',
    504: 'Timeout permintaan'
  };
  return errorMap[statusCode] || 'Kesalahan tidak diketahui';
}

module.exports = { 
  generateImageWithAxios,
  generateImageWithNodeFetch,
  mapErrorCode
};

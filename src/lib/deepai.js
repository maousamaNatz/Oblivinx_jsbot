const fetch = require('node-fetch');
const FormData = require('form-data');

async function enhanceImage(imageBuffer) {
  try {
    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg'
    });

    let resp = await fetch('https://api.deepai.org/api/torch-srgan', {
      method: 'POST', 
      headers: {
        'api-key': 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K'
      },
      body: form
    });

    const result = await resp.json();
    
    if (!result.output_url) {
      throw new Error('Gagal mendapatkan hasil enhance image');
    }

    return result.output_url;

  } catch (error) {
    console.error('Error dalam enhance image:', error);
    throw error;
  }
}

module.exports = {
  enhanceImage
};

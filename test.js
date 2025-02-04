const assert = require('assert');
const { generateImageWithAxios, generateImageWithNodeFetch, mapErrorCode } = require('./src/lib/Ai');

// Test suite untuk modul DALL-E
async function testDalleModule() {
  console.log('\n=== Memulai Test API DALL-E ===');

  // Test 1: Generate gambar valid dengan Axios
  try {
    const prompt = "An astronaut riding a horse in space, photorealistic";
    const response = await generateImageWithAxios(prompt);
    
    assert.strictEqual(response.success, true, 'Response harus sukses');
    assert.match(response.imageUrl, /^https?:\/\//, 'URL gambar harus valid');
    assert.strictEqual(typeof response.revisedPrompt, 'string', 'Revised prompt harus berupa string');
    console.log('[SUKSES] generateImageWithAxios - Response valid');
  } catch (error) {
    console.error('[GAGAL] Test generateImageWithAxios:', error.message);
  }

  // Test 2: Error handling prompt kosong dengan Axios
  try {
    const response = await generateImageWithAxios("", {
      headers: { 'api-key': 'invalid-key' }
    });
    
    assert.strictEqual(response.success, false, 'Harus gagal dengan prompt kosong');
    assert.strictEqual(response.error.code, 400, 'Harus error 400 Bad Request');
    console.log('[SUKSES] generateImageWithAxios - Error handling prompt kosong');
  } catch (error) {
    console.error('[GAGAL] Test error handling generateImageWithAxios:', error.message);
  }

  // Test 3: Generate gambar valid dengan Node Fetch
  try {
    const prompt = "Cyberpunk cityscape at night with neon lights, 4k detailed";
    const response = await generateImageWithNodeFetch(prompt);
    
    assert.strictEqual(response.success, true, 'Response harus sukses');
    assert.match(response.imageUrl, /^https?:\/\//, 'URL gambar harus valid');
    assert.strictEqual(typeof response.revisedPrompt, 'string', 'Revised prompt harus berupa string');
    console.log('[SUKSES] generateImageWithNodeFetch - Response valid');
  } catch (error) {
    console.error('[GAGAL] Test generateImageWithNodeFetch:', error.message);
  }

  // Test 4: Error handling API key invalid dengan Node Fetch
  try {
    const response = await generateImageWithNodeFetch("test", {
      headers: { 'api-key': 'invalid-key' }
    });
    
    assert.strictEqual(response.success, false, 'Harus gagal dengan API key invalid');
    assert.strictEqual(response.error.code, 401, 'Harus error 401 Unauthorized');
    console.log('[SUKSES] generateImageWithNodeFetch - Error handling API key invalid');
  } catch (error) {
    console.error('[GAGAL] Test error handling generateImageWithNodeFetch:', error.message);
  }

  // Test 5: Pemetaan error code khusus DALL-E
  try {
    assert.strictEqual(mapErrorCode(400), 'Permintaan tidak valid - prompt tidak sesuai', 'Harus memetakan error 400');
    assert.strictEqual(mapErrorCode(429), 'Batas permintaan tercapai', 'Harus memetakan error 429');
    assert.strictEqual(mapErrorCode(504), 'Timeout permintaan', 'Harus memetakan error 504');
    assert.strictEqual(mapErrorCode(999), 'Kesalahan tidak diketahui', 'Harus handle unknown error');
    console.log('[SUKSES] Pemetaan error code valid');
  } catch (error) {
    console.error('[GAGAL] Test error mapping:', error.message);
  }

  console.log('=== Test Selesai ===\n');
}

// Jalankan test
testDalleModule().catch(console.error);

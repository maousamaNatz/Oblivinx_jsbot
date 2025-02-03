const assert = require('assert');
const { fetchWithAxios, fetchWithNodeFetch } = require('./Ai');

// Test suite untuk modul AI
async function testAIModule() {
  console.log('\n=== Memulai Test API Ai.js ===');

  try {
    // Test 1: fetchWithAxios - Response valid
    const axiosData = await fetchWithAxios();
    assert.strictEqual(typeof axiosData, 'object', 'Response axios harus berupa object');
    console.log('[SUKSES] fetchWithAxios - Response valid');

    // Test 2: fetchWithAxios - Error handling
    try {
      await fetchWithAxios({ url: 'https://invalid-url' });
      assert.fail('Seharusnya error terjadi');
    } catch (error) {
      assert.match(error.message, /(ECONNREFUSED|ENOTFOUND)/, 'Harus menangani error koneksi');
      console.log('[SUKSES] fetchWithAxios - Error handling berfungsi');
    }
  } catch (error) {
    console.error('[GAGAL] Test fetchWithAxios:', error.message);
  }

  try {
    // Test 3: fetchWithNodeFetch - Response valid
    const fetchData = await fetchWithNodeFetch();
    assert.strictEqual(typeof fetchData, 'object', 'Response fetch harus berupa object');
    console.log('[SUKSES] fetchWithNodeFetch - Response valid');

    // Test 4: fetchWithNodeFetch - Error handling
    try {
      await fetchWithNodeFetch({ url: 'https://invalid-url' });
      assert.fail('Seharusnya error terjadi');
    } catch (error) {
      assert.match(error.message, /(ECONNREFUSED|ENOTFOUND)/, 'Harus menangani error koneksi');
      console.log('[SUKSES] fetchWithNodeFetch - Error handling berfungsi');
    }
  } catch (error) {
    console.error('[GAGAL] Test fetchWithNodeFetch:', error.message);
  }

  console.log('=== Test Selesai ===\n');
}

// Jalankan test
testAIModule().catch(console.error);


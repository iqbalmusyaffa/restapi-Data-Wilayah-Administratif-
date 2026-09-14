const assert = require('node:assert');
const app = require('../server');

let server;
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log(' RUNNING AUTOMATED TEST SUITE: WILAYAH & KODEPOS API');
  console.log('====================================================');

  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[TestServer] Berjalan di port ${PORT} untuk pengujian.`);
      resolve();
    });
  });

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(` ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(` ❌ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. Root API
    await test('1. GET /api - Discovery endpoint', async () => {
      const res = await request('/api');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.name, 'REST API Wilayah Administratif & Kode Pos Indonesia');
      assert.ok(res.data.endpoints.kodepos);
    });

    // 2. Stats
    await test('2. GET /api/stats - Ringkasan 38 Provinsi & Wilayah Nasional', async () => {
      const res = await request('/api/stats');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const s = res.data.data.summary;
      assert.strictEqual(s.provinsi, 38);
      assert.ok(s.kabupaten_kota.total >= 514);
      assert.ok(s.kecamatan >= 7200);
      assert.ok(s.desa_kelurahan.total >= 83000);
    });

    // 3. Provinsi Listing
    await test('3. GET /api/provinsi - Pagination & Search', async () => {
      const res = await request('/api/provinsi?limit=10&page=1');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.length, 10);
      assert.strictEqual(res.data.pagination.total, 38);
    });

    // 4. Detail Provinsi
    await test('4. GET /api/provinsi/32 - Detail Jawa Barat & Stats', async () => {
      const res = await request('/api/provinsi/32?with_kabupaten=true');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.kode, '32');
      assert.strictEqual(res.data.data.nama, 'Jawa Barat');
    });

    // 5. Kabupaten / Kota
    await test('5. GET /api/kabupaten - Filter Provinsi 32', async () => {
      const res = await request('/api/kabupaten?provinsi_kode=32&limit=50');
      assert.strictEqual(res.status, 200);
      const bandung = res.data.data.find(k => k.kode === '32.73');
      assert.ok(bandung);
      assert.strictEqual(bandung.tipe, 'KOTA');
    });

    // 6. Kecamatan
    await test('6. GET /api/kabupaten/32.73/kecamatan - Kecamatan di Kota Bandung', async () => {
      const res = await request('/api/kabupaten/32.73/kecamatan');
      assert.strictEqual(res.status, 200);
      const sukasari = res.data.data.find(k => k.kode === '32.73.01');
      assert.ok(sukasari);
      assert.strictEqual(sukasari.nama, 'Sukasari');
    });

    // 7. Desa / Kelurahan dengan Kode Pos
    await test('7. GET /api/kecamatan/32.73.01/desa - Desa & Kode Pos', async () => {
      const res = await request('/api/kecamatan/32.73.01/desa');
      assert.strictEqual(res.status, 200);
      const sarijadi = res.data.data.find(d => d.nama === 'Sarijadi');
      assert.ok(sarijadi);
      assert.strictEqual(sarijadi.kode_pos, '40151');
    });

    // 8. Lookup Kode Pos
    await test('8. GET /api/kodepos/40151 - Pencarian via 5 Digit Kode Pos', async () => {
      const res = await request('/api/kodepos/40151');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.data.length >= 1);
      const item = res.data.data[0];
      assert.strictEqual(item.kode_pos, '40151');
      assert.ok(item.desa_kelurahan_nama);
      assert.ok(item.kecamatan_nama);
      assert.ok(item.provinsi_nama);
    });

    // 9. CRUD Dusun
    let createdDusunId = null;
    await test('9. CRUD Dusun: Create, Read, Update, Delete', async () => {
      const createRes = await request('/api/dusun', {
        method: 'POST',
        body: JSON.stringify({
          desa_kelurahan_kode: '32.73.01.1001',
          nama: 'Dusun Test Automation',
          kepala_dusun: 'Test Kadus'
        })
      });
      assert.strictEqual(createRes.status, 201);
      createdDusunId = createRes.data.data.id;

      const delRes = await request(`/api/dusun/${createdDusunId}`, { method: 'DELETE' });
      assert.strictEqual(delRes.status, 200);
    });

    // 10. CRUD RW & RT
    await test('10. CRUD RW & RT: Hierarchy and Breadcrumbs', async () => {
      const rwRes = await request('/api/rw', {
        method: 'POST',
        body: JSON.stringify({
          desa_kelurahan_kode: '32.73.01.1001',
          nomor_rw: 'RW 99 Test',
          nama_ketua: 'Ketua RW 99'
        })
      });
      assert.strictEqual(rwRes.status, 201);
      const rwId = rwRes.data.data.id;

      const rtRes = await request('/api/rt', {
        method: 'POST',
        body: JSON.stringify({
          rw_id: rwId,
          nomor_rt: 'RT 99 Test',
          nama_ketua: 'Ketua RT 99'
        })
      });
      assert.strictEqual(rtRes.status, 201);
      const rtId = rtRes.data.data.id;

      const hierRtRes = await request(`/api/hierarchy/rt/${rtId}`);
      assert.strictEqual(hierRtRes.status, 200);
      assert.strictEqual(hierRtRes.data.data.provinsi.nama, 'Jawa Barat');
      assert.strictEqual(hierRtRes.data.data.kabupaten_kota.nama, 'Kota Bandung');

      await request(`/api/rt/${rtId}`, { method: 'DELETE' });
      await request(`/api/rw/${rwId}`, { method: 'DELETE' });
    });

    // 11. Search by Postal Code or Name
    await test('11. Global Search & Reverse Code Hierarchy', async () => {
      const searchRes = await request('/api/search?q=10110');
      assert.strictEqual(searchRes.status, 200);
      assert.ok(searchRes.data.data.desa_kelurahan.length >= 1);
      assert.strictEqual(searchRes.data.data.desa_kelurahan[0].nama, 'Gambir');

      const hierRes = await request('/api/hierarchy/code/32.73.01.1004');
      assert.strictEqual(hierRes.status, 200);
      assert.ok(hierRes.data.data.formatted_address.includes('Sarijadi'));
    });

  } finally {
    server.close();
  }

  console.log('====================================================');
  console.log(` HASIL PENGUJIAN: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };

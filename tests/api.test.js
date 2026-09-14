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
  console.log(' RUNNING AUTOMATED TEST SUITE: WILAYAH & METADATA');
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
      assert.strictEqual(res.data.name, 'REST API Wilayah Administratif, Metadata & Kode Pos Indonesia');
      assert.ok(res.data.endpoints.pulau);
      assert.ok(res.data.endpoints.zona_waktu);
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

    // 3. Metadata Pulau & Zona Waktu
    await test('3. GET /api/pulau & GET /api/zona-waktu - Ringkasan Pengelompokan', async () => {
      const pulauRes = await request('/api/pulau');
      assert.strictEqual(pulauRes.status, 200);
      assert.ok(pulauRes.data.data.length >= 5);
      const jawa = pulauRes.data.data.find(p => p.pulau === 'Jawa');
      assert.ok(jawa);
      assert.strictEqual(jawa.total_provinsi, 6);

      const zonaRes = await request('/api/zona-waktu');
      assert.strictEqual(zonaRes.status, 200);
      assert.strictEqual(zonaRes.data.data.length, 3, 'Harus memiliki 3 zona waktu: WIB, WITA, WIT');
    });

    // 4. Filter Provinsi by Pulau & Zona Waktu
    await test('4. GET /api/provinsi?pulau=Jawa & ?zona_waktu=WITA', async () => {
      const jawaRes = await request('/api/provinsi?pulau=Jawa');
      assert.strictEqual(jawaRes.status, 200);
      assert.strictEqual(jawaRes.data.data.length, 6, 'Pulau Jawa harus memiliki 6 provinsi');

      const witaRes = await request('/api/provinsi?zona_waktu=WITA');
      assert.strictEqual(witaRes.status, 200);
      assert.ok(witaRes.data.data.length >= 10);
    });

    // 5. Detail Provinsi Jawa Barat & Metadata
    await test('5. GET /api/provinsi/32 - Detail Jabar & Ibukota / Zona Waktu', async () => {
      const res = await request('/api/provinsi/32?with_kabupaten=true');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.kode, '32');
      assert.strictEqual(res.data.data.nama, 'Jawa Barat');
      assert.strictEqual(res.data.data.ibukota, 'Kota Bandung');
      assert.strictEqual(res.data.data.zona_waktu, 'WIB');
      assert.strictEqual(res.data.data.pulau, 'Jawa');
      assert.ok(res.data.data.latitude !== null);
      assert.ok(res.data.data.longitude !== null);
    });

    // 6. Kabupaten / Kota dengan Ibukota & Zona Waktu
    await test('6. GET /api/kabupaten?provinsi_kode=32', async () => {
      const res = await request('/api/kabupaten?provinsi_kode=32&limit=50');
      assert.strictEqual(res.status, 200);
      const bandung = res.data.data.find(k => k.kode === '32.73');
      assert.ok(bandung);
      assert.strictEqual(bandung.zona_waktu, 'WIB');
      const bogor = res.data.data.find(k => k.kode === '32.01');
      assert.ok(bogor);
      assert.strictEqual(bogor.ibukota, 'Cibinong');
    });

    // 7. Kecamatan & Kelurahan
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
    });

    // 9. CRUD Dusun
    let createdDusunId = null;
    await test('9. CRUD Dusun: Create, Read, Update, Delete', async () => {
      const createRes = await request('/api/dusun', {
        method: 'POST',
        body: JSON.stringify({
          desa_kelurahan_kode: '32.73.01.1001',
          nama: 'Dusun Test Metadata',
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

      await request(`/api/rt/${rtId}`, { method: 'DELETE' });
      await request(`/api/rw/${rwId}`, { method: 'DELETE' });
    });

    // 11. Search by Keyword & Reverse Code Hierarchy
    await test('11. Global Search & Reverse Code Hierarchy', async () => {
      const searchRes = await request('/api/search?q=10110');
      assert.strictEqual(searchRes.status, 200);
      assert.ok(searchRes.data.data.desa_kelurahan.length >= 1);

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

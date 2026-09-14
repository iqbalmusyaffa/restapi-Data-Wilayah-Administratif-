const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { db, initSchema, dbPath } = require('../config/database');

const SQL_URL = 'https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql';
const KODEPOS_URL = 'https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/master/db/wilayah_kodepos.sql';

const CACHE_FILE = path.join(__dirname, '../../data/wilayah_raw.sql');
const KODEPOS_CACHE_FILE = path.join(__dirname, '../../data/wilayah_kodepos_raw.sql');

function downloadFile(url, cachePath, label) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(cachePath)) {
      console.log(`[Seed] Menggunakan cache lokal ${label}: ${cachePath}`);
      try {
        const data = fs.readFileSync(cachePath, 'utf8');
        return resolve(data);
      } catch (err) {
        console.warn(`[Seed] Gagal membaca cache: ${err.message}, mengunduh ulang...`);
      }
    }

    console.log(`[Seed] Mengunduh ${label} dari: ${url} ...`);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Gagal mengunduh ${label}: HTTP ${res.statusCode}`));
      }

      let rawData = '';
      let downloadedBytes = 0;

      res.on('data', (chunk) => {
        rawData += chunk;
        downloadedBytes += chunk.length;
        process.stdout.write(`\r[Seed] Terunduh (${label}): ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);
      });

      res.on('end', () => {
        console.log(`\n[Seed] Selesai mengunduh ${label} (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB).`);
        try {
          fs.writeFileSync(cachePath, rawData, 'utf8');
        } catch (e) {
          console.warn('[Seed] Peringatan: Gagal menyimpan cache:', e.message);
        }
        resolve(rawData);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function parseAndSeedData(sqlText) {
  console.log('[Seed] Memulai parsing data dan inisialisasi tabel SQLite...');
  initSchema();

  // Clear existing data
  db.exec(`
    DELETE FROM rt;
    DELETE FROM rw;
    DELETE FROM dusun;
    DELETE FROM desa_kelurahan;
    DELETE FROM kecamatan;
    DELETE FROM kabupaten_kota;
    DELETE FROM provinsi;
  `);

  const insertProvinsi = db.prepare('INSERT INTO provinsi (kode, nama) VALUES (?, ?)');
  const insertKabupaten = db.prepare('INSERT INTO kabupaten_kota (kode, provinsi_kode, tipe, nama) VALUES (?, ?, ?, ?)');
  const insertKecamatan = db.prepare('INSERT INTO kecamatan (kode, kabupaten_kota_kode, nama) VALUES (?, ?, ?)');
  const insertDesa = db.prepare('INSERT INTO desa_kelurahan (kode, kecamatan_kode, tipe, nama) VALUES (?, ?, ?, ?)');

  const rowRegex = /\('([^']+)',\s*'((?:''|[^'])*)'\)/g;

  let match;
  let totalCount = 0;
  let provCount = 0;
  let kabCount = 0;
  let kecCount = 0;
  let desaCount = 0;

  console.log('[Seed] Mengimpor data wilayah ke SQLite...');
  db.exec('BEGIN TRANSACTION;');

  try {
    while ((match = rowRegex.exec(sqlText)) !== null) {
      const kode = match[1].trim();
      let nama = match[2].replace(/''/g, "'").trim();
      totalCount++;

      const parts = kode.split('.');

      if (parts.length === 1) {
        insertProvinsi.run(kode, nama);
        provCount++;
      } else if (parts.length === 2) {
        const provKode = parts[0];
        let tipe = 'KABUPATEN';
        if (nama.toUpperCase().startsWith('KOTA ') || nama.toUpperCase().startsWith('KOTA ADM')) {
          tipe = 'KOTA';
        }
        insertKabupaten.run(kode, provKode, tipe, nama);
        kabCount++;
      } else if (parts.length === 3) {
        const kabKode = `${parts[0]}.${parts[1]}`;
        insertKecamatan.run(kode, kabKode, nama);
        kecCount++;
      } else if (parts.length === 4) {
        const kecKode = `${parts[0]}.${parts[1]}.${parts[2]}`;
        const lastPart = parts[3];
        let tipe = 'DESA';

        if (lastPart.startsWith('1')) {
          tipe = 'KELURAHAN';
        } else if (parts[0] === '11') {
          tipe = 'GAMPONG';
        } else if (parts[0] === '13') {
          tipe = 'NAGARI';
        } else if (['91', '92', '93', '94', '95', '96'].includes(parts[0])) {
          tipe = 'KAMPUNG';
        }

        insertDesa.run(kode, kecKode, tipe, nama);
        desaCount++;
      }
    }

    db.exec('COMMIT;');
    console.log(`[Seed] Berhasil mengimpor data utama:`);
    console.log(`  - Provinsi         : ${provCount.toLocaleString('id-ID')}`);
    console.log(`  - Kabupaten / Kota : ${kabCount.toLocaleString('id-ID')}`);
    console.log(`  - Kecamatan        : ${kecCount.toLocaleString('id-ID')}`);
    console.log(`  - Desa / Kelurahan : ${desaCount.toLocaleString('id-ID')}`);

  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

function parseAndSeedKodepos(kodeposSql) {
  console.log('[Seed] Memulai pemetaan data Kode Pos ke Desa/Kelurahan...');
  // Format: ('11.01.01.2001', '23773')
  const kpRegex = /\('([^']+)',\s*'([^']+)'\)/g;
  const updateDesaKodepos = db.prepare('UPDATE desa_kelurahan SET kode_pos = ? WHERE kode = ?');

  let match;
  let kpCount = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    while ((match = kpRegex.exec(kodeposSql)) !== null) {
      const kode = match[1].trim();
      const kodepos = match[2].trim();
      updateDesaKodepos.run(kodepos, kode);
      kpCount++;
    }
    db.exec('COMMIT;');
    console.log(`[Seed] Berhasil memetakan ${kpCount.toLocaleString('id-ID')} Kode Pos ke Desa/Kelurahan!`);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function seedSampleDusunRwRt() {
  console.log('[Seed] Membuat data contoh Dusun, RW, dan RT untuk pengujian...');

  const insertDusun = db.prepare('INSERT INTO dusun (desa_kelurahan_kode, nama, kepala_dusun, keterangan) VALUES (?, ?, ?, ?)');
  const insertRw = db.prepare('INSERT INTO rw (desa_kelurahan_kode, dusun_id, nomor_rw, nama_ketua, keterangan) VALUES (?, ?, ?, ?, ?)');
  const insertRt = db.prepare('INSERT INTO rt (rw_id, nomor_rt, nama_ketua, keterangan) VALUES (?, ?, ?, ?)');

  const sampleDesaList = db.prepare(`
    SELECT dk.kode, dk.nama AS desa_nama, k.nama AS kec_nama, kk.nama AS kab_nama, p.nama AS prov_nama
    FROM desa_kelurahan dk
    JOIN kecamatan k ON dk.kecamatan_kode = k.kode
    JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
    JOIN provinsi p ON kk.provinsi_kode = p.kode
    WHERE dk.kode IN (
      SELECT kode FROM desa_kelurahan LIMIT 25
    ) OR dk.nama IN ('Sarijadi', 'Gambir', 'Caturtunggal', 'Kuta', 'Gubeng', 'Menteng', 'Dago', 'Tegalgundil')
    LIMIT 15
  `).all();

  db.exec('BEGIN TRANSACTION;');

  try {
    let dusunTotal = 0;
    let rwTotal = 0;
    let rtTotal = 0;

    const dummyNames = [
      'Bambang Sutrisno', 'Siti Rahmawati', 'Agus Prasetyo', 'Dewi Lestari', 'Hendra Gunawan',
      'Rini Wulandari', 'Ahmad Fauzi', 'Sri Wahyuni', 'Budi Santoso', 'Eko Purnomo',
      'I Made Suardana', 'Nur Hidayat', 'Tri Handayani', 'Joko Widodo', 'Wahyu Pratama'
    ];

    for (let i = 0; i < sampleDesaList.length; i++) {
      const desa = sampleDesaList[i];
      const desaKode = desa.kode;

      const numDusun = 2;
      for (let d = 1; d <= numDusun; d++) {
        const dusunNama = `Dusun ${d === 1 ? 'Krajan' : 'Sukaregang'} (${desa.desa_nama})`;
        const kadus = dummyNames[(i + d) % dummyNames.length];
        const resDusun = insertDusun.run(desaKode, dusunNama, kadus, `Wilayah dusun bagian ${d === 1 ? 'barat' : 'timur'}`);
        const dusunId = Number(resDusun.lastInsertRowid);
        dusunTotal++;

        for (let r = 1; r <= 2; r++) {
          const rwNum = String((d - 1) * 2 + r).padStart(2, '0');
          const ketuaRw = dummyNames[(i * 3 + d + r) % dummyNames.length];
          const resRw = insertRw.run(desaKode, dusunId, `RW ${rwNum}`, ketuaRw, `Rukun Warga ${rwNum} ${desa.desa_nama}`);
          const rwId = Number(resRw.lastInsertRowid);
          rwTotal++;

          for (let t = 1; t <= 3; t++) {
            const rtNum = String(t).padStart(2, '0');
            const ketuaRt = dummyNames[(i * 4 + d + r + t) % dummyNames.length];
            insertRt.run(rwId, `RT ${rtNum}`, ketuaRt, `Rukun Tetangga ${rtNum} RW ${rwNum}`);
            rtTotal++;
          }
        }
      }
    }

    db.exec('COMMIT;');
    console.log(`[Seed] Berhasil membuat data contoh:`);
    console.log(`  - Dusun / Lingkungan : ${dusunTotal}`);
    console.log(`  - RW (Rukun Warga)   : ${rwTotal}`);
    console.log(`  - RT (Rukun Tetangga): ${rtTotal}`);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

async function run() {
  try {
    const startTime = Date.now();
    console.log('====================================================');
    console.log(' SEEDER DATA WILAYAH & KODE POS INDONESIA LENGKAP');
    console.log('====================================================');

    const sqlText = await downloadFile(SQL_URL, CACHE_FILE, 'Data Wilayah');
    const kodeposSql = await downloadFile(KODEPOS_URL, KODEPOS_CACHE_FILE, 'Data Kode Pos');

    parseAndSeedData(sqlText);
    parseAndSeedKodepos(kodeposSql);
    seedSampleDusunRwRt();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('====================================================');
    console.log(`[Seed] SEEDING SELESAI DALAM ${duration} DETIK!`);
    console.log(`[Seed] Database SQLite: ${dbPath}`);
    console.log('====================================================');
  } catch (error) {
    console.error('[Seed] Terjadi error saat seeding:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { run, downloadFile, parseAndSeedData, parseAndSeedKodepos, seedSampleDusunRwRt };

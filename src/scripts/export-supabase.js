const fs = require('node:fs');
const path = require('node:path');
const { db, initSchema, dbPath } = require('../config/database');

const OUTPUT_FILE = path.join(__dirname, '../../supabase/seed.sql');
const PARTS_DIR = path.join(__dirname, '../../supabase/parts');

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function generateBatchInsert(tableName, columns, rows, chunkSize = 500) {
  if (!rows || rows.length === 0) return '';
  const chunks = chunkArray(rows, chunkSize);
  const colNames = columns.join(', ');

  let sql = `-- Data ${tableName} (${rows.length} baris)\n`;
  for (const chunk of chunks) {
    sql += `INSERT INTO public.${tableName} (${colNames}) VALUES\n`;
    const valueLines = chunk.map(row => {
      const values = columns.map(col => escapeSql(row[col])).join(', ');
      return `  (${values})`;
    });
    sql += valueLines.join(',\n') + '\nON CONFLICT (kode) DO NOTHING;\n\n';
  }
  return sql;
}

function generateIdBatchInsert(tableName, columns, rows, chunkSize = 500) {
  if (!rows || rows.length === 0) return '';
  const chunks = chunkArray(rows, chunkSize);
  const colNames = columns.join(', ');

  let sql = `-- Data ${tableName} (${rows.length} baris)\n`;
  for (const chunk of chunks) {
    sql += `INSERT INTO public.${tableName} (${colNames}) VALUES\n`;
    const valueLines = chunk.map(row => {
      const values = columns.map(col => escapeSql(row[col])).join(', ');
      return `  (${values})`;
    });
    sql += valueLines.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';
  }
  return sql;
}

function exportToSupabase() {
  console.log('[Supabase Export] Membaca data dari SQLite:', dbPath);

  if (!fs.existsSync(dbPath)) {
    console.error('[Supabase Export] Database SQLite belum ada! Silakan jalankan `npm run seed` terlebih dahulu.');
    process.exit(1);
  }

  initSchema();

  const provCount = db.prepare('SELECT COUNT(*) as c FROM provinsi').get().c;
  if (provCount === 0) {
    console.error('[Supabase Export] Database SQLite kosong! Silakan jalankan `npm run seed` terlebih dahulu.');
    process.exit(1);
  }

  console.log('[Supabase Export] Mengambil seluruh data wilayah...');
  const provinsiRows = db.prepare('SELECT kode, nama, ibukota, zona_waktu, pulau, latitude, longitude FROM provinsi ORDER BY kode').all();
  const kabRows = db.prepare('SELECT kode, provinsi_kode, tipe, nama, ibukota, zona_waktu, latitude, longitude FROM kabupaten_kota ORDER BY kode').all();
  const kecRows = db.prepare('SELECT kode, kabupaten_kota_kode, nama FROM kecamatan ORDER BY kode').all();
  const desaRows = db.prepare('SELECT kode, kecamatan_kode, tipe, nama, kode_pos FROM desa_kelurahan ORDER BY kode').all();
  const dusunRows = db.prepare('SELECT id, desa_kelurahan_kode, nama, kepala_dusun, keterangan FROM dusun ORDER BY id').all();
  const rwRows = db.prepare('SELECT id, desa_kelurahan_kode, dusun_id, nomor_rw, nama_ketua, keterangan FROM rw ORDER BY id').all();
  const rtRows = db.prepare('SELECT id, rw_id, nomor_rt, nama_ketua, keterangan FROM rt ORDER BY id').all();

  console.log(`[Supabase Export] Ditemukan:\n  - Provinsi: ${provinsiRows.length}\n  - Kab/Kota: ${kabRows.length}\n  - Kecamatan: ${kecRows.length}\n  - Desa/Kelurahan: ${desaRows.length}\n  - Dusun: ${dusunRows.length}\n  - RW: ${rwRows.length}\n  - RT: ${rtRows.length}`);

  // Create parts directory
  if (!fs.existsSync(PARTS_DIR)) {
    fs.mkdirSync(PARTS_DIR, { recursive: true });
  }

  // 1. Part 1: Provinsi & Kab/Kota
  const part1Sql = `BEGIN;\n` +
    generateBatchInsert('provinsi', ['kode', 'nama', 'ibukota', 'zona_waktu', 'pulau', 'latitude', 'longitude'], provinsiRows, 500) +
    generateBatchInsert('kabupaten_kota', ['kode', 'provinsi_kode', 'tipe', 'nama', 'ibukota', 'zona_waktu', 'latitude', 'longitude'], kabRows, 500) +
    `COMMIT;\n`;
  fs.writeFileSync(path.join(PARTS_DIR, '01_provinsi_kabupaten.sql'), part1Sql, 'utf8');

  // 2. Part 2: Kecamatan
  const part2Sql = `BEGIN;\n` +
    generateBatchInsert('kecamatan', ['kode', 'kabupaten_kota_kode', 'nama'], kecRows, 500) +
    `COMMIT;\n`;
  fs.writeFileSync(path.join(PARTS_DIR, '02_kecamatan.sql'), part2Sql, 'utf8');

  // 3. Part 3: Desa / Kelurahan split into ~12,000 rows each (~700 KB per file)
  const desaChunks = chunkArray(desaRows, 12000);
  desaChunks.forEach((chunk, index) => {
    const partDesaSql = `BEGIN;\n` +
      generateBatchInsert('desa_kelurahan', ['kode', 'kecamatan_kode', 'tipe', 'nama', 'kode_pos'], chunk, 500) +
      `COMMIT;\n`;
    fs.writeFileSync(path.join(PARTS_DIR, `03_desa_part${index + 1}.sql`), partDesaSql, 'utf8');
  });

  // 4. Part 4: Dusun, RW, RT
  let part4Sql = `BEGIN;\n`;
  if (dusunRows.length > 0) {
    part4Sql += generateIdBatchInsert('dusun', ['id', 'desa_kelurahan_kode', 'nama', 'kepala_dusun', 'keterangan'], dusunRows, 500);
    part4Sql += `SELECT setval('public.dusun_id_seq', COALESCE((SELECT MAX(id) FROM public.dusun), 1));\n\n`;
  }
  if (rwRows.length > 0) {
    part4Sql += generateIdBatchInsert('rw', ['id', 'desa_kelurahan_kode', 'dusun_id', 'nomor_rw', 'nama_ketua', 'keterangan'], rwRows, 500);
    part4Sql += `SELECT setval('public.rw_id_seq', COALESCE((SELECT MAX(id) FROM public.rw), 1));\n\n`;
  }
  if (rtRows.length > 0) {
    part4Sql += generateIdBatchInsert('rt', ['id', 'rw_id', 'nomor_rt', 'nama_ketua', 'keterangan'], rtRows, 500);
    part4Sql += `SELECT setval('public.rt_id_seq', COALESCE((SELECT MAX(id) FROM public.rt), 1));\n\n`;
  }
  part4Sql += `COMMIT;\n`;
  fs.writeFileSync(path.join(PARTS_DIR, '04_dusun_rw_rt.sql'), part4Sql, 'utf8');

  // 5. Single Complete File (seed.sql)
  let fullSql = `-- ==============================================================================\n`;
  fullSql += `-- SEED DATA WILAYAH ADMINISTRATIF INDONESIA UNTUK SUPABASE / POSTGRESQL\n`;
  fullSql += `-- Total: 38 Provinsi, 514 Kab/Kota, 7.285+ Kecamatan, 83.760+ Desa/Kelurahan & Kodepos\n`;
  fullSql += `-- Generated at: ${new Date().toISOString()}\n`;
  fullSql += `-- ==============================================================================\n\n`;
  fullSql += `BEGIN;\n\n`;
  fullSql += generateBatchInsert('provinsi', ['kode', 'nama', 'ibukota', 'zona_waktu', 'pulau', 'latitude', 'longitude'], provinsiRows, 500);
  fullSql += generateBatchInsert('kabupaten_kota', ['kode', 'provinsi_kode', 'tipe', 'nama', 'ibukota', 'zona_waktu', 'latitude', 'longitude'], kabRows, 500);
  fullSql += generateBatchInsert('kecamatan', ['kode', 'kabupaten_kota_kode', 'nama'], kecRows, 500);
  fullSql += generateBatchInsert('desa_kelurahan', ['kode', 'kecamatan_kode', 'tipe', 'nama', 'kode_pos'], desaRows, 500);
  if (dusunRows.length > 0) {
    fullSql += generateIdBatchInsert('dusun', ['id', 'desa_kelurahan_kode', 'nama', 'kepala_dusun', 'keterangan'], dusunRows, 500);
    fullSql += `SELECT setval('public.dusun_id_seq', COALESCE((SELECT MAX(id) FROM public.dusun), 1));\n\n`;
  }
  if (rwRows.length > 0) {
    fullSql += generateIdBatchInsert('rw', ['id', 'desa_kelurahan_kode', 'dusun_id', 'nomor_rw', 'nama_ketua', 'keterangan'], rwRows, 500);
    fullSql += `SELECT setval('public.rw_id_seq', COALESCE((SELECT MAX(id) FROM public.rw), 1));\n\n`;
  }
  if (rtRows.length > 0) {
    fullSql += generateIdBatchInsert('rt', ['id', 'rw_id', 'nomor_rt', 'nama_ketua', 'keterangan'], rtRows, 500);
    fullSql += `SELECT setval('public.rt_id_seq', COALESCE((SELECT MAX(id) FROM public.rt), 1));\n\n`;
  }
  fullSql += `COMMIT;\n`;
  fs.writeFileSync(OUTPUT_FILE, fullSql, 'utf8');

  console.log('✅ [Supabase Export] Berhasil mengenerate file SQL:');
  console.log(`  - File Tunggal: ${OUTPUT_FILE} (${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`  - Folder Bagian Terpecah (< 1 MB): ${PARTS_DIR}`);
}

if (require.main === module) {
  exportToSupabase();
}

module.exports = { exportToSupabase };

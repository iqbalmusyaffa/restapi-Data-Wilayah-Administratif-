const { db, initSchema, dbPath } = require('../config/database');
const { getSupabaseClient, isSupabaseConfigured } = require('../config/supabase');

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function seedSupabaseDirect() {
  console.log('====================================================');
  console.log('  SEEDER LANGSUNG KE SUPABASE VIA REST API / SDK    ');
  console.log('====================================================\n');

  if (!isSupabaseConfigured()) {
    console.error('❌ [Supabase] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env!');
    console.log('\n💡 TIPS:');
    console.log('1. Salin konfigurasi dari Dashboard Supabase -> Project Settings -> API.');
    console.log('2. Atau gunakan file SQL yang sudah digenerate: jalankan `npm run export:supabase`, lalu copy-paste isi file `supabase/seed.sql` ke Supabase SQL Editor (Jauh lebih cepat!).\n');
    process.exit(1);
  }

  initSchema();

  const supabase = getSupabaseClient(true);

  console.log('[1/4] Mengambil data dari SQLite lokal...');
  const provinsiRows = db.prepare('SELECT kode, nama, ibukota, zona_waktu, pulau, latitude, longitude FROM provinsi ORDER BY kode').all();
  const kabRows = db.prepare('SELECT kode, provinsi_kode, tipe, nama, ibukota, zona_waktu, latitude, longitude FROM kabupaten_kota ORDER BY kode').all();
  const kecRows = db.prepare('SELECT kode, kabupaten_kota_kode, nama FROM kecamatan ORDER BY kode').all();
  const desaRows = db.prepare('SELECT kode, kecamatan_kode, tipe, nama, kode_pos FROM desa_kelurahan ORDER BY kode').all();

  console.log(`[2/4] Menemukan: ${provinsiRows.length} Provinsi, ${kabRows.length} Kab/Kota, ${kecRows.length} Kecamatan, ${desaRows.length} Desa/Kelurahan.`);

  // 1. Seed Provinsi
  console.log('\n[3/4] Mengunggah Provinsi ke Supabase...');
  const { error: provErr } = await supabase.from('provinsi').upsert(provinsiRows, { onConflict: 'kode' });
  if (provErr) {
    console.error('❌ Gagal upload Provinsi:', provErr.message);
    process.exit(1);
  }
  console.log('✅ 38 Provinsi berhasil diunggah.');

  // 2. Seed Kab/Kota
  console.log('\n[3/4] Mengunggah Kab/Kota ke Supabase...');
  const kabChunks = chunkArray(kabRows, 200);
  for (let i = 0; i < kabChunks.length; i++) {
    const { error: kabErr } = await supabase.from('kabupaten_kota').upsert(kabChunks[i], { onConflict: 'kode' });
    if (kabErr) {
      console.error(`❌ Gagal upload Kab/Kota batch ${i + 1}:`, kabErr.message);
      process.exit(1);
    }
    process.stdout.write(`\rProgress Kab/Kota: ${i + 1}/${kabChunks.length} batch`);
  }
  console.log('\n✅ 514 Kabupaten/Kota berhasil diunggah.');

  // 3. Seed Kecamatan
  console.log('\n[3/4] Mengunggah Kecamatan ke Supabase (7.285 baris)...');
  const kecChunks = chunkArray(kecRows, 500);
  for (let i = 0; i < kecChunks.length; i++) {
    const { error: kecErr } = await supabase.from('kecamatan').upsert(kecChunks[i], { onConflict: 'kode' });
    if (kecErr) {
      console.error(`❌ Gagal upload Kecamatan batch ${i + 1}:`, kecErr.message);
      process.exit(1);
    }
    process.stdout.write(`\rProgress Kecamatan: ${i + 1}/${kecChunks.length} batch`);
  }
  console.log('\n✅ 7.285 Kecamatan berhasil diunggah.');

  // 4. Seed Desa/Kelurahan
  console.log('\n[3/4] Mengunggah Desa/Kelurahan ke Supabase (83.760+ baris)...');
  const desaChunks = chunkArray(desaRows, 500);
  for (let i = 0; i < desaChunks.length; i++) {
    const { error: desaErr } = await supabase.from('desa_kelurahan').upsert(desaChunks[i], { onConflict: 'kode' });
    if (desaErr) {
      console.error(`❌ Gagal upload Desa batch ${i + 1}:`, desaErr.message);
      process.exit(1);
    }
    if ((i + 1) % 10 === 0 || i === desaChunks.length - 1) {
      process.stdout.write(`\rProgress Desa: ${i + 1}/${desaChunks.length} batch (${(((i + 1) / desaChunks.length) * 100).toFixed(1)}%)`);
    }
  }
  console.log('\n✅ 83.760+ Desa/Kelurahan & Kodepos berhasil diunggah.');

  console.log('\n====================================================');
  console.log('🎉 SELESAI! Seluruh data wilayah Indonesia kini aktif di Supabase.');
  console.log('====================================================\n');
}

if (require.main === module) {
  seedSupabaseDirect().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { seedSupabaseDirect };

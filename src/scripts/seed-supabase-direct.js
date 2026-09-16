const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
require('dotenv').config();

function parsePostgresUrl(rawUrl) {
  if (!rawUrl) return null;
  const str = rawUrl.trim().replace(/^["']|["']$/g, '');
  
  // Format: postgresql://user:password@host:port/database
  const match = str.match(/^(?:postgresql|postgres):\/\/([^:]+):(.*)@([^:/]+)(?::(\d+))?(?:\/(.*))?$/);
  if (match) {
    const [, user, password, host, port, rest] = match;
    const dbName = (rest || 'postgres').split('?')[0];
    return {
      user: user,
      password: password,
      host: host,
      port: port ? parseInt(port, 10) : 5432,
      database: dbName || 'postgres',
      ssl: { rejectUnauthorized: false }
    };
  }
  return {
    connectionString: str,
    ssl: { rejectUnauthorized: false }
  };
}

async function seedDirect() {
  console.log('====================================================');
  console.log('  SEEDER SUPABASE DIRECT CONNECTION (POSTGRESQL)    ');
  console.log('====================================================\n');

  const rawDbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!rawDbUrl) {
    console.error('❌ [Error] Variable `SUPABASE_DB_URL` belum diisi di file .env!');
    console.log('\n💡 Cara Mengambil Connection String di Supabase:');
    console.log('1. Buka dashboard Supabase -> Project Settings (Ikon Gear) -> Database.');
    console.log('2. Scroll ke bagian "Connection string" -> Pilih tab "URI".');
    console.log('3. Salin URL-nya (ganti [YOUR-PASSWORD] dengan password database Anda).');
    console.log('4. Tambahkan ke file .env:\n   SUPABASE_DB_URL="postgresql://postgres.xxx:password@aws-0-xx.pooler.supabase.com:6543/postgres"\n');
    process.exit(1);
  }

  const clientConfig = parsePostgresUrl(rawDbUrl);
  const client = new Client(clientConfig);

  try {
    console.log(`[1/3] Menghubungkan ke PostgreSQL Supabase (${clientConfig.host || 'remote'})...`);
    await client.connect();
    console.log('✅ Terhubung ke database Supabase!');

    // 1. Eksekusi Schema
    const schemaPath = path.join(__dirname, '../../supabase/schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('\n[2/3] Memasang tabel & Row Level Security dari `supabase/schema.sql`...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Skema tabel & Realtime publication berhasil dipasang.');
    }

    // 2. Eksekusi Seed
    const seedPath = path.join(__dirname, '../../supabase/seed.sql');
    if (!fs.existsSync(seedPath)) {
      console.log('[Seed] Men-generate `supabase/seed.sql` terlebih dahulu...');
      const { exportToSupabase } = require('./export-supabase');
      exportToSupabase();
    }

    console.log('\n[3/3] Memasukkan 90.000+ data wilayah Indonesia...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    const startTime = Date.now();
    await client.query(seedSql);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n🎉 SUKSES! 90.000+ data wilayah berhasil masuk ke Supabase dalam ${duration} detik!`);
  } catch (err) {
    console.error('❌ Gagal memasukkan data ke Supabase:', err.message);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seedDirect();
}

module.exports = { seedDirect };

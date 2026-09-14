const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/wilayah_indonesia.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA foreign_keys = ON;');

function initSchema() {
  db.exec(`
    -- 1. PROVINSI
    CREATE TABLE IF NOT EXISTS provinsi (
      kode TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. KABUPATEN / KOTA
    CREATE TABLE IF NOT EXISTS kabupaten_kota (
      kode TEXT PRIMARY KEY,
      provinsi_kode TEXT NOT NULL,
      tipe TEXT NOT NULL DEFAULT 'KABUPATEN',
      nama TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provinsi_kode) REFERENCES provinsi(kode) ON DELETE CASCADE
    );

    -- 3. KECAMATAN
    CREATE TABLE IF NOT EXISTS kecamatan (
      kode TEXT PRIMARY KEY,
      kabupaten_kota_kode TEXT NOT NULL,
      nama TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kabupaten_kota_kode) REFERENCES kabupaten_kota(kode) ON DELETE CASCADE
    );

    -- 4. DESA / KELURAHAN
    CREATE TABLE IF NOT EXISTS desa_kelurahan (
      kode TEXT PRIMARY KEY,
      kecamatan_kode TEXT NOT NULL,
      tipe TEXT NOT NULL DEFAULT 'DESA',
      nama TEXT NOT NULL,
      kode_pos TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kecamatan_kode) REFERENCES kecamatan(kode) ON DELETE CASCADE
    );

    -- 5. DUSUN / LINGKUNGAN
    CREATE TABLE IF NOT EXISTS dusun (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desa_kelurahan_kode TEXT NOT NULL,
      nama TEXT NOT NULL,
      kepala_dusun TEXT,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (desa_kelurahan_kode) REFERENCES desa_kelurahan(kode) ON DELETE CASCADE
    );

    -- 6. RW (RUKUN WARGA)
    CREATE TABLE IF NOT EXISTS rw (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      desa_kelurahan_kode TEXT NOT NULL,
      dusun_id INTEGER,
      nomor_rw TEXT NOT NULL,
      nama_ketua TEXT,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (desa_kelurahan_kode) REFERENCES desa_kelurahan(kode) ON DELETE CASCADE,
      FOREIGN KEY (dusun_id) REFERENCES dusun(id) ON DELETE SET NULL
    );

    -- 7. RT (RUKUN TETANGGA)
    CREATE TABLE IF NOT EXISTS rt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rw_id INTEGER NOT NULL,
      nomor_rt TEXT NOT NULL,
      nama_ketua TEXT,
      keterangan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rw_id) REFERENCES rw(id) ON DELETE CASCADE
    );

    -- INDEKS PERFORMA QUERY & PENCARIAN
    CREATE INDEX IF NOT EXISTS idx_provinsi_nama ON provinsi(nama);
    CREATE INDEX IF NOT EXISTS idx_kabupaten_provinsi ON kabupaten_kota(provinsi_kode);
    CREATE INDEX IF NOT EXISTS idx_kabupaten_nama ON kabupaten_kota(nama);
    CREATE INDEX IF NOT EXISTS idx_kabupaten_tipe ON kabupaten_kota(tipe);
    CREATE INDEX IF NOT EXISTS idx_kecamatan_kabupaten ON kecamatan(kabupaten_kota_kode);
    CREATE INDEX IF NOT EXISTS idx_kecamatan_nama ON kecamatan(nama);
    CREATE INDEX IF NOT EXISTS idx_desa_kecamatan ON desa_kelurahan(kecamatan_kode);
    CREATE INDEX IF NOT EXISTS idx_desa_nama ON desa_kelurahan(nama);
    CREATE INDEX IF NOT EXISTS idx_desa_tipe ON desa_kelurahan(tipe);
    CREATE INDEX IF NOT EXISTS idx_desa_kodepos ON desa_kelurahan(kode_pos);
    CREATE INDEX IF NOT EXISTS idx_dusun_desa ON dusun(desa_kelurahan_kode);
    CREATE INDEX IF NOT EXISTS idx_dusun_nama ON dusun(nama);
    CREATE INDEX IF NOT EXISTS idx_rw_desa ON rw(desa_kelurahan_kode);
    CREATE INDEX IF NOT EXISTS idx_rw_dusun ON rw(dusun_id);
    CREATE INDEX IF NOT EXISTS idx_rw_nomor ON rw(nomor_rw);
    CREATE INDEX IF NOT EXISTS idx_rt_rw ON rt(rw_id);
    CREATE INDEX IF NOT EXISTS idx_rt_nomor ON rt(nomor_rt);
  `);
}

module.exports = {
  db,
  initSchema,
  dbPath
};

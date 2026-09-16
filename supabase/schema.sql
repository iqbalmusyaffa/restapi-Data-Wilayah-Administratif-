-- ==============================================================================
-- SKEMA DATABASE INDONESIA WILAYAH ADMINISTRATIF (7 LEVEL) UNTUK SUPABASE
-- Kompatibel dengan: Supabase (PostgreSQL 15+), PostgREST, dan Supabase Realtime
-- ==============================================================================

-- 0. EXTENSIONS (Opsional: PostGIS jika ingin fitur GIS koordinat poligon)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABEL UTAMA (7 LEVEL ADMINISTRATIF + METADATA & KODEPOS)
-- ==============================================================================

-- LEVEL 1: PROVINSI
CREATE TABLE IF NOT EXISTS public.provinsi (
  kode VARCHAR(10) PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  ibukota VARCHAR(255),
  zona_waktu VARCHAR(10) DEFAULT 'WIB',
  pulau VARCHAR(100),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEVEL 2: KABUPATEN / KOTA
CREATE TABLE IF NOT EXISTS public.kabupaten_kota (
  kode VARCHAR(15) PRIMARY KEY,
  provinsi_kode VARCHAR(10) NOT NULL REFERENCES public.provinsi(kode) ON DELETE CASCADE,
  tipe VARCHAR(20) NOT NULL DEFAULT 'KABUPATEN',
  nama VARCHAR(255) NOT NULL,
  ibukota VARCHAR(255),
  zona_waktu VARCHAR(10) DEFAULT 'WIB',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEVEL 3: KECAMATAN
CREATE TABLE IF NOT EXISTS public.kecamatan (
  kode VARCHAR(20) PRIMARY KEY,
  kabupaten_kota_kode VARCHAR(15) NOT NULL REFERENCES public.kabupaten_kota(kode) ON DELETE CASCADE,
  nama VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEVEL 4: DESA / KELURAHAN (dengan Kode Pos)
CREATE TABLE IF NOT EXISTS public.desa_kelurahan (
  kode VARCHAR(25) PRIMARY KEY,
  kecamatan_kode VARCHAR(20) NOT NULL REFERENCES public.kecamatan(kode) ON DELETE CASCADE,
  tipe VARCHAR(20) NOT NULL DEFAULT 'DESA',
  nama VARCHAR(255) NOT NULL,
  kode_pos VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEVEL 5: DUSUN / LINGKUNGAN / BANJAR / GAMPONG
CREATE TABLE IF NOT EXISTS public.dusun (
  id BIGSERIAL PRIMARY KEY,
  desa_kelurahan_kode VARCHAR(25) NOT NULL REFERENCES public.desa_kelurahan(kode) ON DELETE CASCADE,
  nama VARCHAR(255) NOT NULL,
  kepala_dusun VARCHAR(255),
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEVEL 6: RW (RUKUN WARGA)
CREATE TABLE IF NOT EXISTS public.rw (
  id BIGSERIAL PRIMARY KEY,
  desa_kelurahan_kode VARCHAR(25) NOT NULL REFERENCES public.desa_kelurahan(kode) ON DELETE CASCADE,
  dusun_id BIGINT REFERENCES public.dusun(id) ON DELETE SET NULL,
  nomor_rw VARCHAR(10) NOT NULL,
  nama_ketua VARCHAR(255),
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEVEL 7: RT (RUKUN TETANGGA)
CREATE TABLE IF NOT EXISTS public.rt (
  id BIGSERIAL PRIMARY KEY,
  rw_id BIGINT NOT NULL REFERENCES public.rw(id) ON DELETE CASCADE,
  nomor_rt VARCHAR(10) NOT NULL,
  nama_ketua VARCHAR(255),
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. INDEXING UNTUK QUERY PERFORMA TINGGI
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_provinsi_nama ON public.provinsi (nama);
CREATE INDEX IF NOT EXISTS idx_provinsi_pulau ON public.provinsi (pulau);
CREATE INDEX IF NOT EXISTS idx_provinsi_zona_waktu ON public.provinsi (zona_waktu);

CREATE INDEX IF NOT EXISTS idx_kabupaten_provinsi ON public.kabupaten_kota (provinsi_kode);
CREATE INDEX IF NOT EXISTS idx_kabupaten_nama ON public.kabupaten_kota (nama);
CREATE INDEX IF NOT EXISTS idx_kabupaten_tipe ON public.kabupaten_kota (tipe);
CREATE INDEX IF NOT EXISTS idx_kabupaten_zona_waktu ON public.kabupaten_kota (zona_waktu);

CREATE INDEX IF NOT EXISTS idx_kecamatan_kabupaten ON public.kecamatan (kabupaten_kota_kode);
CREATE INDEX IF NOT EXISTS idx_kecamatan_nama ON public.kecamatan (nama);

CREATE INDEX IF NOT EXISTS idx_desa_kecamatan ON public.desa_kelurahan (kecamatan_kode);
CREATE INDEX IF NOT EXISTS idx_desa_nama ON public.desa_kelurahan (nama);
CREATE INDEX IF NOT EXISTS idx_desa_tipe ON public.desa_kelurahan (tipe);
CREATE INDEX IF NOT EXISTS idx_desa_kodepos ON public.desa_kelurahan (kode_pos);

CREATE INDEX IF NOT EXISTS idx_dusun_desa ON public.dusun (desa_kelurahan_kode);
CREATE INDEX IF NOT EXISTS idx_rw_desa ON public.rw (desa_kelurahan_kode);
CREATE INDEX IF NOT EXISTS idx_rw_dusun ON public.rw (dusun_id);
CREATE INDEX IF NOT EXISTS idx_rt_rw ON public.rt (rw_id);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Mengaktifkan RLS pada semua tabel agar aman saat diakses dari client-side Supabase SDK
ALTER TABLE public.provinsi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kabupaten_kota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kecamatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desa_kelurahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dusun ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rt ENABLE ROW LEVEL SECURITY;

-- Policy: Publik (anon) dapat membaca semua data wilayah (SELECT)
DROP POLICY IF EXISTS "Public Read Provinsi" ON public.provinsi;
CREATE POLICY "Public Read Provinsi" ON public.provinsi FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Kabupaten" ON public.kabupaten_kota;
CREATE POLICY "Public Read Kabupaten" ON public.kabupaten_kota FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Kecamatan" ON public.kecamatan;
CREATE POLICY "Public Read Kecamatan" ON public.kecamatan FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Desa" ON public.desa_kelurahan;
CREATE POLICY "Public Read Desa" ON public.desa_kelurahan FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Dusun" ON public.dusun;
CREATE POLICY "Public Read Dusun" ON public.dusun FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read RW" ON public.rw;
CREATE POLICY "Public Read RW" ON public.rw FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read RT" ON public.rt;
CREATE POLICY "Public Read RT" ON public.rt FOR SELECT USING (true);

-- Policy: Hanya Authenticated User / Service Role yang dapat menambah/mengubah data
DROP POLICY IF EXISTS "Authenticated Insert/Update Dusun" ON public.dusun;
CREATE POLICY "Authenticated Insert/Update Dusun" ON public.dusun FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated Insert/Update RW" ON public.rw;
CREATE POLICY "Authenticated Insert/Update RW" ON public.rw FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated Insert/Update RT" ON public.rt;
CREATE POLICY "Authenticated Insert/Update RT" ON public.rt FOR ALL TO authenticated USING (true);

-- ==============================================================================
-- 4. SUPABASE REALTIME CONFIGURATION
-- ==============================================================================
-- Aktifkan Realtime CDC (Change Data Capture) untuk tabel
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.provinsi;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kabupaten_kota;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kecamatan;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.desa_kelurahan;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dusun;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rw;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rt;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

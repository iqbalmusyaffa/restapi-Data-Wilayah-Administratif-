const { db } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

class SearchController {
  // GET /api/search?q=...&level=provinsi|kabupaten|kecamatan|desa|dusun|rw|rt|kodepos&limit=20
  search(req, res) {
    try {
      const { q, level, limit = 20 } = req.query;

      if (!q || q.trim().length === 0) {
        return errorResponse(res, 'Query parameter "q" wajib diisi untuk melakukan pencarian', 400);
      }

      const searchTerm = q.trim();
      const maxLimit = Math.min(Number(limit) || 20, 100);
      const searchPattern = `%${searchTerm}%`;

      const results = {};
      const targetLevel = level ? level.toLowerCase() : 'all';

      // 1. PROVINSI
      if (targetLevel === 'all' || targetLevel === 'provinsi') {
        results.provinsi = db.prepare(`
          SELECT 'provinsi' AS level, kode, nama 
          FROM provinsi 
          WHERE nama LIKE ? OR kode LIKE ? 
          LIMIT ?
        `).all(searchPattern, searchPattern, maxLimit);
      }

      // 2. KABUPATEN / KOTA
      if (targetLevel === 'all' || targetLevel === 'kabupaten' || targetLevel === 'kota') {
        results.kabupaten_kota = db.prepare(`
          SELECT 'kabupaten_kota' AS level, kk.kode, kk.tipe, kk.nama, p.kode AS provinsi_kode, p.nama AS provinsi_nama
          FROM kabupaten_kota kk
          JOIN provinsi p ON kk.provinsi_kode = p.kode
          WHERE kk.nama LIKE ? OR kk.kode LIKE ?
          LIMIT ?
        `).all(searchPattern, searchPattern, maxLimit);
      }

      // 3. KECAMATAN
      if (targetLevel === 'all' || targetLevel === 'kecamatan') {
        results.kecamatan = db.prepare(`
          SELECT 'kecamatan' AS level, k.kode, k.nama, kk.kode AS kabupaten_kota_kode, kk.nama AS kabupaten_kota_nama,
                 p.kode AS provinsi_kode, p.nama AS provinsi_nama
          FROM kecamatan k
          JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
          JOIN provinsi p ON kk.provinsi_kode = p.kode
          WHERE k.nama LIKE ? OR k.kode LIKE ?
          LIMIT ?
        `).all(searchPattern, searchPattern, maxLimit);
      }

      // 4. DESA / KELURAHAN (including kode_pos)
      if (targetLevel === 'all' || targetLevel === 'desa' || targetLevel === 'kelurahan' || targetLevel === 'kodepos') {
        results.desa_kelurahan = db.prepare(`
          SELECT 'desa_kelurahan' AS level, dk.kode, dk.tipe, dk.nama, dk.kode_pos,
                 k.kode AS kecamatan_kode, k.nama AS kecamatan_nama,
                 kk.kode AS kabupaten_kota_kode, kk.nama AS kabupaten_kota_nama,
                 p.kode AS provinsi_kode, p.nama AS provinsi_nama
          FROM desa_kelurahan dk
          JOIN kecamatan k ON dk.kecamatan_kode = k.kode
          JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
          JOIN provinsi p ON kk.provinsi_kode = p.kode
          WHERE dk.nama LIKE ? OR dk.kode LIKE ? OR dk.kode_pos LIKE ?
          LIMIT ?
        `).all(searchPattern, searchPattern, searchPattern, maxLimit);
      }

      // 5. DUSUN
      if (targetLevel === 'all' || targetLevel === 'dusun') {
        results.dusun = db.prepare(`
          SELECT 'dusun' AS level, d.id, d.nama, d.kepala_dusun,
                 dk.kode AS desa_kelurahan_kode, dk.nama AS desa_kelurahan_nama, dk.kode_pos,
                 k.nama AS kecamatan_nama, kk.nama AS kabupaten_kota_nama, p.nama AS provinsi_nama
          FROM dusun d
          JOIN desa_kelurahan dk ON d.desa_kelurahan_kode = dk.kode
          JOIN kecamatan k ON dk.kecamatan_kode = k.kode
          JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
          JOIN provinsi p ON kk.provinsi_kode = p.kode
          WHERE d.nama LIKE ? OR d.kepala_dusun LIKE ?
          LIMIT ?
        `).all(searchPattern, searchPattern, maxLimit);
      }

      // 6. RW
      if (targetLevel === 'all' || targetLevel === 'rw') {
        results.rw = db.prepare(`
          SELECT 'rw' AS level, rw.id, rw.nomor_rw, rw.nama_ketua, d.nama AS dusun_nama,
                 dk.kode AS desa_kelurahan_kode, dk.nama AS desa_kelurahan_nama, dk.kode_pos,
                 k.nama AS kecamatan_nama, kk.nama AS kabupaten_kota_nama, p.nama AS provinsi_nama
          FROM rw
          JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
          LEFT JOIN dusun d ON rw.dusun_id = d.id
          JOIN kecamatan k ON dk.kecamatan_kode = k.kode
          JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
          JOIN provinsi p ON kk.provinsi_kode = p.kode
          WHERE rw.nomor_rw LIKE ? OR rw.nama_ketua LIKE ?
          LIMIT ?
        `).all(searchPattern, searchPattern, maxLimit);
      }

      // 7. RT
      if (targetLevel === 'all' || targetLevel === 'rt') {
        results.rt = db.prepare(`
          SELECT 'rt' AS level, rt.id, rt.nomor_rt, rt.nama_ketua, rw.nomor_rw, d.nama AS dusun_nama,
                 dk.kode AS desa_kelurahan_kode, dk.nama AS desa_kelurahan_nama, dk.kode_pos,
                 k.nama AS kecamatan_nama, kk.nama AS kabupaten_kota_nama, p.nama AS provinsi_nama
          FROM rt
          JOIN rw ON rt.rw_id = rw.id
          JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
          LEFT JOIN dusun d ON rw.dusun_id = d.id
          JOIN kecamatan k ON dk.kecamatan_kode = k.kode
          JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
          JOIN provinsi p ON kk.provinsi_kode = p.kode
          WHERE rt.nomor_rt LIKE ? OR rt.nama_ketua LIKE ?
          LIMIT ?
        `).all(searchPattern, searchPattern, maxLimit);
      }

      let totalResults = 0;
      for (const key of Object.keys(results)) {
        totalResults += results[key].length;
      }

      return successResponse(res, results, `Hasil pencarian untuk "${searchTerm}" ditemukan ${totalResults} data`, 200, {
        query: searchTerm,
        level: targetLevel,
        total_found: totalResults
      });
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new SearchController();

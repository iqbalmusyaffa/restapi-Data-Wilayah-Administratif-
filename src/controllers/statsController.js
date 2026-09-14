const { db } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

class StatsController {
  // GET /api/stats
  getStats(req, res) {
    try {
      const summary = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM provinsi) AS total_provinsi,
          (SELECT COUNT(*) FROM kabupaten_kota) AS total_kabupaten_kota,
          (SELECT COUNT(*) FROM kabupaten_kota WHERE tipe = 'KABUPATEN') AS total_kabupaten,
          (SELECT COUNT(*) FROM kabupaten_kota WHERE tipe = 'KOTA') AS total_kota,
          (SELECT COUNT(*) FROM kecamatan) AS total_kecamatan,
          (SELECT COUNT(*) FROM desa_kelurahan) AS total_desa_kelurahan,
          (SELECT COUNT(*) FROM desa_kelurahan WHERE tipe = 'DESA') AS total_desa,
          (SELECT COUNT(*) FROM desa_kelurahan WHERE tipe = 'KELURAHAN') AS total_kelurahan,
          (SELECT COUNT(*) FROM dusun) AS total_dusun,
          (SELECT COUNT(*) FROM rw) AS total_rw,
          (SELECT COUNT(*) FROM rt) AS total_rt
      `).get();

      // Top provinces with most sub-regions
      const topProvinces = db.prepare(`
        SELECT 
          p.kode, p.nama,
          COUNT(DISTINCT kk.kode) AS total_kabupaten_kota,
          COUNT(DISTINCT k.kode) AS total_kecamatan,
          COUNT(DISTINCT dk.kode) AS total_desa_kelurahan
        FROM provinsi p
        LEFT JOIN kabupaten_kota kk ON kk.provinsi_kode = p.kode
        LEFT JOIN kecamatan k ON k.kabupaten_kota_kode = kk.kode
        LEFT JOIN desa_kelurahan dk ON dk.kecamatan_kode = k.kode
        GROUP BY p.kode
        ORDER BY total_desa_kelurahan DESC
        LIMIT 10
      `).all();

      return successResponse(res, {
        summary: {
          provinsi: summary.total_provinsi,
          kabupaten_kota: {
            total: summary.total_kabupaten_kota,
            kabupaten: summary.total_kabupaten,
            kota: summary.total_kota
          },
          kecamatan: summary.total_kecamatan,
          desa_kelurahan: {
            total: summary.total_desa_kelurahan,
            desa: summary.total_desa,
            kelurahan: summary.total_kelurahan
          },
          dusun: summary.total_dusun,
          rw: summary.total_rw,
          rt: summary.total_rt
        },
        top_provinces: topProvinces
      }, 'Statistik ringkasan wilayah Indonesia berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new StatsController();

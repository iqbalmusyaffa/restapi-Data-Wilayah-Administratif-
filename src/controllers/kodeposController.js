const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class KodeposController {
  // GET /api/kodepos/:kodepos
  getByKodepos(req, res) {
    try {
      const { kodepos } = req.params;

      if (!kodepos) {
        return errorResponse(res, 'Parameter kode pos wajib diisi', 400);
      }

      const results = db.prepare(`
        SELECT 
          dk.kode_pos,
          dk.kode AS desa_kelurahan_kode,
          dk.tipe AS desa_tipe,
          dk.nama AS desa_kelurahan_nama,
          k.kode AS kecamatan_kode,
          k.nama AS kecamatan_nama,
          kk.kode AS kabupaten_kota_kode,
          kk.tipe AS kabupaten_kota_tipe,
          kk.nama AS kabupaten_kota_nama,
          p.kode AS provinsi_kode,
          p.nama AS provinsi_nama
        FROM desa_kelurahan dk
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE dk.kode_pos = ?
        ORDER BY dk.kode ASC
      `).all(kodepos.trim());

      if (results.length === 0) {
        return errorResponse(res, `Kode pos '${kodepos}' tidak ditemukan di basis data wilayah`, 404);
      }

      return successResponse(res, results, `Ditemukan ${results.length} wilayah untuk kode pos ${kodepos}`, 200, {
        kodepos,
        total: results.length
      });
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/kodepos?q=...&provinsi_kode=...&page=...&limit=...
  getAll(req, res) {
    try {
      const { q, provinsi_kode, kabupaten_kota_kode, page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let countSql = `
        SELECT COUNT(*) AS total
        FROM desa_kelurahan dk
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE dk.kode_pos IS NOT NULL AND dk.kode_pos != ''
      `;

      let dataSql = `
        SELECT 
          dk.kode_pos,
          dk.kode AS desa_kelurahan_kode,
          dk.tipe AS desa_tipe,
          dk.nama AS desa_kelurahan_nama,
          k.kode AS kecamatan_kode,
          k.nama AS kecamatan_nama,
          kk.kode AS kabupaten_kota_kode,
          kk.tipe AS kabupaten_kota_tipe,
          kk.nama AS kabupaten_kota_nama,
          p.kode AS provinsi_kode,
          p.nama AS provinsi_nama
        FROM desa_kelurahan dk
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE dk.kode_pos IS NOT NULL AND dk.kode_pos != ''
      `;

      const params = [];

      if (q) {
        countSql += ' AND (dk.kode_pos LIKE ? OR dk.nama LIKE ? OR k.nama LIKE ? OR kk.nama LIKE ?)';
        dataSql += ' AND (dk.kode_pos LIKE ? OR dk.nama LIKE ? OR k.nama LIKE ? OR kk.nama LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }

      if (provinsi_kode) {
        countSql += ' AND p.kode = ?';
        dataSql += ' AND p.kode = ?';
        params.push(provinsi_kode);
      }

      if (kabupaten_kota_kode) {
        countSql += ' AND kk.kode = ?';
        dataSql += ' AND kk.kode = ?';
        params.push(kabupaten_kota_kode);
      }

      dataSql += ' ORDER BY dk.kode_pos ASC, dk.kode ASC LIMIT ? OFFSET ?';
      const dataParams = [...params, Number(limit), Number(offset)];

      const totalResult = db.prepare(countSql).get(...params);
      const total = totalResult ? totalResult.total : 0;
      const data = db.prepare(dataSql).all(...dataParams);

      return paginatedResponse(res, data, total, page, limit, 'Daftar kode pos wilayah berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new KodeposController();

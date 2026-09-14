const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class KecamatanController {
  // GET /api/kecamatan
  getAll(req, res) {
    try {
      const { kabupaten_kota_kode, provinsi_kode, q, page = 1, limit = 50, sort = 'kode', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const sortColumn = ['kode', 'nama'].includes(sort.toLowerCase()) ? `k.${sort}` : 'k.kode';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      let countSql = `
        SELECT COUNT(*) AS total 
        FROM kecamatan k
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      let dataSql = `
        SELECT k.kode, k.kabupaten_kota_kode, kk.nama AS kabupaten_kota_nama, kk.tipe AS kabupaten_kota_tipe, p.kode AS provinsi_kode, p.nama AS provinsi_nama, k.nama
        FROM kecamatan k
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      const params = [];

      if (kabupaten_kota_kode) {
        countSql += ' AND k.kabupaten_kota_kode = ?';
        dataSql += ' AND k.kabupaten_kota_kode = ?';
        params.push(kabupaten_kota_kode);
      }

      if (provinsi_kode) {
        countSql += ' AND kk.provinsi_kode = ?';
        dataSql += ' AND kk.provinsi_kode = ?';
        params.push(provinsi_kode);
      }

      if (q) {
        countSql += ' AND (k.nama LIKE ? OR k.kode LIKE ? OR kk.nama LIKE ?)';
        dataSql += ' AND (k.nama LIKE ? OR k.kode LIKE ? OR kk.nama LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      dataSql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
      const dataParams = [...params, Number(limit), Number(offset)];

      const totalResult = db.prepare(countSql).get(...params);
      const total = totalResult ? totalResult.total : 0;
      const data = db.prepare(dataSql).all(...dataParams);

      return paginatedResponse(res, data, total, page, limit, 'Daftar kecamatan berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/kecamatan/:kode
  getById(req, res) {
    try {
      const { kode } = req.params;
      const { with_desa } = req.query;

      const kecamatan = db.prepare(`
        SELECT k.kode, k.kabupaten_kota_kode, kk.nama AS kabupaten_kota_nama, kk.tipe AS kabupaten_kota_tipe,
               p.kode AS provinsi_kode, p.nama AS provinsi_nama, k.nama, k.created_at, k.updated_at
        FROM kecamatan k
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE k.kode = ?
      `).get(kode);

      if (!kecamatan) {
        return errorResponse(res, `Kecamatan dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const stats = db.prepare(`
        SELECT 
          COUNT(CASE WHEN tipe = 'DESA' THEN 1 END) AS total_desa,
          COUNT(CASE WHEN tipe = 'KELURAHAN' THEN 1 END) AS total_kelurahan,
          COUNT(*) AS total_desa_kelurahan
        FROM desa_kelurahan
        WHERE kecamatan_kode = ?
      `).get(kode);

      const result = {
        ...kecamatan,
        stats: {
          desa: stats.total_desa || 0,
          kelurahan: stats.total_kelurahan || 0,
          total: stats.total_desa_kelurahan || 0
        }
      };

      if (with_desa === 'true' || with_desa === '1') {
        result.desa_kelurahan = db.prepare(
          'SELECT kode, tipe, nama, kode_pos FROM desa_kelurahan WHERE kecamatan_kode = ? ORDER BY kode ASC'
        ).all(kode);
      }

      return successResponse(res, result, 'Detail data kecamatan berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/kecamatan/:kode/desa
  getDesa(req, res) {
    try {
      const { kode } = req.params;
      const { tipe, q } = req.query;

      const kecamatan = db.prepare(`
        SELECT k.kode, k.nama, kk.nama AS kabupaten_kota_nama, p.nama AS provinsi_nama
        FROM kecamatan k
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE k.kode = ?
      `).get(kode);

      if (!kecamatan) {
        return errorResponse(res, `Kecamatan dengan kode '${kode}' tidak ditemukan`, 404);
      }

      let sql = 'SELECT kode, kecamatan_kode, tipe, nama, kode_pos FROM desa_kelurahan WHERE kecamatan_kode = ?';
      const params = [kode];

      if (tipe) {
        sql += ' AND UPPER(tipe) = ?';
        params.push(tipe.toUpperCase());
      }

      if (q) {
        sql += ' AND (nama LIKE ? OR kode LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
      }

      sql += ' ORDER BY kode ASC';
      const data = db.prepare(sql).all(...params);

      return successResponse(res, data, `Daftar desa/kelurahan di ${kecamatan.nama} berhasil diambil`, 200, {
        kecamatan,
        total: data.length
      });
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // POST /api/kecamatan
  create(req, res) {
    try {
      const { kode, kabupaten_kota_kode, nama } = req.body;
      if (!kode || !kabupaten_kota_kode || !nama) {
        return errorResponse(res, 'Field "kode", "kabupaten_kota_kode", dan "nama" wajib diisi', 400);
      }

      const kab = db.prepare('SELECT kode FROM kabupaten_kota WHERE kode = ?').get(kabupaten_kota_kode);
      if (!kab) {
        return errorResponse(res, `Kabupaten/Kota dengan kode '${kabupaten_kota_kode}' tidak ditemukan`, 404);
      }

      const existing = db.prepare('SELECT kode FROM kecamatan WHERE kode = ?').get(kode);
      if (existing) {
        return errorResponse(res, `Kecamatan dengan kode '${kode}' sudah terdaftar`, 409);
      }

      db.prepare('INSERT INTO kecamatan (kode, kabupaten_kota_kode, nama) VALUES (?, ?, ?)').run(
        kode,
        kabupaten_kota_kode,
        nama
      );

      const created = db.prepare('SELECT * FROM kecamatan WHERE kode = ?').get(kode);
      return successResponse(res, created, 'Kecamatan baru berhasil ditambahkan', 201);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // PUT /api/kecamatan/:kode
  update(req, res) {
    try {
      const { kode } = req.params;
      const { nama, kabupaten_kota_kode } = req.body;

      const existing = db.prepare('SELECT * FROM kecamatan WHERE kode = ?').get(kode);
      if (!existing) {
        return errorResponse(res, `Kecamatan dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const newNama = nama || existing.nama;
      const newKabKode = kabupaten_kota_kode || existing.kabupaten_kota_kode;

      db.prepare(`
        UPDATE kecamatan 
        SET nama = ?, kabupaten_kota_kode = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE kode = ?
      `).run(newNama, newKabKode, kode);

      const updated = db.prepare('SELECT * FROM kecamatan WHERE kode = ?').get(kode);
      return successResponse(res, updated, 'Data kecamatan berhasil diperbarui');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // DELETE /api/kecamatan/:kode
  delete(req, res) {
    try {
      const { kode } = req.params;
      const existing = db.prepare('SELECT * FROM kecamatan WHERE kode = ?').get(kode);

      if (!existing) {
        return errorResponse(res, `Kecamatan dengan kode '${kode}' tidak ditemukan`, 404);
      }

      db.prepare('DELETE FROM kecamatan WHERE kode = ?').run(kode);
      return successResponse(res, existing, `Kecamatan '${existing.nama}' (${kode}) berhasil dihapus`);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new KecamatanController();

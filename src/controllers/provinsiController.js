const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class ProvinsiController {
  // GET /api/provinsi
  getAll(req, res) {
    try {
      const { q, page = 1, limit = 50, sort = 'kode', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const sortColumn = ['kode', 'nama'].includes(sort.toLowerCase()) ? sort : 'kode';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      let countSql = 'SELECT COUNT(*) AS total FROM provinsi';
      let dataSql = `SELECT kode, nama FROM provinsi`;
      const params = [];

      if (q) {
        countSql += ' WHERE nama LIKE ? OR kode LIKE ?';
        dataSql += ' WHERE nama LIKE ? OR kode LIKE ?';
        params.push(`%${q}%`, `%${q}%`);
      }

      dataSql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
      const dataParams = [...params, Number(limit), Number(offset)];

      const totalResult = db.prepare(countSql).get(...params);
      const total = totalResult ? totalResult.total : 0;
      const data = db.prepare(dataSql).all(...dataParams);

      return paginatedResponse(res, data, total, page, limit, 'Daftar provinsi berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/provinsi/:kode
  getById(req, res) {
    try {
      const { kode } = req.params;
      const { with_kabupaten } = req.query;

      const provinsi = db.prepare('SELECT kode, nama, created_at, updated_at FROM provinsi WHERE kode = ?').get(kode);

      if (!provinsi) {
        return errorResponse(res, `Provinsi dengan kode '${kode}' tidak ditemukan`, 404);
      }

      // Hitung total kabupaten/kota di provinsi ini
      const stats = db.prepare(`
        SELECT 
          COUNT(DISTINCT kk.kode) AS total_kabupaten_kota,
          COUNT(DISTINCT k.kode) AS total_kecamatan,
          COUNT(DISTINCT dk.kode) AS total_desa_kelurahan
        FROM kabupaten_kota kk
        LEFT JOIN kecamatan k ON k.kabupaten_kota_kode = kk.kode
        LEFT JOIN desa_kelurahan dk ON dk.kecamatan_kode = k.kode
        WHERE kk.provinsi_kode = ?
      `).get(kode);

      const result = {
        ...provinsi,
        stats: {
          kabupaten_kota: stats.total_kabupaten_kota || 0,
          kecamatan: stats.total_kecamatan || 0,
          desa_kelurahan: stats.total_desa_kelurahan || 0
        }
      };

      if (with_kabupaten === 'true' || with_kabupaten === '1') {
        result.kabupaten_kota = db.prepare(
          'SELECT kode, tipe, nama FROM kabupaten_kota WHERE provinsi_kode = ? ORDER BY kode ASC'
        ).all(kode);
      }

      return successResponse(res, result, 'Detail data provinsi berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/provinsi/:kode/kabupaten
  getKabupaten(req, res) {
    try {
      const { kode } = req.params;
      const { tipe, q } = req.query;

      const provinsi = db.prepare('SELECT kode, nama FROM provinsi WHERE kode = ?').get(kode);
      if (!provinsi) {
        return errorResponse(res, `Provinsi dengan kode '${kode}' tidak ditemukan`, 404);
      }

      let sql = 'SELECT kode, provinsi_kode, tipe, nama FROM kabupaten_kota WHERE provinsi_kode = ?';
      const params = [kode];

      if (tipe) {
        sql += ' AND tipe = ?';
        params.push(tipe.toUpperCase());
      }
      if (q) {
        sql += ' AND (nama LIKE ? OR kode LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
      }

      sql += ' ORDER BY kode ASC';
      const data = db.prepare(sql).all(...params);

      return successResponse(res, data, `Daftar kabupaten/kota di ${provinsi.nama} berhasil diambil`, 200, {
        provinsi,
        total: data.length
      });
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // POST /api/provinsi
  create(req, res) {
    try {
      const { kode, nama } = req.body;
      if (!kode || !nama) {
        return errorResponse(res, 'Field "kode" dan "nama" wajib diisi', 400);
      }

      const existing = db.prepare('SELECT kode FROM provinsi WHERE kode = ?').get(kode);
      if (existing) {
        return errorResponse(res, `Provinsi dengan kode '${kode}' sudah terdaftar`, 409);
      }

      db.prepare('INSERT INTO provinsi (kode, nama) VALUES (?, ?)').run(kode, nama);
      const created = db.prepare('SELECT * FROM provinsi WHERE kode = ?').get(kode);

      return successResponse(res, created, 'Provinsi baru berhasil ditambahkan', 201);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // PUT /api/provinsi/:kode
  update(req, res) {
    try {
      const { kode } = req.params;
      const { nama } = req.body;

      if (!nama) {
        return errorResponse(res, 'Field "nama" wajib diisi', 400);
      }

      const existing = db.prepare('SELECT kode FROM provinsi WHERE kode = ?').get(kode);
      if (!existing) {
        return errorResponse(res, `Provinsi dengan kode '${kode}' tidak ditemukan`, 404);
      }

      db.prepare('UPDATE provinsi SET nama = ?, updated_at = CURRENT_TIMESTAMP WHERE kode = ?').run(nama, kode);
      const updated = db.prepare('SELECT * FROM provinsi WHERE kode = ?').get(kode);

      return successResponse(res, updated, 'Data provinsi berhasil diperbarui');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // DELETE /api/provinsi/:kode
  delete(req, res) {
    try {
      const { kode } = req.params;
      const existing = db.prepare('SELECT * FROM provinsi WHERE kode = ?').get(kode);

      if (!existing) {
        return errorResponse(res, `Provinsi dengan kode '${kode}' tidak ditemukan`, 404);
      }

      db.prepare('DELETE FROM provinsi WHERE kode = ?').run(kode);
      return successResponse(res, existing, `Provinsi '${existing.nama}' (${kode}) berhasil dihapus`);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new ProvinsiController();

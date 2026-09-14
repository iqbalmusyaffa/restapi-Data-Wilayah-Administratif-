const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class KabupatenController {
  // GET /api/kabupaten
  getAll(req, res) {
    try {
      const { provinsi_kode, tipe, q, page = 1, limit = 50, sort = 'kode', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const sortColumn = ['kode', 'nama', 'tipe'].includes(sort.toLowerCase()) ? `kk.${sort}` : 'kk.kode';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      let countSql = `
        SELECT COUNT(*) AS total 
        FROM kabupaten_kota kk 
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      let dataSql = `
        SELECT kk.kode, kk.provinsi_kode, p.nama AS provinsi_nama, kk.tipe, kk.nama
        FROM kabupaten_kota kk
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      const params = [];

      if (provinsi_kode) {
        countSql += ' AND kk.provinsi_kode = ?';
        dataSql += ' AND kk.provinsi_kode = ?';
        params.push(provinsi_kode);
      }

      if (tipe) {
        countSql += ' AND UPPER(kk.tipe) = ?';
        dataSql += ' AND UPPER(kk.tipe) = ?';
        params.push(tipe.toUpperCase());
      }

      if (q) {
        countSql += ' AND (kk.nama LIKE ? OR kk.kode LIKE ? OR p.nama LIKE ?)';
        dataSql += ' AND (kk.nama LIKE ? OR kk.kode LIKE ? OR p.nama LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      dataSql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
      const dataParams = [...params, Number(limit), Number(offset)];

      const totalResult = db.prepare(countSql).get(...params);
      const total = totalResult ? totalResult.total : 0;
      const data = db.prepare(dataSql).all(...dataParams);

      return paginatedResponse(res, data, total, page, limit, 'Daftar kabupaten/kota berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/kabupaten/:kode
  getById(req, res) {
    try {
      const { kode } = req.params;
      const { with_kecamatan } = req.query;

      const kabupaten = db.prepare(`
        SELECT kk.kode, kk.provinsi_kode, p.nama AS provinsi_nama, kk.tipe, kk.nama, kk.created_at, kk.updated_at
        FROM kabupaten_kota kk
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE kk.kode = ?
      `).get(kode);

      if (!kabupaten) {
        return errorResponse(res, `Kabupaten/Kota dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const stats = db.prepare(`
        SELECT 
          COUNT(DISTINCT k.kode) AS total_kecamatan,
          COUNT(DISTINCT dk.kode) AS total_desa_kelurahan
        FROM kecamatan k
        LEFT JOIN desa_kelurahan dk ON dk.kecamatan_kode = k.kode
        WHERE k.kabupaten_kota_kode = ?
      `).get(kode);

      const result = {
        ...kabupaten,
        stats: {
          kecamatan: stats.total_kecamatan || 0,
          desa_kelurahan: stats.total_desa_kelurahan || 0
        }
      };

      if (with_kecamatan === 'true' || with_kecamatan === '1') {
        result.kecamatan = db.prepare(
          'SELECT kode, nama FROM kecamatan WHERE kabupaten_kota_kode = ? ORDER BY kode ASC'
        ).all(kode);
      }

      return successResponse(res, result, 'Detail data kabupaten/kota berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/kabupaten/:kode/kecamatan
  getKecamatan(req, res) {
    try {
      const { kode } = req.params;
      const { q } = req.query;

      const kabupaten = db.prepare(`
        SELECT kk.kode, kk.nama, kk.tipe, p.nama AS provinsi_nama
        FROM kabupaten_kota kk
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE kk.kode = ?
      `).get(kode);

      if (!kabupaten) {
        return errorResponse(res, `Kabupaten/Kota dengan kode '${kode}' tidak ditemukan`, 404);
      }

      let sql = 'SELECT kode, kabupaten_kota_kode, nama FROM kecamatan WHERE kabupaten_kota_kode = ?';
      const params = [kode];

      if (q) {
        sql += ' AND (nama LIKE ? OR kode LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
      }

      sql += ' ORDER BY kode ASC';
      const data = db.prepare(sql).all(...params);

      return successResponse(res, data, `Daftar kecamatan di ${kabupaten.nama} berhasil diambil`, 200, {
        kabupaten,
        total: data.length
      });
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // POST /api/kabupaten
  create(req, res) {
    try {
      const { kode, provinsi_kode, nama, tipe = 'KABUPATEN' } = req.body;
      if (!kode || !provinsi_kode || !nama) {
        return errorResponse(res, 'Field "kode", "provinsi_kode", dan "nama" wajib diisi', 400);
      }

      const prov = db.prepare('SELECT kode FROM provinsi WHERE kode = ?').get(provinsi_kode);
      if (!prov) {
        return errorResponse(res, `Provinsi dengan kode '${provinsi_kode}' tidak ditemukan`, 404);
      }

      const existing = db.prepare('SELECT kode FROM kabupaten_kota WHERE kode = ?').get(kode);
      if (existing) {
        return errorResponse(res, `Kabupaten/Kota dengan kode '${kode}' sudah terdaftar`, 409);
      }

      const formattedTipe = tipe.toUpperCase() === 'KOTA' ? 'KOTA' : 'KABUPATEN';
      db.prepare('INSERT INTO kabupaten_kota (kode, provinsi_kode, tipe, nama) VALUES (?, ?, ?, ?)').run(
        kode,
        provinsi_kode,
        formattedTipe,
        nama
      );

      const created = db.prepare('SELECT * FROM kabupaten_kota WHERE kode = ?').get(kode);
      return successResponse(res, created, 'Kabupaten/Kota baru berhasil ditambahkan', 201);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // PUT /api/kabupaten/:kode
  update(req, res) {
    try {
      const { kode } = req.params;
      const { nama, tipe, provinsi_kode } = req.body;

      const existing = db.prepare('SELECT * FROM kabupaten_kota WHERE kode = ?').get(kode);
      if (!existing) {
        return errorResponse(res, `Kabupaten/Kota dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const newNama = nama || existing.nama;
      const newTipe = tipe ? (tipe.toUpperCase() === 'KOTA' ? 'KOTA' : 'KABUPATEN') : existing.tipe;
      const newProvKode = provinsi_kode || existing.provinsi_kode;

      db.prepare(`
        UPDATE kabupaten_kota 
        SET nama = ?, tipe = ?, provinsi_kode = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE kode = ?
      `).run(newNama, newTipe, newProvKode, kode);

      const updated = db.prepare('SELECT * FROM kabupaten_kota WHERE kode = ?').get(kode);
      return successResponse(res, updated, 'Data kabupaten/kota berhasil diperbarui');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // DELETE /api/kabupaten/:kode
  delete(req, res) {
    try {
      const { kode } = req.params;
      const existing = db.prepare('SELECT * FROM kabupaten_kota WHERE kode = ?').get(kode);

      if (!existing) {
        return errorResponse(res, `Kabupaten/Kota dengan kode '${kode}' tidak ditemukan`, 404);
      }

      db.prepare('DELETE FROM kabupaten_kota WHERE kode = ?').run(kode);
      return successResponse(res, existing, `Kabupaten/Kota '${existing.nama}' (${kode}) berhasil dihapus`);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new KabupatenController();

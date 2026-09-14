const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class DesaController {
  // GET /api/desa
  getAll(req, res) {
    try {
      const { kecamatan_kode, kabupaten_kota_kode, provinsi_kode, tipe, q, page = 1, limit = 50, sort = 'kode', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const sortColumn = ['kode', 'nama', 'tipe'].includes(sort.toLowerCase()) ? `dk.${sort}` : 'dk.kode';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      let countSql = `
        SELECT COUNT(*) AS total 
        FROM desa_kelurahan dk
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      let dataSql = `
        SELECT dk.kode, dk.kecamatan_kode, k.nama AS kecamatan_nama, 
               kk.kode AS kabupaten_kota_kode, kk.nama AS kabupaten_kota_nama,
               p.kode AS provinsi_kode, p.nama AS provinsi_nama,
               dk.tipe, dk.nama, dk.kode_pos
        FROM desa_kelurahan dk
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      const params = [];

      if (kecamatan_kode) {
        countSql += ' AND dk.kecamatan_kode = ?';
        dataSql += ' AND dk.kecamatan_kode = ?';
        params.push(kecamatan_kode);
      }

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

      if (tipe) {
        countSql += ' AND UPPER(dk.tipe) = ?';
        dataSql += ' AND UPPER(dk.tipe) = ?';
        params.push(tipe.toUpperCase());
      }

      if (q) {
        countSql += ' AND (dk.nama LIKE ? OR dk.kode LIKE ? OR k.nama LIKE ?)';
        dataSql += ' AND (dk.nama LIKE ? OR dk.kode LIKE ? OR k.nama LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      dataSql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
      const dataParams = [...params, Number(limit), Number(offset)];

      const totalResult = db.prepare(countSql).get(...params);
      const total = totalResult ? totalResult.total : 0;
      const data = db.prepare(dataSql).all(...dataParams);

      return paginatedResponse(res, data, total, page, limit, 'Daftar desa/kelurahan berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/desa/:kode
  getById(req, res) {
    try {
      const { kode } = req.params;
      const { with_dusun, with_rw } = req.query;

      const desa = db.prepare(`
        SELECT dk.kode, dk.kecamatan_kode, k.nama AS kecamatan_nama, 
               kk.kode AS kabupaten_kota_kode, kk.nama AS kabupaten_kota_nama,
               p.kode AS provinsi_kode, p.nama AS provinsi_nama,
               dk.tipe, dk.nama, dk.kode_pos, dk.created_at, dk.updated_at
        FROM desa_kelurahan dk
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE dk.kode = ?
      `).get(kode);

      if (!desa) {
        return errorResponse(res, `Desa/Kelurahan dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const stats = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM dusun WHERE desa_kelurahan_kode = ?) AS total_dusun,
          (SELECT COUNT(*) FROM rw WHERE desa_kelurahan_kode = ?) AS total_rw,
          (SELECT COUNT(*) FROM rt JOIN rw ON rt.rw_id = rw.id WHERE rw.desa_kelurahan_kode = ?) AS total_rt
      `).get(kode, kode, kode);

      const result = {
        ...desa,
        stats: {
          dusun: stats.total_dusun || 0,
          rw: stats.total_rw || 0,
          rt: stats.total_rt || 0
        }
      };

      if (with_dusun === 'true' || with_dusun === '1') {
        result.dusun = db.prepare('SELECT * FROM dusun WHERE desa_kelurahan_kode = ? ORDER BY id ASC').all(kode);
      }

      if (with_rw === 'true' || with_rw === '1') {
        result.rw = db.prepare(`
          SELECT rw.*, 
            (SELECT COUNT(*) FROM rt WHERE rt.rw_id = rw.id) AS total_rt
          FROM rw 
          WHERE rw.desa_kelurahan_kode = ? 
          ORDER BY rw.nomor_rw ASC
        `).all(kode);
      }

      return successResponse(res, result, 'Detail data desa/kelurahan berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/desa/:kode/dusun
  getDusun(req, res) {
    try {
      const { kode } = req.params;
      const desa = db.prepare('SELECT kode, nama, tipe FROM desa_kelurahan WHERE kode = ?').get(kode);

      if (!desa) {
        return errorResponse(res, `Desa/Kelurahan dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const dusunList = db.prepare(`
        SELECT d.*, 
          (SELECT COUNT(*) FROM rw WHERE rw.dusun_id = d.id) AS total_rw
        FROM dusun d
        WHERE d.desa_kelurahan_kode = ?
        ORDER BY d.id ASC
      `).all(kode);

      return successResponse(res, dusunList, `Daftar dusun di ${desa.nama} berhasil diambil`, 200, {
        desa,
        total: dusunList.length
      });
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/desa/:kode/rw
  getRw(req, res) {
    try {
      const { kode } = req.params;
      const desa = db.prepare('SELECT kode, nama, tipe FROM desa_kelurahan WHERE kode = ?').get(kode);

      if (!desa) {
        return errorResponse(res, `Desa/Kelurahan dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const rwList = db.prepare(`
        SELECT rw.*, d.nama AS dusun_nama,
          (SELECT COUNT(*) FROM rt WHERE rt.rw_id = rw.id) AS total_rt
        FROM rw
        LEFT JOIN dusun d ON rw.dusun_id = d.id
        WHERE rw.desa_kelurahan_kode = ?
        ORDER BY rw.nomor_rw ASC
      `).all(kode);

      return successResponse(res, rwList, `Daftar RW di ${desa.nama} berhasil diambil`, 200, {
        desa,
        total: rwList.length
      });
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // POST /api/desa
  create(req, res) {
    try {
      const { kode, kecamatan_kode, nama, tipe = 'DESA', kode_pos } = req.body;
      if (!kode || !kecamatan_kode || !nama) {
        return errorResponse(res, 'Field "kode", "kecamatan_kode", dan "nama" wajib diisi', 400);
      }

      const kec = db.prepare('SELECT kode FROM kecamatan WHERE kode = ?').get(kecamatan_kode);
      if (!kec) {
        return errorResponse(res, `Kecamatan dengan kode '${kecamatan_kode}' tidak ditemukan`, 404);
      }

      const existing = db.prepare('SELECT kode FROM desa_kelurahan WHERE kode = ?').get(kode);
      if (existing) {
        return errorResponse(res, `Desa/Kelurahan dengan kode '${kode}' sudah terdaftar`, 409);
      }

      db.prepare('INSERT INTO desa_kelurahan (kode, kecamatan_kode, tipe, nama, kode_pos) VALUES (?, ?, ?, ?, ?)').run(
        kode,
        kecamatan_kode,
        tipe.toUpperCase(),
        nama,
        kode_pos || null
      );

      const created = db.prepare('SELECT * FROM desa_kelurahan WHERE kode = ?').get(kode);
      return successResponse(res, created, 'Desa/Kelurahan baru berhasil ditambahkan', 201);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // PUT /api/desa/:kode
  update(req, res) {
    try {
      const { kode } = req.params;
      const { nama, tipe, kecamatan_kode, kode_pos } = req.body;

      const existing = db.prepare('SELECT * FROM desa_kelurahan WHERE kode = ?').get(kode);
      if (!existing) {
        return errorResponse(res, `Desa/Kelurahan dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const newNama = nama || existing.nama;
      const newTipe = tipe ? tipe.toUpperCase() : existing.tipe;
      const newKecKode = kecamatan_kode || existing.kecamatan_kode;
      const newKodePos = kode_pos !== undefined ? kode_pos : existing.kode_pos;

      db.prepare(`
        UPDATE desa_kelurahan 
        SET nama = ?, tipe = ?, kecamatan_kode = ?, kode_pos = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE kode = ?
      `).run(newNama, newTipe, newKecKode, newKodePos, kode);

      const updated = db.prepare('SELECT * FROM desa_kelurahan WHERE kode = ?').get(kode);
      return successResponse(res, updated, 'Data desa/kelurahan berhasil diperbarui');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // DELETE /api/desa/:kode
  delete(req, res) {
    try {
      const { kode } = req.params;
      const existing = db.prepare('SELECT * FROM desa_kelurahan WHERE kode = ?').get(kode);

      if (!existing) {
        return errorResponse(res, `Desa/Kelurahan dengan kode '${kode}' tidak ditemukan`, 404);
      }

      db.prepare('DELETE FROM desa_kelurahan WHERE kode = ?').run(kode);
      return successResponse(res, existing, `Desa/Kelurahan '${existing.nama}' (${kode}) berhasil dihapus`);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new DesaController();

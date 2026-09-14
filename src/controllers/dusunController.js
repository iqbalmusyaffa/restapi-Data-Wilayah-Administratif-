const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class DusunController {
  // GET /api/dusun
  getAll(req, res) {
    try {
      const { desa_kelurahan_kode, q, page = 1, limit = 50, sort = 'id', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const sortColumn = ['id', 'nama', 'created_at'].includes(sort.toLowerCase()) ? `d.${sort}` : 'd.id';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      let countSql = `
        SELECT COUNT(*) AS total 
        FROM dusun d
        JOIN desa_kelurahan dk ON d.desa_kelurahan_kode = dk.kode
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      let dataSql = `
        SELECT d.id, d.desa_kelurahan_kode, dk.nama AS desa_kelurahan_nama, dk.tipe AS desa_tipe,
               k.nama AS kecamatan_nama, kk.nama AS kabupaten_kota_nama, p.nama AS provinsi_nama,
               d.nama, d.kepala_dusun, d.keterangan, d.created_at, d.updated_at,
               (SELECT COUNT(*) FROM rw WHERE rw.dusun_id = d.id) AS total_rw
        FROM dusun d
        JOIN desa_kelurahan dk ON d.desa_kelurahan_kode = dk.kode
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      const params = [];

      if (desa_kelurahan_kode) {
        countSql += ' AND d.desa_kelurahan_kode = ?';
        dataSql += ' AND d.desa_kelurahan_kode = ?';
        params.push(desa_kelurahan_kode);
      }

      if (q) {
        countSql += ' AND (d.nama LIKE ? OR d.kepala_dusun LIKE ? OR dk.nama LIKE ?)';
        dataSql += ' AND (d.nama LIKE ? OR d.kepala_dusun LIKE ? OR dk.nama LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }

      dataSql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
      const dataParams = [...params, Number(limit), Number(offset)];

      const totalResult = db.prepare(countSql).get(...params);
      const total = totalResult ? totalResult.total : 0;
      const data = db.prepare(dataSql).all(...dataParams);

      return paginatedResponse(res, data, total, page, limit, 'Daftar dusun/lingkungan berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/dusun/:id
  getById(req, res) {
    try {
      const { id } = req.params;
      const { with_rw } = req.query;

      const dusun = db.prepare(`
        SELECT d.id, d.desa_kelurahan_kode, dk.nama AS desa_kelurahan_nama, dk.tipe AS desa_tipe,
               k.kode AS kecamatan_kode, k.nama AS kecamatan_nama,
               kk.kode AS kabupaten_kota_kode, kk.nama AS kabupaten_kota_nama,
               p.kode AS provinsi_kode, p.nama AS provinsi_nama,
               d.nama, d.kepala_dusun, d.keterangan, d.created_at, d.updated_at
        FROM dusun d
        JOIN desa_kelurahan dk ON d.desa_kelurahan_kode = dk.kode
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE d.id = ?
      `).get(Number(id));

      if (!dusun) {
        return errorResponse(res, `Dusun dengan ID '${id}' tidak ditemukan`, 404);
      }

      const stats = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM rw WHERE dusun_id = ?) AS total_rw,
          (SELECT COUNT(*) FROM rt JOIN rw ON rt.rw_id = rw.id WHERE rw.dusun_id = ?) AS total_rt
      `).get(Number(id), Number(id));

      const result = {
        ...dusun,
        stats: {
          rw: stats.total_rw || 0,
          rt: stats.total_rt || 0
        }
      };

      if (with_rw === 'true' || with_rw === '1') {
        result.rw = db.prepare(`
          SELECT rw.*, 
            (SELECT COUNT(*) FROM rt WHERE rt.rw_id = rw.id) AS total_rt
          FROM rw 
          WHERE rw.dusun_id = ? 
          ORDER BY rw.nomor_rw ASC
        `).all(Number(id));
      }

      return successResponse(res, result, 'Detail data dusun berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // POST /api/dusun
  create(req, res) {
    try {
      const { desa_kelurahan_kode, nama, kepala_dusun, keterangan } = req.body;
      if (!desa_kelurahan_kode || !nama) {
        return errorResponse(res, 'Field "desa_kelurahan_kode" dan "nama" wajib diisi', 400);
      }

      const desa = db.prepare('SELECT kode FROM desa_kelurahan WHERE kode = ?').get(desa_kelurahan_kode);
      if (!desa) {
        return errorResponse(res, `Desa/Kelurahan dengan kode '${desa_kelurahan_kode}' tidak ditemukan`, 404);
      }

      const insertResult = db.prepare(`
        INSERT INTO dusun (desa_kelurahan_kode, nama, kepala_dusun, keterangan)
        VALUES (?, ?, ?, ?)
      `).run(desa_kelurahan_kode, nama, kepala_dusun || null, keterangan || null);

      const created = db.prepare('SELECT * FROM dusun WHERE id = ?').get(Number(insertResult.lastInsertRowid));
      return successResponse(res, created, 'Dusun baru berhasil ditambahkan', 201);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // PUT /api/dusun/:id
  update(req, res) {
    try {
      const { id } = req.params;
      const { nama, kepala_dusun, keterangan, desa_kelurahan_kode } = req.body;

      const existing = db.prepare('SELECT * FROM dusun WHERE id = ?').get(Number(id));
      if (!existing) {
        return errorResponse(res, `Dusun dengan ID '${id}' tidak ditemukan`, 404);
      }

      const newNama = nama || existing.nama;
      const newKadus = kepala_dusun !== undefined ? kepala_dusun : existing.kepala_dusun;
      const newKet = keterangan !== undefined ? keterangan : existing.keterangan;
      const newDesaKode = desa_kelurahan_kode || existing.desa_kelurahan_kode;

      db.prepare(`
        UPDATE dusun 
        SET nama = ?, kepala_dusun = ?, keterangan = ?, desa_kelurahan_kode = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(newNama, newKadus, newKet, newDesaKode, Number(id));

      const updated = db.prepare('SELECT * FROM dusun WHERE id = ?').get(Number(id));
      return successResponse(res, updated, 'Data dusun berhasil diperbarui');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // DELETE /api/dusun/:id
  delete(req, res) {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM dusun WHERE id = ?').get(Number(id));

      if (!existing) {
        return errorResponse(res, `Dusun dengan ID '${id}' tidak ditemukan`, 404);
      }

      db.prepare('DELETE FROM dusun WHERE id = ?').run(Number(id));
      return successResponse(res, existing, `Dusun '${existing.nama}' (ID: ${id}) berhasil dihapus`);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new DusunController();

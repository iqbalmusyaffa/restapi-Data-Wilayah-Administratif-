const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class RtController {
  // GET /api/rt
  getAll(req, res) {
    try {
      const { rw_id, desa_kelurahan_kode, nomor_rt, q, page = 1, limit = 50, sort = 'id', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const sortColumn = ['id', 'nomor_rt', 'created_at'].includes(sort.toLowerCase()) ? `rt.${sort}` : 'rt.id';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      let countSql = `
        SELECT COUNT(*) AS total 
        FROM rt
        JOIN rw ON rt.rw_id = rw.id
        JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
        LEFT JOIN dusun d ON rw.dusun_id = d.id
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      let dataSql = `
        SELECT rt.id, rt.rw_id, rw.nomor_rw, rw.desa_kelurahan_kode, dk.nama AS desa_kelurahan_nama, dk.tipe AS desa_tipe,
               rw.dusun_id, d.nama AS dusun_nama,
               k.nama AS kecamatan_nama, kk.nama AS kabupaten_kota_nama, p.nama AS provinsi_nama,
               rt.nomor_rt, rt.nama_ketua, rt.keterangan, rt.created_at, rt.updated_at
        FROM rt
        JOIN rw ON rt.rw_id = rw.id
        JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
        LEFT JOIN dusun d ON rw.dusun_id = d.id
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      const params = [];

      if (rw_id) {
        countSql += ' AND rt.rw_id = ?';
        dataSql += ' AND rt.rw_id = ?';
        params.push(Number(rw_id));
      }

      if (desa_kelurahan_kode) {
        countSql += ' AND rw.desa_kelurahan_kode = ?';
        dataSql += ' AND rw.desa_kelurahan_kode = ?';
        params.push(desa_kelurahan_kode);
      }

      if (nomor_rt) {
        countSql += ' AND rt.nomor_rt = ?';
        dataSql += ' AND rt.nomor_rt = ?';
        params.push(nomor_rt);
      }

      if (q) {
        countSql += ' AND (rt.nomor_rt LIKE ? OR rt.nama_ketua LIKE ? OR rw.nomor_rw LIKE ? OR dk.nama LIKE ?)';
        dataSql += ' AND (rt.nomor_rt LIKE ? OR rt.nama_ketua LIKE ? OR rw.nomor_rw LIKE ? OR dk.nama LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }

      dataSql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
      const dataParams = [...params, Number(limit), Number(offset)];

      const totalResult = db.prepare(countSql).get(...params);
      const total = totalResult ? totalResult.total : 0;
      const data = db.prepare(dataSql).all(...dataParams);

      return paginatedResponse(res, data, total, page, limit, 'Daftar RT berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/rt/:id
  getById(req, res) {
    try {
      const { id } = req.params;

      const rt = db.prepare(`
        SELECT rt.id, rt.rw_id, rw.nomor_rw, rw.nama_ketua AS ketua_rw,
               rw.desa_kelurahan_kode, dk.nama AS desa_kelurahan_nama, dk.tipe AS desa_tipe,
               rw.dusun_id, d.nama AS dusun_nama,
               k.kode AS kecamatan_kode, k.nama AS kecamatan_nama,
               kk.kode AS kabupaten_kota_kode, kk.nama AS kabupaten_kota_nama,
               p.kode AS provinsi_kode, p.nama AS provinsi_nama,
               rt.nomor_rt, rt.nama_ketua, rt.keterangan, rt.created_at, rt.updated_at
        FROM rt
        JOIN rw ON rt.rw_id = rw.id
        JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
        LEFT JOIN dusun d ON rw.dusun_id = d.id
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE rt.id = ?
      `).get(Number(id));

      if (!rt) {
        return errorResponse(res, `RT dengan ID '${id}' tidak ditemukan`, 404);
      }

      return successResponse(res, rt, 'Detail data RT berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // POST /api/rt
  create(req, res) {
    try {
      const { rw_id, nomor_rt, nama_ketua, keterangan } = req.body;
      if (!rw_id || !nomor_rt) {
        return errorResponse(res, 'Field "rw_id" dan "nomor_rt" wajib diisi', 400);
      }

      const rw = db.prepare('SELECT id FROM rw WHERE id = ?').get(Number(rw_id));
      if (!rw) {
        return errorResponse(res, `RW dengan ID '${rw_id}' tidak ditemukan`, 404);
      }

      const insertResult = db.prepare(`
        INSERT INTO rt (rw_id, nomor_rt, nama_ketua, keterangan)
        VALUES (?, ?, ?, ?)
      `).run(
        Number(rw_id),
        nomor_rt,
        nama_ketua || null,
        keterangan || null
      );

      const created = db.prepare('SELECT * FROM rt WHERE id = ?').get(Number(insertResult.lastInsertRowid));
      return successResponse(res, created, 'RT baru berhasil ditambahkan', 201);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // PUT /api/rt/:id
  update(req, res) {
    try {
      const { id } = req.params;
      const { nomor_rt, nama_ketua, keterangan, rw_id } = req.body;

      const existing = db.prepare('SELECT * FROM rt WHERE id = ?').get(Number(id));
      if (!existing) {
        return errorResponse(res, `RT dengan ID '${id}' tidak ditemukan`, 404);
      }

      const newNomor = nomor_rt || existing.nomor_rt;
      const newKetua = nama_ketua !== undefined ? nama_ketua : existing.nama_ketua;
      const newKet = keterangan !== undefined ? keterangan : existing.keterangan;
      const newRwId = rw_id ? Number(rw_id) : existing.rw_id;

      if (rw_id) {
        const rw = db.prepare('SELECT id FROM rw WHERE id = ?').get(Number(rw_id));
        if (!rw) {
          return errorResponse(res, `RW dengan ID '${rw_id}' tidak ditemukan`, 404);
        }
      }

      db.prepare(`
        UPDATE rt 
        SET nomor_rt = ?, nama_ketua = ?, keterangan = ?, rw_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(newNomor, newKetua, newKet, newRwId, Number(id));

      const updated = db.prepare('SELECT * FROM rt WHERE id = ?').get(Number(id));
      return successResponse(res, updated, 'Data RT berhasil diperbarui');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // DELETE /api/rt/:id
  delete(req, res) {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM rt WHERE id = ?').get(Number(id));

      if (!existing) {
        return errorResponse(res, `RT dengan ID '${id}' tidak ditemukan`, 404);
      }

      db.prepare('DELETE FROM rt WHERE id = ?').run(Number(id));
      return successResponse(res, existing, `RT '${existing.nomor_rt}' (ID: ${id}) berhasil dihapus`);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new RtController();

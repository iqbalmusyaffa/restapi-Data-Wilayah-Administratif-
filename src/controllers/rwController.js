const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class RwController {
  // GET /api/rw
  getAll(req, res) {
    try {
      const { desa_kelurahan_kode, dusun_id, nomor_rw, q, page = 1, limit = 50, sort = 'id', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const sortColumn = ['id', 'nomor_rw', 'created_at'].includes(sort.toLowerCase()) ? `rw.${sort}` : 'rw.id';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      let countSql = `
        SELECT COUNT(*) AS total 
        FROM rw
        JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
        LEFT JOIN dusun d ON rw.dusun_id = d.id
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      let dataSql = `
        SELECT rw.id, rw.desa_kelurahan_kode, dk.nama AS desa_kelurahan_nama, dk.tipe AS desa_tipe,
               rw.dusun_id, d.nama AS dusun_nama,
               k.nama AS kecamatan_nama, kk.nama AS kabupaten_kota_nama, p.nama AS provinsi_nama,
               rw.nomor_rw, rw.nama_ketua, rw.keterangan, rw.created_at, rw.updated_at,
               (SELECT COUNT(*) FROM rt WHERE rt.rw_id = rw.id) AS total_rt
        FROM rw
        JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
        LEFT JOIN dusun d ON rw.dusun_id = d.id
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      const params = [];

      if (desa_kelurahan_kode) {
        countSql += ' AND rw.desa_kelurahan_kode = ?';
        dataSql += ' AND rw.desa_kelurahan_kode = ?';
        params.push(desa_kelurahan_kode);
      }

      if (dusun_id) {
        countSql += ' AND rw.dusun_id = ?';
        dataSql += ' AND rw.dusun_id = ?';
        params.push(Number(dusun_id));
      }

      if (nomor_rw) {
        countSql += ' AND rw.nomor_rw = ?';
        dataSql += ' AND rw.nomor_rw = ?';
        params.push(nomor_rw);
      }

      if (q) {
        countSql += ' AND (rw.nomor_rw LIKE ? OR rw.nama_ketua LIKE ? OR dk.nama LIKE ? OR d.nama LIKE ?)';
        dataSql += ' AND (rw.nomor_rw LIKE ? OR rw.nama_ketua LIKE ? OR dk.nama LIKE ? OR d.nama LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }

      dataSql += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ? OFFSET ?`;
      const dataParams = [...params, Number(limit), Number(offset)];

      const totalResult = db.prepare(countSql).get(...params);
      const total = totalResult ? totalResult.total : 0;
      const data = db.prepare(dataSql).all(...dataParams);

      return paginatedResponse(res, data, total, page, limit, 'Daftar RW berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/rw/:id
  getById(req, res) {
    try {
      const { id } = req.params;
      const { with_rt } = req.query;

      const rw = db.prepare(`
        SELECT rw.id, rw.desa_kelurahan_kode, dk.nama AS desa_kelurahan_nama, dk.tipe AS desa_tipe,
               rw.dusun_id, d.nama AS dusun_nama,
               k.kode AS kecamatan_kode, k.nama AS kecamatan_nama,
               kk.kode AS kabupaten_kota_kode, kk.nama AS kabupaten_kota_nama,
               p.kode AS provinsi_kode, p.nama AS provinsi_nama,
               rw.nomor_rw, rw.nama_ketua, rw.keterangan, rw.created_at, rw.updated_at
        FROM rw
        JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
        LEFT JOIN dusun d ON rw.dusun_id = d.id
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE rw.id = ?
      `).get(Number(id));

      if (!rw) {
        return errorResponse(res, `RW dengan ID '${id}' tidak ditemukan`, 404);
      }

      const totalRtResult = db.prepare('SELECT COUNT(*) AS total_rt FROM rt WHERE rw_id = ?').get(Number(id));
      const result = {
        ...rw,
        stats: {
          total_rt: totalRtResult ? totalRtResult.total_rt : 0
        }
      };

      if (with_rt === 'true' || with_rt === '1') {
        result.rt = db.prepare('SELECT * FROM rt WHERE rw_id = ? ORDER BY nomor_rt ASC').all(Number(id));
      }

      return successResponse(res, result, 'Detail data RW berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/rw/:id/rt
  getRt(req, res) {
    try {
      const { id } = req.params;
      const rw = db.prepare(`
        SELECT rw.id, rw.nomor_rw, dk.nama AS desa_kelurahan_nama
        FROM rw
        JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
        WHERE rw.id = ?
      `).get(Number(id));

      if (!rw) {
        return errorResponse(res, `RW dengan ID '${id}' tidak ditemukan`, 404);
      }

      const rtList = db.prepare('SELECT * FROM rt WHERE rw_id = ? ORDER BY nomor_rt ASC').all(Number(id));

      return successResponse(res, rtList, `Daftar RT di ${rw.nomor_rw} ${rw.desa_kelurahan_nama} berhasil diambil`, 200, {
        rw,
        total: rtList.length
      });
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // POST /api/rw
  create(req, res) {
    try {
      const { desa_kelurahan_kode, dusun_id, nomor_rw, nama_ketua, keterangan } = req.body;
      if (!desa_kelurahan_kode || !nomor_rw) {
        return errorResponse(res, 'Field "desa_kelurahan_kode" dan "nomor_rw" wajib diisi', 400);
      }

      const desa = db.prepare('SELECT kode FROM desa_kelurahan WHERE kode = ?').get(desa_kelurahan_kode);
      if (!desa) {
        return errorResponse(res, `Desa/Kelurahan dengan kode '${desa_kelurahan_kode}' tidak ditemukan`, 404);
      }

      if (dusun_id) {
        const dusun = db.prepare('SELECT id FROM dusun WHERE id = ?').get(Number(dusun_id));
        if (!dusun) {
          return errorResponse(res, `Dusun dengan ID '${dusun_id}' tidak ditemukan`, 404);
        }
      }

      const insertResult = db.prepare(`
        INSERT INTO rw (desa_kelurahan_kode, dusun_id, nomor_rw, nama_ketua, keterangan)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        desa_kelurahan_kode,
        dusun_id ? Number(dusun_id) : null,
        nomor_rw,
        nama_ketua || null,
        keterangan || null
      );

      const created = db.prepare('SELECT * FROM rw WHERE id = ?').get(Number(insertResult.lastInsertRowid));
      return successResponse(res, created, 'RW baru berhasil ditambahkan', 201);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // PUT /api/rw/:id
  update(req, res) {
    try {
      const { id } = req.params;
      const { nomor_rw, nama_ketua, keterangan, dusun_id, desa_kelurahan_kode } = req.body;

      const existing = db.prepare('SELECT * FROM rw WHERE id = ?').get(Number(id));
      if (!existing) {
        return errorResponse(res, `RW dengan ID '${id}' tidak ditemukan`, 404);
      }

      const newNomor = nomor_rw || existing.nomor_rw;
      const newKetua = nama_ketua !== undefined ? nama_ketua : existing.nama_ketua;
      const newKet = keterangan !== undefined ? keterangan : existing.keterangan;
      const newDusunId = dusun_id !== undefined ? (dusun_id ? Number(dusun_id) : null) : existing.dusun_id;
      const newDesaKode = desa_kelurahan_kode || existing.desa_kelurahan_kode;

      db.prepare(`
        UPDATE rw 
        SET nomor_rw = ?, nama_ketua = ?, keterangan = ?, dusun_id = ?, desa_kelurahan_kode = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(newNomor, newKetua, newKet, newDusunId, newDesaKode, Number(id));

      const updated = db.prepare('SELECT * FROM rw WHERE id = ?').get(Number(id));
      return successResponse(res, updated, 'Data RW berhasil diperbarui');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // DELETE /api/rw/:id
  delete(req, res) {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM rw WHERE id = ?').get(Number(id));

      if (!existing) {
        return errorResponse(res, `RW dengan ID '${id}' tidak ditemukan`, 404);
      }

      db.prepare('DELETE FROM rw WHERE id = ?').run(Number(id));
      return successResponse(res, existing, `RW '${existing.nomor_rw}' (ID: ${id}) berhasil dihapus`);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new RwController();

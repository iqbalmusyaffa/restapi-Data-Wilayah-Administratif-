const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class KabupatenController {
  // GET /api/kabupaten
  getAll(req, res) {
    try {
      const { provinsi_kode, tipe, zona_waktu, q, page = 1, limit = 50, sort = 'kode', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const sortColumn = ['kode', 'nama', 'tipe', 'ibukota', 'zona_waktu'].includes(sort.toLowerCase()) ? `kk.${sort}` : 'kk.kode';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      let countSql = `
        SELECT COUNT(*) AS total 
        FROM kabupaten_kota kk 
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE 1=1
      `;
      let dataSql = `
        SELECT kk.kode, kk.provinsi_kode, p.nama AS provinsi_nama, p.pulau, kk.tipe, kk.nama, kk.ibukota, kk.zona_waktu, kk.latitude, kk.longitude
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

      if (zona_waktu) {
        countSql += ' AND UPPER(kk.zona_waktu) = ?';
        dataSql += ' AND UPPER(kk.zona_waktu) = ?';
        params.push(zona_waktu.toUpperCase());
      }

      if (q) {
        countSql += ' AND (kk.nama LIKE ? OR kk.kode LIKE ? OR kk.ibukota LIKE ? OR p.nama LIKE ?)';
        dataSql += ' AND (kk.nama LIKE ? OR kk.kode LIKE ? OR kk.ibukota LIKE ? OR p.nama LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
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
        SELECT kk.kode, kk.provinsi_kode, p.nama AS provinsi_nama, p.pulau, kk.tipe, kk.nama, kk.ibukota, kk.zona_waktu, kk.latitude, kk.longitude, kk.created_at, kk.updated_at
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
        SELECT kk.kode, kk.nama, kk.tipe, kk.ibukota, kk.zona_waktu, p.nama AS provinsi_nama
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
      const { kode, provinsi_kode, nama, tipe = 'KABUPATEN', ibukota, zona_waktu = 'WIB', latitude, longitude } = req.body;
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
      db.prepare(`
        INSERT INTO kabupaten_kota (kode, provinsi_kode, tipe, nama, ibukota, zona_waktu, latitude, longitude) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        kode,
        provinsi_kode,
        formattedTipe,
        nama,
        ibukota || null,
        zona_waktu || 'WIB',
        latitude || null,
        longitude || null
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
      const { nama, tipe, provinsi_kode, ibukota, zona_waktu, latitude, longitude } = req.body;

      const existing = db.prepare('SELECT * FROM kabupaten_kota WHERE kode = ?').get(kode);
      if (!existing) {
        return errorResponse(res, `Kabupaten/Kota dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const newNama = nama || existing.nama;
      const newTipe = tipe ? (tipe.toUpperCase() === 'KOTA' ? 'KOTA' : 'KABUPATEN') : existing.tipe;
      const newProvKode = provinsi_kode || existing.provinsi_kode;
      const newIbukota = ibukota !== undefined ? ibukota : existing.ibukota;
      const newZona = zona_waktu !== undefined ? zona_waktu : existing.zona_waktu;
      const newLat = latitude !== undefined ? latitude : existing.latitude;
      const newLng = longitude !== undefined ? longitude : existing.longitude;

      db.prepare(`
        UPDATE kabupaten_kota 
        SET nama = ?, tipe = ?, provinsi_kode = ?, ibukota = ?, zona_waktu = ?, latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE kode = ?
      `).run(newNama, newTipe, newProvKode, newIbukota, newZona, newLat, newLng, kode);

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

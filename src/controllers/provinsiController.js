const { db } = require('../config/database');
const { successResponse, paginatedResponse, errorResponse } = require('../utils/response');

class ProvinsiController {
  // GET /api/provinsi
  getAll(req, res) {
    try {
      const { q, pulau, zona_waktu, page = 1, limit = 50, sort = 'kode', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const sortColumn = ['kode', 'nama', 'pulau', 'zona_waktu', 'ibukota'].includes(sort.toLowerCase()) ? sort : 'kode';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      let countSql = 'SELECT COUNT(*) AS total FROM provinsi WHERE 1=1';
      let dataSql = `SELECT kode, nama, ibukota, zona_waktu, pulau, latitude, longitude FROM provinsi WHERE 1=1`;
      const params = [];

      if (pulau) {
        countSql += ' AND LOWER(pulau) = LOWER(?)';
        dataSql += ' AND LOWER(pulau) = LOWER(?)';
        params.push(pulau.trim());
      }

      if (zona_waktu) {
        countSql += ' AND UPPER(zona_waktu) = UPPER(?)';
        dataSql += ' AND UPPER(zona_waktu) = UPPER(?)';
        params.push(zona_waktu.trim());
      }

      if (q) {
        countSql += ' AND (nama LIKE ? OR kode LIKE ? OR ibukota LIKE ?)';
        dataSql += ' AND (nama LIKE ? OR kode LIKE ? OR ibukota LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
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

  // GET /api/provinsi/pulau - Ringkasan provinsi per pulau
  getPulau(req, res) {
    try {
      const summary = db.prepare(`
        SELECT 
          pulau,
          COUNT(*) AS total_provinsi,
          json_group_array(json_object('kode', kode, 'nama', nama, 'ibukota', ibukota, 'zona_waktu', zona_waktu)) AS daftar_provinsi
        FROM provinsi
        GROUP BY pulau
        ORDER BY total_provinsi DESC
      `).all();

      const parsed = summary.map(item => ({
        pulau: item.pulau,
        total_provinsi: item.total_provinsi,
        provinsi: JSON.parse(item.daftar_provinsi)
      }));

      return successResponse(res, parsed, 'Pengelompokan provinsi berdasarkan pulau besar di Indonesia');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/provinsi/zona-waktu - Ringkasan per zona waktu
  getZonaWaktu(req, res) {
    try {
      const summary = db.prepare(`
        SELECT 
          zona_waktu,
          COUNT(*) AS total_provinsi,
          json_group_array(json_object('kode', kode, 'nama', nama, 'ibukota', ibukota, 'pulau', pulau)) AS daftar_provinsi
        FROM provinsi
        GROUP BY zona_waktu
        ORDER BY zona_waktu ASC
      `).all();

      const parsed = summary.map(item => ({
        zona_waktu: item.zona_waktu,
        total_provinsi: item.total_provinsi,
        provinsi: JSON.parse(item.daftar_provinsi)
      }));

      return successResponse(res, parsed, 'Pengelompokan provinsi berdasarkan zona waktu (WIB, WITA, WIT)');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/provinsi/:kode
  getById(req, res) {
    try {
      const { kode } = req.params;
      const { with_kabupaten } = req.query;

      const provinsi = db.prepare(`
        SELECT kode, nama, ibukota, zona_waktu, pulau, latitude, longitude, created_at, updated_at 
        FROM provinsi 
        WHERE kode = ?
      `).get(kode);

      if (!provinsi) {
        return errorResponse(res, `Provinsi dengan kode '${kode}' tidak ditemukan`, 404);
      }

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
        result.kabupaten_kota = db.prepare(`
          SELECT kode, tipe, nama, ibukota, zona_waktu 
          FROM kabupaten_kota 
          WHERE provinsi_kode = ? 
          ORDER BY kode ASC
        `).all(kode);
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

      const provinsi = db.prepare('SELECT kode, nama, ibukota, zona_waktu, pulau FROM provinsi WHERE kode = ?').get(kode);
      if (!provinsi) {
        return errorResponse(res, `Provinsi dengan kode '${kode}' tidak ditemukan`, 404);
      }

      let sql = 'SELECT kode, provinsi_kode, tipe, nama, ibukota, zona_waktu FROM kabupaten_kota WHERE provinsi_kode = ?';
      const params = [kode];

      if (tipe) {
        sql += ' AND tipe = ?';
        params.push(tipe.toUpperCase());
      }
      if (q) {
        sql += ' AND (nama LIKE ? OR kode LIKE ? OR ibukota LIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
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
      const { kode, nama, ibukota, zona_waktu = 'WIB', pulau, latitude, longitude } = req.body;
      if (!kode || !nama) {
        return errorResponse(res, 'Field "kode" dan "nama" wajib diisi', 400);
      }

      const existing = db.prepare('SELECT kode FROM provinsi WHERE kode = ?').get(kode);
      if (existing) {
        return errorResponse(res, `Provinsi dengan kode '${kode}' sudah terdaftar`, 409);
      }

      db.prepare(`
        INSERT INTO provinsi (kode, nama, ibukota, zona_waktu, pulau, latitude, longitude) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        kode,
        nama,
        ibukota || null,
        zona_waktu || 'WIB',
        pulau || null,
        latitude || null,
        longitude || null
      );

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
      const { nama, ibukota, zona_waktu, pulau, latitude, longitude } = req.body;

      const existing = db.prepare('SELECT * FROM provinsi WHERE kode = ?').get(kode);
      if (!existing) {
        return errorResponse(res, `Provinsi dengan kode '${kode}' tidak ditemukan`, 404);
      }

      const newNama = nama || existing.nama;
      const newIbukota = ibukota !== undefined ? ibukota : existing.ibukota;
      const newZona = zona_waktu !== undefined ? zona_waktu : existing.zona_waktu;
      const newPulau = pulau !== undefined ? pulau : existing.pulau;
      const newLat = latitude !== undefined ? latitude : existing.latitude;
      const newLng = longitude !== undefined ? longitude : existing.longitude;

      db.prepare(`
        UPDATE provinsi 
        SET nama = ?, ibukota = ?, zona_waktu = ?, pulau = ?, latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE kode = ?
      `).run(newNama, newIbukota, newZona, newPulau, newLat, newLng, kode);

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

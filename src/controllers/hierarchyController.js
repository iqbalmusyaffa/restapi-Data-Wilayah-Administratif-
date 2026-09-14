const { db } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

class HierarchyController {
  // GET /api/hierarchy/code/:kode
  getByCode(req, res) {
    try {
      const { kode } = req.params;
      const parts = kode.split('.');
      const hierarchy = {};

      if (parts.length >= 1) {
        const provKode = parts[0];
        hierarchy.provinsi = db.prepare('SELECT kode, nama FROM provinsi WHERE kode = ?').get(provKode);
      }

      if (parts.length >= 2) {
        const kabKode = `${parts[0]}.${parts[1]}`;
        hierarchy.kabupaten_kota = db.prepare('SELECT kode, tipe, nama FROM kabupaten_kota WHERE kode = ?').get(kabKode);
      }

      if (parts.length >= 3) {
        const kecKode = `${parts[0]}.${parts[1]}.${parts[2]}`;
        hierarchy.kecamatan = db.prepare('SELECT kode, nama FROM kecamatan WHERE kode = ?').get(kecKode);
      }

      if (parts.length >= 4) {
        const desaKode = `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}`;
        hierarchy.desa_kelurahan = db.prepare('SELECT kode, tipe, nama, kode_pos FROM desa_kelurahan WHERE kode = ?').get(desaKode);
      }

      if (!hierarchy.provinsi) {
        return errorResponse(res, `Kode wilayah '${kode}' tidak valid atau tidak ditemukan`, 404);
      }

      // Build readable breadcrumb string
      const breadcrumbList = [];
      if (hierarchy.provinsi) breadcrumbList.push(hierarchy.provinsi.nama);
      if (hierarchy.kabupaten_kota) breadcrumbList.push(`${hierarchy.kabupaten_kota.tipe} ${hierarchy.kabupaten_kota.nama}`);
      if (hierarchy.kecamatan) breadcrumbList.push(`Kec. ${hierarchy.kecamatan.nama}`);
      if (hierarchy.desa_kelurahan) breadcrumbList.push(`${hierarchy.desa_kelurahan.tipe} ${hierarchy.desa_kelurahan.nama}`);

      return successResponse(res, {
        kode,
        formatted_address: breadcrumbList.reverse().join(', '),
        hierarchy
      }, 'Hierarki wilayah berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/hierarchy/rt/:id
  getByRtId(req, res) {
    try {
      const { id } = req.params;
      const data = db.prepare(`
        SELECT 
          rt.id AS rt_id, rt.nomor_rt, rt.nama_ketua AS rt_ketua,
          rw.id AS rw_id, rw.nomor_rw, rw.nama_ketua AS rw_ketua,
          d.id AS dusun_id, d.nama AS dusun_nama, d.kepala_dusun,
          dk.kode AS desa_kode, dk.tipe AS desa_tipe, dk.nama AS desa_nama, dk.kode_pos,
          k.kode AS kec_kode, k.nama AS kec_nama,
          kk.kode AS kab_kode, kk.tipe AS kab_tipe, kk.nama AS kab_nama,
          p.kode AS prov_kode, p.nama AS prov_nama
        FROM rt
        JOIN rw ON rt.rw_id = rw.id
        JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
        LEFT JOIN dusun d ON rw.dusun_id = d.id
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE rt.id = ?
      `).get(Number(id));

      if (!data) {
        return errorResponse(res, `RT dengan ID '${id}' tidak ditemukan`, 404);
      }

      const formatted = `${data.nomor_rt}, ${data.nomor_rw}${data.dusun_nama ? ', ' + data.dusun_nama : ''}, ${data.desa_tipe} ${data.desa_nama}, Kec. ${data.kec_nama}, ${data.kab_tipe} ${data.kab_nama}, Prov. ${data.prov_nama}`;

      return successResponse(res, {
        formatted_address: formatted,
        rt: { id: data.rt_id, nomor_rt: data.nomor_rt, nama_ketua: data.rt_ketua },
        rw: { id: data.rw_id, nomor_rw: data.nomor_rw, nama_ketua: data.rw_ketua },
        dusun: data.dusun_id ? { id: data.dusun_id, nama: data.dusun_nama, kepala_dusun: data.kepala_dusun } : null,
        desa_kelurahan: { kode: data.desa_kode, tipe: data.desa_tipe, nama: data.desa_nama, kode_pos: data.kode_pos },
        kecamatan: { kode: data.kec_kode, nama: data.kec_nama },
        kabupaten_kota: { kode: data.kab_kode, tipe: data.kab_tipe, nama: data.kab_nama },
        provinsi: { kode: data.prov_kode, nama: data.prov_nama }
      }, 'Hierarki lengkap RT berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }

  // GET /api/hierarchy/rw/:id
  getByRwId(req, res) {
    try {
      const { id } = req.params;
      const data = db.prepare(`
        SELECT 
          rw.id AS rw_id, rw.nomor_rw, rw.nama_ketua AS rw_ketua,
          d.id AS dusun_id, d.nama AS dusun_nama, d.kepala_dusun,
          dk.kode AS desa_kode, dk.tipe AS desa_tipe, dk.nama AS desa_nama, dk.kode_pos,
          k.kode AS kec_kode, k.nama AS kec_nama,
          kk.kode AS kab_kode, kk.tipe AS kab_tipe, kk.nama AS kab_nama,
          p.kode AS prov_kode, p.nama AS prov_nama
        FROM rw
        JOIN desa_kelurahan dk ON rw.desa_kelurahan_kode = dk.kode
        LEFT JOIN dusun d ON rw.dusun_id = d.id
        JOIN kecamatan k ON dk.kecamatan_kode = k.kode
        JOIN kabupaten_kota kk ON k.kabupaten_kota_kode = kk.kode
        JOIN provinsi p ON kk.provinsi_kode = p.kode
        WHERE rw.id = ?
      `).get(Number(id));

      if (!data) {
        return errorResponse(res, `RW dengan ID '${id}' tidak ditemukan`, 404);
      }

      const formatted = `${data.nomor_rw}${data.dusun_nama ? ', ' + data.dusun_nama : ''}, ${data.desa_tipe} ${data.desa_nama}, Kec. ${data.kec_nama}, ${data.kab_tipe} ${data.kab_nama}, Prov. ${data.prov_nama}`;

      return successResponse(res, {
        formatted_address: formatted,
        rw: { id: data.rw_id, nomor_rw: data.nomor_rw, nama_ketua: data.rw_ketua },
        dusun: data.dusun_id ? { id: data.dusun_id, nama: data.dusun_nama, kepala_dusun: data.kepala_dusun } : null,
        desa_kelurahan: { kode: data.desa_kode, tipe: data.desa_tipe, nama: data.desa_nama, kode_pos: data.kode_pos },
        kecamatan: { kode: data.kec_kode, nama: data.kec_nama },
        kabupaten_kota: { kode: data.kab_kode, tipe: data.kab_tipe, nama: data.kab_nama },
        provinsi: { kode: data.prov_kode, nama: data.prov_nama }
      }, 'Hierarki lengkap RW berhasil diambil');
    } catch (err) {
      return errorResponse(res, err.message);
    }
  }
}

module.exports = new HierarchyController();

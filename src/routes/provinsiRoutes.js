const express = require('express');
const router = express.Router();
const provinsiController = require('../controllers/provinsiController');

// GET /api/provinsi - List & search provinsi (filter: pulau, zona_waktu, q, paging)
router.get('/', (req, res) => provinsiController.getAll(req, res));

// GET /api/provinsi/pulau - Ringkasan per pulau besar
router.get('/pulau', (req, res) => provinsiController.getPulau(req, res));

// GET /api/provinsi/zona-waktu - Ringkasan per zona waktu
router.get('/zona-waktu', (req, res) => provinsiController.getZonaWaktu(req, res));

// POST /api/provinsi - Tambah provinsi baru
router.post('/', (req, res) => provinsiController.create(req, res));

// GET /api/provinsi/:kode - Detail provinsi
router.get('/:kode', (req, res) => provinsiController.getById(req, res));

// GET /api/provinsi/:kode/kabupaten - List kab/kota di provinsi ini
router.get('/:kode/kabupaten', (req, res) => provinsiController.getKabupaten(req, res));

// PUT /api/provinsi/:kode - Update data provinsi
router.put('/:kode', (req, res) => provinsiController.update(req, res));

// DELETE /api/provinsi/:kode - Hapus provinsi
router.delete('/:kode', (req, res) => provinsiController.delete(req, res));

module.exports = router;

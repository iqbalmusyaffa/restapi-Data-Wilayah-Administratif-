const express = require('express');
const router = express.Router();
const kecamatanController = require('../controllers/kecamatanController');

// GET /api/kecamatan - List & search kecamatan
router.get('/', (req, res) => kecamatanController.getAll(req, res));

// POST /api/kecamatan - Tambah kecamatan baru
router.post('/', (req, res) => kecamatanController.create(req, res));

// GET /api/kecamatan/:kode - Detail kecamatan
router.get('/:kode', (req, res) => kecamatanController.getById(req, res));

// GET /api/kecamatan/:kode/desa - List desa/kelurahan di kecamatan ini
router.get('/:kode/desa', (req, res) => kecamatanController.getDesa(req, res));

// PUT /api/kecamatan/:kode - Update data kecamatan
router.put('/:kode', (req, res) => kecamatanController.update(req, res));

// DELETE /api/kecamatan/:kode - Hapus kecamatan
router.delete('/:kode', (req, res) => kecamatanController.delete(req, res));

module.exports = router;

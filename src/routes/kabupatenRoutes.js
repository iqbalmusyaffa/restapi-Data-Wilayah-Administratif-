const express = require('express');
const router = express.Router();
const kabupatenController = require('../controllers/kabupatenController');

// GET /api/kabupaten - List & search kabupaten/kota
router.get('/', (req, res) => kabupatenController.getAll(req, res));

// POST /api/kabupaten - Tambah kab/kota baru
router.post('/', (req, res) => kabupatenController.create(req, res));

// GET /api/kabupaten/:kode - Detail kab/kota
router.get('/:kode', (req, res) => kabupatenController.getById(req, res));

// GET /api/kabupaten/:kode/kecamatan - List kecamatan di kab/kota ini
router.get('/:kode/kecamatan', (req, res) => kabupatenController.getKecamatan(req, res));

// PUT /api/kabupaten/:kode - Update data kab/kota
router.put('/:kode', (req, res) => kabupatenController.update(req, res));

// DELETE /api/kabupaten/:kode - Hapus kab/kota
router.delete('/:kode', (req, res) => kabupatenController.delete(req, res));

module.exports = router;

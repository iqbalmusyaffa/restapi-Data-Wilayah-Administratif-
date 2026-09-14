const express = require('express');
const router = express.Router();
const desaController = require('../controllers/desaController');

// GET /api/desa - List & search desa/kelurahan
router.get('/', (req, res) => desaController.getAll(req, res));

// POST /api/desa - Tambah desa/kelurahan baru
router.post('/', (req, res) => desaController.create(req, res));

// GET /api/desa/:kode - Detail desa/kelurahan
router.get('/:kode', (req, res) => desaController.getById(req, res));

// GET /api/desa/:kode/dusun - List dusun di desa ini
router.get('/:kode/dusun', (req, res) => desaController.getDusun(req, res));

// GET /api/desa/:kode/rw - List RW di desa ini
router.get('/:kode/rw', (req, res) => desaController.getRw(req, res));

// PUT /api/desa/:kode - Update data desa/kelurahan
router.put('/:kode', (req, res) => desaController.update(req, res));

// DELETE /api/desa/:kode - Hapus desa/kelurahan
router.delete('/:kode', (req, res) => desaController.delete(req, res));

module.exports = router;

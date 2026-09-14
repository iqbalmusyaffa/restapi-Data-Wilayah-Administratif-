const express = require('express');
const router = express.Router();
const dusunController = require('../controllers/dusunController');

// GET /api/dusun - List & search dusun
router.get('/', (req, res) => dusunController.getAll(req, res));

// POST /api/dusun - Tambah dusun baru
router.post('/', (req, res) => dusunController.create(req, res));

// GET /api/dusun/:id - Detail dusun
router.get('/:id', (req, res) => dusunController.getById(req, res));

// PUT /api/dusun/:id - Update data dusun
router.put('/:id', (req, res) => dusunController.update(req, res));

// DELETE /api/dusun/:id - Hapus dusun
router.delete('/:id', (req, res) => dusunController.delete(req, res));

module.exports = router;

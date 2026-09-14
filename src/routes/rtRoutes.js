const express = require('express');
const router = express.Router();
const rtController = require('../controllers/rtController');

// GET /api/rt - List & search RT
router.get('/', (req, res) => rtController.getAll(req, res));

// POST /api/rt - Tambah RT baru
router.post('/', (req, res) => rtController.create(req, res));

// GET /api/rt/:id - Detail RT
router.get('/:id', (req, res) => rtController.getById(req, res));

// PUT /api/rt/:id - Update data RT
router.put('/:id', (req, res) => rtController.update(req, res));

// DELETE /api/rt/:id - Hapus RT
router.delete('/:id', (req, res) => rtController.delete(req, res));

module.exports = router;

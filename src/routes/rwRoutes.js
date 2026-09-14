const express = require('express');
const router = express.Router();
const rwController = require('../controllers/rwController');

// GET /api/rw - List & search RW
router.get('/', (req, res) => rwController.getAll(req, res));

// POST /api/rw - Tambah RW baru
router.post('/', (req, res) => rwController.create(req, res));

// GET /api/rw/:id - Detail RW
router.get('/:id', (req, res) => rwController.getById(req, res));

// GET /api/rw/:id/rt - List RT di RW ini
router.get('/:id/rt', (req, res) => rwController.getRt(req, res));

// PUT /api/rw/:id - Update data RW
router.put('/:id', (req, res) => rwController.update(req, res));

// DELETE /api/rw/:id - Hapus RW
router.delete('/:id', (req, res) => rwController.delete(req, res));

module.exports = router;

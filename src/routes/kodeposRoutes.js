const express = require('express');
const router = express.Router();
const kodeposController = require('../controllers/kodeposController');

// GET /api/kodepos - Daftar & pencarian kode pos
router.get('/', (req, res) => kodeposController.getAll(req, res));

// GET /api/kodepos/:kodepos - Detail wilayah berdasarkan 5 digit kode pos
router.get('/:kodepos', (req, res) => kodeposController.getByKodepos(req, res));

module.exports = router;

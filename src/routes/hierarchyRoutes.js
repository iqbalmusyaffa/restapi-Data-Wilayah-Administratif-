const express = require('express');
const router = express.Router();
const hierarchyController = require('../controllers/hierarchyController');

// GET /api/hierarchy/code/:kode - Reverse breadcrumbs dari kode wilayah
router.get('/code/:kode', (req, res) => hierarchyController.getByCode(req, res));

// GET /api/hierarchy/rt/:id - Hierarki lengkap dari RT hingga Provinsi
router.get('/rt/:id', (req, res) => hierarchyController.getByRtId(req, res));

// GET /api/hierarchy/rw/:id - Hierarki lengkap dari RW hingga Provinsi
router.get('/rw/:id', (req, res) => hierarchyController.getByRwId(req, res));

module.exports = router;

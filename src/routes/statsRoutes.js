const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats - Ringkasan statistik wilayah Indonesia
router.get('/', (req, res) => statsController.getStats(req, res));

module.exports = router;

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// GET /api/search?q=...&level=...&limit=...
router.get('/', (req, res) => searchController.search(req, res));

module.exports = router;

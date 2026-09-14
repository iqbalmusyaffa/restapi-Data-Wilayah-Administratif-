const express = require('express');
const router = express.Router();

const provinsiRoutes = require('./provinsiRoutes');
const kabupatenRoutes = require('./kabupatenRoutes');
const kecamatanRoutes = require('./kecamatanRoutes');
const desaRoutes = require('./desaRoutes');
const dusunRoutes = require('./dusunRoutes');
const rwRoutes = require('./rwRoutes');
const rtRoutes = require('./rtRoutes');
const kodeposRoutes = require('./kodeposRoutes');
const searchRoutes = require('./searchRoutes');
const hierarchyRoutes = require('./hierarchyRoutes');
const statsRoutes = require('./statsRoutes');

// Root API info
router.get('/', (req, res) => {
  res.json({
    name: 'REST API Wilayah Administratif & Kode Pos Indonesia',
    version: '1.0.0',
    description: 'API Lengkap 7 Tingkat (Provinsi, Kab/Kota, Kecamatan, Kelurahan/Desa, Dusun, RW, RT) + Kode Pos Resmi',
    documentation: '/api/docs',
    endpoints: {
      stats: '/api/stats',
      search: '/api/search?q={query}',
      kodepos: '/api/kodepos/{kodepos}',
      hierarchy_code: '/api/hierarchy/code/{kode}',
      hierarchy_rt: '/api/hierarchy/rt/{id}',
      provinsi: '/api/provinsi',
      kabupaten_kota: '/api/kabupaten',
      kecamatan: '/api/kecamatan',
      desa_kelurahan: '/api/desa',
      dusun: '/api/dusun',
      rw: '/api/rw',
      rt: '/api/rt'
    }
  });
});

// Register modular routes
router.use('/provinsi', provinsiRoutes);

// Kabupaten / Kota (support both /kabupaten and /kabupaten-kota)
router.use('/kabupaten', kabupatenRoutes);
router.use('/kabupaten-kota', kabupatenRoutes);

router.use('/kecamatan', kecamatanRoutes);

// Desa / Kelurahan (support both /desa and /kelurahan)
router.use('/desa', desaRoutes);
router.use('/kelurahan', desaRoutes);

// Sub-desa levels
router.use('/dusun', dusunRoutes);
router.use('/rw', rwRoutes);
router.use('/rt', rtRoutes);

// Kode Pos (support both /kodepos and /kode-pos)
router.use('/kodepos', kodeposRoutes);
router.use('/kode-pos', kodeposRoutes);

// Search, Hierarchy, & Stats
router.use('/search', searchRoutes);
router.use('/hierarchy', hierarchyRoutes);
router.use('/stats', statsRoutes);

module.exports = router;

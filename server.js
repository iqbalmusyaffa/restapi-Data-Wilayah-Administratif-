const express = require('express');
const cors = require('cors');
const path = require('node:path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const { initSchema, dbPath } = require('./src/config/database');
const apiRoutes = require('./src/routes/index');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Inisialisasi skema tabel jika belum ada
initSchema();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static web dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Swagger UI Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Dokumentasi REST API Wilayah Indonesia',
  customCss: '.swagger-ui .topbar { background-color: #0f172a; }'
}));

// API Routes
app.use('/api', apiRoutes);

// Fallback 404 for undefined routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan. Silakan cek dokumentasi di /api/docs`
    });
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log('================================================================');
    console.log('🇮🇩  REST API WILAYAH ADMINISTRATIF INDONESIA SIAP DIGUNAKAN');
    console.log('================================================================');
    console.log(`🌐 Server Berjalan di     : http://localhost:${PORT}`);
    console.log(`📑 Dokumentasi Swagger    : http://localhost:${PORT}/api/docs`);
    console.log(`🖥️  Web Dashboard Explorer : http://localhost:${PORT}`);
    console.log(`💾 Database SQLite Path   : ${dbPath}`);
    console.log('----------------------------------------------------------------');
    console.log('Endpoint Utama:');
    console.log(` • GET  /api/stats                 (Statistik Total Wilayah)`);
    console.log(` • GET  /api/search?q={query}      (Pencarian Global 7 Level)`);
    console.log(` • GET  /api/hierarchy/code/{kode} (Reverse Breadcrumbs)`);
    console.log(` • GET  /api/provinsi              (38 Provinsi)`);
    console.log(` • GET  /api/kabupaten             (514 Kab/Kota)`);
    console.log(` • GET  /api/kecamatan             (7.200+ Kecamatan)`);
    console.log(` • GET  /api/desa                  (83.000+ Kelurahan/Desa)`);
    console.log(` • CRUD /api/dusun                 (Dusun / Lingkungan)`);
    console.log(` • CRUD /api/rw                    (Rukun Warga)`);
    console.log(` • CRUD /api/rt                    (Rukun Tetangga)`);
    console.log('================================================================');
  });

  process.on('SIGINT', () => {
    server.close(() => {
      console.log('\n[Server] Mematikan server...');
      process.exit(0);
    });
  });
}

module.exports = app;

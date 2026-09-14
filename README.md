# 🇮🇩 REST API Data Wilayah Administratif, Metadata & Kode Pos Seluruh Indonesia

[![Node.js CI](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests: 11 Passing](https://img.shields.io/badge/Tests-11%20Passing-success)](tests/api.test.js)
[![OpenAPI 3.0](https://img.shields.io/badge/Swagger-OpenAPI%203.0-85EA2D?logo=swagger&logoColor=black)](http://localhost:3000/api/docs)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite%20Native-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)

REST API mandiri (*self-contained*), berkinerja tinggi, dan lengkap untuk menyajikan serta mengelola seluruh data wilayah administratif di Indonesia dari tingkat provinsi hingga tingkat komunitas terkecil (7 tingkat) **beserta Data Kode Pos Resmi dan Metadata Geografis**:

1. **Provinsi** (38 Provinsi lengkap resmi Indonesia)
2. **Kabupaten / Kota** (514 Kabupaten & Kota)
3. **Kecamatan / Distrik** (7.285 Kecamatan)
4. **Desa / Kelurahan / Gampong / Nagari / Kampung** (83.762 Desa/Kelurahan)
5. **Dusun / Lingkungan / Banjar / Dukuh**
6. **RW (Rukun Warga)**
7. **RT (Rukun Tetangga)**
8. **📮 Kode Pos Resmi (83.762 Kode Pos Terpetakan)**
9. **🏛️ Metadata Resmi (Ibukota Provinsi, Ibukota Kabupaten, Zona Waktu WIB/WITA/WIT, Pengelompokan Pulau Besar, dan Titik Koordinat GPS)**

---

## ✨ Fitur Utama

- ⚡ **Database SQLite Terindeks & Cepat**: Menggunakan driver SQLite native tanpa perlu setup database MySQL/PostgreSQL tambahan (query sub-millisecond).
- 📮 **Integrasi 83.762 Kode Pos**: Setiap desa/kelurahan telah terpetakan dengan kode pos 5 digit resmi.
- 🏛️ **Metadata Wilayah Kaya**:
  - **Ibukota**: Ibukota Provinsi & Ibukota Kabupaten/Kota.
  - **Zona Waktu**: Pembagian `WIB` (UTC+7), `WITA` (UTC+8), dan `WIT` (UTC+9).
  - **Pulau Besar**: Filter wilayah berdasarkan pulau (*Sumatera, Jawa, Kalimantan, Sulawesi, Bali & Nusa Tenggara, Maluku, Papua*).
  - **Koordinat GPS**: Titik *Latitude* & *Longitude* pusat wilayah.
- 🔄 **Seeder Otomatis Cepat**: Mengunduh dan mempopulasikan seluruh 91.000+ data wilayah, kode pos, dan metadata hanya dalam ~3 detik.
- 🧭 **Navigasi Cascading & Reverse Breadcrumbs**: Menelusuri pohon hierarki dari atas ke bawah maupun *reverse lookup* dari ID RT/RW atau Kode Pos ke Provinsi.
- 🔍 **Pencarian Global Multi-Level**: Cari wilayah berdasarkan nama, kode Kemendagri, ibukota, atau 5 digit kode pos di `/api/search?q=...`.
- 📑 **Dokumentasi Interaktif Swagger UI**: Dokumentasi OpenAPI 3.0 lengkap di `/api/docs`.
- 🖥️ **Web Dashboard Explorer**: Antarmuka visual di `/` untuk menelusuri wilayah, filter pulau/zona waktu, dan live JSON inspector.
- 🛠️ **Operasi CRUD Lengkap**: Endpoint `POST`, `PUT`, `DELETE` untuk penambahan dan pengeditan data wilayah (khususnya Dusun, RW, dan RT).
- 🧪 **Automated Test Suite**: 11 skenario pengujian komprehensif (`npm test`) yang terintegrasi dengan GitHub Actions CI.

---

## 🚀 Cara Menjalankan

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18+ (direkomendasikan Node.js 20 / 22 / 24)

### 2. Clone Repositori & Instalasi
```bash
git clone https://github.com/iqbalmusyaffa/restapi-Data-Wilayah-Administratif-.git
cd restapi-Data-Wilayah-Administratif-
npm install
```

### 3. Buat File Konfigurasi .env
Salin template konfigurasi dari `.env.example`:
```bash
cp .env.example .env
```

### 4. Mengunduh & Mempopulasikan Database (Seeding)
Jalankan seeder otomatis untuk mengunduh dan menyusun database SQLite lokal:
```bash
npm run seed
```

### 5. Menjalankan Server API
Mode Produksi:
```bash
npm start
```
Mode Development (Auto-Reload saat file diedit):
```bash
npm run dev
```

Aplikasi siap diakses di:
- **🖥️ Web Dashboard Explorer**: [http://localhost:3000](http://localhost:3000)
- **📑 Dokumentasi Swagger UI**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **⚡ API Root Discovery**: [http://localhost:3000/api](http://localhost:3000/api)

### 6. Menjalankan Pengujian Otomatis
```bash
npm test
```

---

## 🐳 Menjalankan dengan Docker

Anda juga dapat menjalankan aplikasi menggunakan Docker Compose:
```bash
docker compose up -d
```
Aplikasi akan otomatis melakukan *build*, *seeding*, dan aktif di port `3000`.

---

## 📖 Katalog Lengkap Endpoint REST API

### 1. Ringkasan, Metadata, Pencarian & Kode Pos
| Method | Endpoint | Deskripsi | Parameter Query |
|---|---|---|---|
| `GET` | `/api/stats` | Statistik ringkasan seluruh wilayah & kode pos | - |
| `GET` | `/api/pulau` | Pengelompokan 38 provinsi berdasarkan Pulau Besar | - |
| `GET` | `/api/zona-waktu` | Pengelompokan provinsi berdasarkan zona waktu (WIB, WITA, WIT) | - |
| `GET` | `/api/kodepos/:kodepos` | Detail wilayah berdasarkan 5-digit Kode Pos | - |
| `GET` | `/api/kodepos` | Daftar kode pos seluruh Indonesia | `q`, `provinsi_kode`, `page`, `limit` |
| `GET` | `/api/search` | Pencarian global multi-tingkat | `q` (wajib), `level`, `limit` |
| `GET` | `/api/hierarchy/code/:kode` | Reverse breadcrumbs alamat dari kode Kemendagri | - |
| `GET` | `/api/hierarchy/rt/:id` | Hierarki lengkap alamat dari RT sampai Provinsi | - |
| `GET` | `/api/hierarchy/rw/:id` | Hierarki lengkap alamat dari RW sampai Provinsi | - |

### 2. Tingkat I: Provinsi (38 Provinsi)
| Method | Endpoint | Deskripsi | Parameter Query |
|---|---|---|---|
| `GET` | `/api/provinsi` | Daftar 38 provinsi beserta metadata | `pulau`, `zona_waktu`, `q`, `page`, `limit`, `sort`, `order` |
| `GET` | `/api/provinsi/:kode` | Detail provinsi + Ibukota + Zona Waktu + GPS | `with_kabupaten=true` |
| `GET` | `/api/provinsi/:kode/kabupaten` | Daftar kab/kota di provinsi tertentu | `tipe` (KABUPATEN/KOTA), `q` |
| `POST` | `/api/provinsi` | Menambahkan provinsi baru | Body: `kode`, `nama`, `ibukota`, `zona_waktu`, `pulau` |
| `PUT` | `/api/provinsi/:kode` | Memperbarui data provinsi | Body: `nama`, `ibukota`, `zona_waktu`, `pulau` |
| `DELETE` | `/api/provinsi/:kode` | Menghapus provinsi | - |

### 3. Tingkat II: Kabupaten & Kota (514 Kab/Kota)
| Method | Endpoint | Deskripsi | Parameter Query |
|---|---|---|---|
| `GET` | `/api/kabupaten` | Daftar kab/kota se-Indonesia | `provinsi_kode`, `tipe`, `zona_waktu`, `q`, `page`, `limit` |
| `GET` | `/api/kabupaten/:kode` | Detail kabupaten/kota beserta ibukotanya | `with_kecamatan=true` |
| `GET` | `/api/kabupaten/:kode/kecamatan`| Daftar kecamatan di kabupaten/kota | `q` |
| `POST` | `/api/kabupaten` | Menambahkan kab/kota baru | Body: `kode`, `provinsi_kode`, `tipe`, `nama`, `ibukota` |
| `PUT` | `/api/kabupaten/:kode` | Memperbarui data kab/kota | Body: `nama`, `tipe`, `ibukota`, `zona_waktu` |
| `DELETE` | `/api/kabupaten/:kode` | Menghapus kab/kota | - |

### 4. Tingkat III: Kecamatan (7.285 Kecamatan)
| Method | Endpoint | Deskripsi | Parameter Query |
|---|---|---|---|
| `GET` | `/api/kecamatan` | Daftar kecamatan | `kabupaten_kota_kode`, `provinsi_kode`, `q`, `page`, `limit` |
| `GET` | `/api/kecamatan/:kode` | Detail kecamatan | `with_desa=true` |
| `GET` | `/api/kecamatan/:kode/desa` | Daftar desa/kelurahan di kecamatan | `tipe`, `q` |
| `POST` | `/api/kecamatan` | Menambahkan kecamatan baru | Body: `kode`, `kabupaten_kota_kode`, `nama` |
| `PUT` | `/api/kecamatan/:kode` | Memperbarui data kecamatan | Body: `nama`, `kabupaten_kota_kode` |
| `DELETE` | `/api/kecamatan/:kode` | Menghapus kecamatan | - |

### 5. Tingkat IV: Desa & Kelurahan (83.762 Desa/Kelurahan)
| Method | Endpoint | Deskripsi | Parameter Query |
|---|---|---|---|
| `GET` | `/api/desa` | Daftar desa/kelurahan beserta kode pos | `kecamatan_kode`, `kabupaten_kota_kode`, `tipe`, `q`, `page`, `limit` |
| `GET` | `/api/desa/:kode` | Detail desa/kelurahan | `with_dusun=true`, `with_rw=true` |
| `GET` | `/api/desa/:kode/dusun` | Daftar dusun di desa/kelurahan | - |
| `GET` | `/api/desa/:kode/rw` | Daftar RW di desa/kelurahan | - |
| `POST` | `/api/desa` | Menambahkan desa/kelurahan baru | Body: `kode`, `kecamatan_kode`, `tipe`, `nama`, `kode_pos` |
| `PUT` | `/api/desa/:kode` | Memperbarui data desa/kelurahan | Body: `nama`, `tipe`, `kode_pos` |
| `DELETE` | `/api/desa/:kode` | Menghapus desa/kelurahan | - |

### 6. Tingkat V: Dusun / Lingkungan
| Method | Endpoint | Deskripsi | Parameter Query |
|---|---|---|---|
| `GET` | `/api/dusun` | Daftar dusun | `desa_kelurahan_kode`, `q`, `page`, `limit` |
| `GET` | `/api/dusun/:id` | Detail dusun | `with_rw=true` |
| `POST` | `/api/dusun` | Menambahkan dusun baru | Body: `desa_kelurahan_kode`, `nama`, `kepala_dusun`, `keterangan` |
| `PUT` | `/api/dusun/:id` | Memperbarui data dusun | Body: `nama`, `kepala_dusun`, `keterangan` |
| `DELETE` | `/api/dusun/:id` | Menghapus dusun | - |

### 7. Tingkat VI: RW (Rukun Warga)
| Method | Endpoint | Deskripsi | Parameter Query |
|---|---|---|---|
| `GET` | `/api/rw` | Daftar RW | `desa_kelurahan_kode`, `dusun_id`, `q`, `page`, `limit` |
| `GET` | `/api/rw/:id` | Detail RW | `with_rt=true` |
| `GET` | `/api/rw/:id/rt` | Daftar RT di RW ini | - |
| `POST` | `/api/rw` | Menambahkan RW baru | Body: `desa_kelurahan_kode`, `nomor_rw`, `nama_ketua`, `keterangan` |
| `PUT` | `/api/rw/:id` | Memperbarui data RW | Body: `nomor_rw`, `nama_ketua`, `keterangan` |
| `DELETE` | `/api/rw/:id` | Menghapus RW | - |

### 8. Tingkat VII: RT (Rukun Tetangga)
| Method | Endpoint | Deskripsi | Parameter Query |
|---|---|---|---|
| `GET` | `/api/rt` | Daftar RT | `rw_id`, `desa_kelurahan_kode`, `q`, `page`, `limit` |
| `GET` | `/api/rt/:id` | Detail RT beserta hierarki lengkap | - |
| `POST` | `/api/rt` | Menambahkan RT baru | Body: `rw_id`, `nomor_rt`, `nama_ketua`, `keterangan` |
| `PUT` | `/api/rt/:id` | Memperbarui data RT | Body: `nomor_rt`, `nama_ketua`, `keterangan` |
| `DELETE` | `/api/rt/:id` | Menghapus RT | - |

---

## 💻 Contoh Response API

### 1. Detail Provinsi dengan Metadata Lengkap (`GET /api/provinsi/32`)
```json
{
  "success": true,
  "message": "Detail data provinsi berhasil diambil",
  "data": {
    "kode": "32",
    "nama": "Jawa Barat",
    "ibukota": "Kota Bandung",
    "zona_waktu": "WIB",
    "pulau": "Jawa",
    "latitude": -6.917464,
    "longitude": 107.619123,
    "stats": {
      "kabupaten_kota": 27,
      "kecamatan": 627,
      "desa_kelurahan": 5957
    }
  }
}
```

### 2. Pencarian Berdasarkan Kode Pos (`GET /api/kodepos/40151`)
```json
{
  "success": true,
  "message": "Ditemukan 1 wilayah untuk kode pos 40151",
  "data": [
    {
      "kode_pos": "40151",
      "desa_kelurahan_kode": "32.73.01.1004",
      "desa_tipe": "KELURAHAN",
      "desa_kelurahan_nama": "Sarijadi",
      "kecamatan_kode": "32.73.01",
      "kecamatan_nama": "Sukasari",
      "kabupaten_kota_kode": "32.73",
      "kabupaten_kota_tipe": "KOTA",
      "kabupaten_kota_nama": "Kota Bandung",
      "provinsi_kode": "32",
      "provinsi_nama": "Jawa Barat"
    }
  ],
  "meta": {
    "kodepos": "40151",
    "total": 1
  }
}
```

### 3. Pengelompokan Pulau Besar (`GET /api/pulau`)
```json
{
  "success": true,
  "message": "Pengelompokan provinsi berdasarkan pulau besar di Indonesia",
  "data": [
    {
      "pulau": "Sumatera",
      "total_provinsi": 10,
      "provinsi": [
        { "kode": "11", "nama": "Aceh", "ibukota": "Kota Banda Aceh", "zona_waktu": "WIB" },
        { "kode": "12", "nama": "Sumatera Utara", "ibukota": "Kota Medan", "zona_waktu": "WIB" }
      ]
    },
    {
      "pulau": "Jawa",
      "total_provinsi": 6,
      "provinsi": [
        { "kode": "31", "nama": "DKI Jakarta", "ibukota": "Kota Jakarta Pusat", "zona_waktu": "WIB" },
        { "kode": "32", "nama": "Jawa Barat", "ibukota": "Kota Bandung", "zona_waktu": "WIB" }
      ]
    }
  ]
}
```

---

## 📦 Koleksi Postman
File `postman_collection.json` sudah tersedia di repositori ini dan dapat langsung diimpor ke aplikasi **Postman** atau **Insomnia** untuk pengujian menyeluruh.

---

## 📜 Lisensi
Proyek ini didistribusikan di bawah lisensi **MIT License** - Bebas digunakan dan dimodifikasi untuk kebutuhan komersial maupun non-komersial.

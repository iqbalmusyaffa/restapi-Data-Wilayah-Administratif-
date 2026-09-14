# 🇮🇩 REST API Data Wilayah Administratif & Kode Pos Seluruh Indonesia

REST API mandiri, berkinerja tinggi, dan lengkap untuk mengelola serta menyajikan data wilayah administratif di Indonesia dari tingkat provinsi hingga tingkat komunitas terkecil (7 tingkat) **beserta Data Kode Pos Resmi**:
1. **Provinsi** (38 Provinsi lengkap resmi Indonesia)
2. **Kabupaten / Kota** (514 Kabupaten & Kota)
3. **Kecamatan / Distrik** (7.285 Kecamatan)
4. **Desa / Kelurahan / Gampong / Nagari / Kampung** (83.762 Desa/Kelurahan)
5. **Dusun / Lingkungan / Banjar / Dukuh**
6. **RW (Rukun Warga)**
7. **RT (Rukun Tetangga)**
8. **📮 Kode Pos Resmi (83.762 Kode Pos)**

---

## ✨ Fitur Utama

- ⚡ **Database Terpadu & Terindeks**: Menggunakan SQLite lokal berkecepatan tinggi dengan indeks optimal (query sub-millisecond).
- 📮 **Integrasi Kode Pos Lengkap**: 83.762 Desa/Kelurahan telah terpetakan dengan 5-digit Kode Pos resmi.
- 🔄 **Seeder Otomatis**: Mengunduh dan mem-parsing seluruh 91.000+ data resmi Kemendagri & Kode Pos hanya dalam 3 detik.
- 🧭 **Navigasi Cascading & Hierarki**: Mendukung pencarian turun (*top-down*) maupun *reverse lookup* (*breadcrumbs*) dari level RT/RW/Kode Pos sampai ke Provinsi.
- 🔍 **Pencarian Global Multi-Level**: Cari wilayah berdasarkan nama, kode Kemendagri, atau kode pos pada endpoint `/api/search?q=...`.
- 📑 **Dokumentasi Interaktif Swagger UI**: Tersedia langsung di `/api/docs`.
- 🖥️ **Web Dashboard Explorer**: Antarmuka interaktif di `/` untuk menelusuri wilayah dan kode pos secara visual.
- 🛠️ **Operasi CRUD Lengkap**: Dukungan pembuatan, pengeditan, dan penghapusan data (terutama Dusun, RW, dan RT).
- 🧪 **Automated Test Suite**: 11 skenario pengujian komprehensif (`npm test`).

---

## 🚀 Cara Menjalankan

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 18+ (direkomendasikan Node.js 20 / 22 / 24)

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Mengunduh & Mempopulasikan Database (Seeding)
Jalankan perintah ini untuk mengunduh seluruh data wilayah dan kode pos se-Indonesia ke database SQLite:
```bash
npm run seed
```

### 4. Menjalankan Server API
Mode Produksi:
```bash
npm start
```
Mode Development (Auto-Reload):
```bash
npm run dev
```

Server akan aktif di:
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Swagger Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **API Root**: [http://localhost:3000/api](http://localhost:3000/api)

### 5. Menjalankan Pengujian Otomatis
```bash
npm test
```

---

## 📖 Ringkasan Endpoint API

### 1. Ringkasan, Pencarian & Kode Pos
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/stats` | Statistik total wilayah & kode pos se-Indonesia |
| `GET` | `/api/kodepos/:kodepos` | Cari seluruh desa/kec/kab/provinsi dari 5-digit Kode Pos |
| `GET` | `/api/kodepos` | Daftar kode pos dengan pagination & filter |
| `GET` | `/api/search?q={query}&level={level}` | Pencarian global multi-tingkat (nama, kode, kode pos) |
| `GET` | `/api/hierarchy/code/{kode}` | Reverse hierarchy / breadcrumbs dari kode Kemendagri |
| `GET` | `/api/hierarchy/rt/{id}` | Hierarki lengkap alamat dari RT ke Provinsi |
| `GET` | `/api/hierarchy/rw/{id}` | Hierarki lengkap alamat dari RW ke Provinsi |

### 2. Tingkat I: Provinsi
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/provinsi` | Daftar seluruh 38 provinsi (`q`, `page`, `limit`, `sort`) |
| `GET` | `/api/provinsi/:kode` | Detail provinsi + ringkasan jumlah kab/kec/desa |
| `GET` | `/api/provinsi/:kode/kabupaten` | Daftar kab/kota di provinsi tertentu |
| `POST` | `/api/provinsi` | Menambahkan provinsi baru |
| `PUT` | `/api/provinsi/:kode` | Memperbarui nama provinsi |
| `DELETE` | `/api/provinsi/:kode` | Menghapus provinsi |

### 3. Tingkat II: Kabupaten & Kota
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/kabupaten` | Daftar kab/kota (filter `provinsi_kode`, `tipe`, `q`) |
| `GET` | `/api/kabupaten/:kode` | Detail kabupaten/kota |
| `GET` | `/api/kabupaten/:kode/kecamatan`| Daftar kecamatan di kabupaten/kota |
| `POST` | `/api/kabupaten` | Menambahkan kab/kota baru |
| `PUT` | `/api/kabupaten/:kode` | Memperbarui data kab/kota |
| `DELETE` | `/api/kabupaten/:kode` | Menghapus kab/kota |

### 4. Tingkat III: Kecamatan
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/kecamatan` | Daftar kecamatan (filter `kabupaten_kota_kode`, `q`) |
| `GET` | `/api/kecamatan/:kode` | Detail kecamatan |
| `GET` | `/api/kecamatan/:kode/desa` | Daftar desa/kelurahan di kecamatan |
| `POST` | `/api/kecamatan` | Menambahkan kecamatan baru |
| `PUT` | `/api/kecamatan/:kode` | Memperbarui data kecamatan |
| `DELETE` | `/api/kecamatan/:kode` | Menghapus kecamatan |

### 5. Tingkat IV: Desa & Kelurahan
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/desa` | Daftar desa/kelurahan (filter `kecamatan_kode`, `tipe`, `q`) |
| `GET` | `/api/desa/:kode` | Detail desa/kelurahan (`?with_dusun=true&with_rw=true`) |
| `GET` | `/api/desa/:kode/dusun` | Daftar dusun di desa/kelurahan |
| `GET` | `/api/desa/:kode/rw` | Daftar RW di desa/kelurahan |
| `POST` | `/api/desa` | Menambahkan desa/kelurahan baru |
| `PUT` | `/api/desa/:kode` | Memperbarui data desa/kelurahan |
| `DELETE` | `/api/desa/:kode` | Menghapus desa/kelurahan |

### 6. Tingkat V: Dusun / Lingkungan
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/dusun` | Daftar dusun (filter `desa_kelurahan_kode`, `q`) |
| `GET` | `/api/dusun/:id` | Detail dusun |
| `POST` | `/api/dusun` | Menambahkan dusun baru |
| `PUT` | `/api/dusun/:id` | Memperbarui data dusun |
| `DELETE` | `/api/dusun/:id` | Menghapus dusun |

### 7. Tingkat VI: RW (Rukun Warga)
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/rw` | Daftar RW (filter `desa_kelurahan_kode`, `dusun_id`) |
| `GET` | `/api/rw/:id` | Detail RW |
| `GET` | `/api/rw/:id/rt` | Daftar RT di RW |
| `POST` | `/api/rw` | Menambahkan RW baru |
| `PUT` | `/api/rw/:id` | Memperbarui data RW |
| `DELETE` | `/api/rw/:id` | Menghapus RW |

### 8. Tingkat VII: RT (Rukun Tetangga)
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/rt` | Daftar RT (filter `rw_id`, `desa_kelurahan_kode`) |
| `GET` | `/api/rt/:id` | Detail RT beserta hierarki lengkap |
| `POST` | `/api/rt` | Menambahkan RT baru |
| `PUT` | `/api/rt/:id` | Memperbarui data RT |
| `DELETE` | `/api/rt/:id` | Menghapus RT |

---

## 💻 Contoh Response Kode Pos (`GET /api/kodepos/40151`)

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

---

## 📦 Koleksi Postman
File `postman_collection.json` sudah disediakan di folder utama untuk langsung diimpor ke aplikasi Postman.

---

## 📜 Lisensi
MIT License - Bebas digunakan dan dimodifikasi untuk kebutuhan komersial maupun non-komersial.

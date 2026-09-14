document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const statProv = document.getElementById('stat-provinsi');
  const statKab = document.getElementById('stat-kabupaten');
  const statKec = document.getElementById('stat-kecamatan');
  const statDesa = document.getElementById('stat-desa');
  const statKodepos = document.getElementById('stat-kodepos');
  const statDusun = document.getElementById('stat-dusun');
  const statRw = document.getElementById('stat-rw');
  const statRt = document.getElementById('stat-rt');

  const selectProvinsi = document.getElementById('select-provinsi');
  const selectKabupaten = document.getElementById('select-kabupaten');
  const selectKecamatan = document.getElementById('select-kecamatan');
  const selectDesa = document.getElementById('select-desa');

  const desaInfoBadge = document.getElementById('desa-info-badge');
  const desaDetailTitle = document.getElementById('desa-detail-title');
  const desaPostalBadge = document.getElementById('desa-postal-badge');
  const desaDetailSub = document.getElementById('desa-detail-sub');

  const subLevelsWrapper = document.getElementById('sub-levels-wrapper');
  const currentDesaName = document.getElementById('current-desa-name');
  const countDusun = document.getElementById('count-dusun');
  const countRw = document.getElementById('count-rw');
  const countRt = document.getElementById('count-rt');

  const dusunListContainer = document.getElementById('dusun-list-container');
  const rwListContainer = document.getElementById('rw-list-container');
  const rtListContainer = document.getElementById('rt-list-container');

  const activeApiUrl = document.getElementById('active-api-url');
  const linkOpenTab = document.getElementById('link-open-tab');
  const jsonViewer = document.getElementById('json-viewer');

  const globalSearchInput = document.getElementById('global-search-input');
  const searchLevelFilter = document.getElementById('search-level-filter');
  const searchBtn = document.getElementById('search-btn');
  const searchResultsContainer = document.getElementById('search-results-container');

  const btnCopyUrl = document.getElementById('btn-copy-url');
  const btnCopyJson = document.getElementById('btn-copy-json');

  let activeData = null;

  // 1. Fetch & display statistics
  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      if (json.success && json.data && json.data.summary) {
        const s = json.data.summary;
        statProv.textContent = s.provinsi.toLocaleString('id-ID');
        statKab.textContent = s.kabupaten_kota.total.toLocaleString('id-ID');
        statKec.textContent = s.kecamatan.toLocaleString('id-ID');
        statDesa.textContent = s.desa_kelurahan.total.toLocaleString('id-ID');
        if (statKodepos) statKodepos.textContent = s.desa_kelurahan.total.toLocaleString('id-ID');
        statDusun.textContent = s.dusun.toLocaleString('id-ID');
        statRw.textContent = s.rw.toLocaleString('id-ID');
        statRt.textContent = s.rt.toLocaleString('id-ID');
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  }

  // Helper to update JSON viewer
  async function fetchAndInspect(endpoint) {
    activeApiUrl.value = endpoint;
    linkOpenTab.href = endpoint;
    jsonViewer.textContent = '// Mengambil data dari ' + endpoint + ' ...';

    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      activeData = json;
      jsonViewer.textContent = JSON.stringify(json, null, 2);
      return json;
    } catch (err) {
      jsonViewer.textContent = '// Gagal memuat data: ' + err.message;
      return null;
    }
  }

  // 2. Load Provinsi list
  async function loadProvinsi() {
    const json = await fetchAndInspect('/api/provinsi?limit=100');
    if (json && json.data) {
      selectProvinsi.innerHTML = '<option value="">-- Pilih Provinsi --</option>';
      json.data.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.kode;
        opt.textContent = `${p.kode} - ${p.nama}`;
        selectProvinsi.appendChild(opt);
      });
    }
  }

  // 3. Provinsi Change Event
  selectProvinsi.addEventListener('change', async () => {
    const provKode = selectProvinsi.value;
    selectKabupaten.innerHTML = '<option value="">-- Memuat Kab/Kota... --</option>';
    selectKabupaten.disabled = true;
    selectKecamatan.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
    selectKecamatan.disabled = true;
    selectDesa.innerHTML = '<option value="">-- Pilih Desa / Kelurahan --</option>';
    selectDesa.disabled = true;
    desaInfoBadge.classList.add('hidden');
    subLevelsWrapper.classList.add('hidden');

    if (!provKode) {
      fetchAndInspect('/api/provinsi?limit=100');
      selectKabupaten.innerHTML = '<option value="">-- Pilih Kabupaten / Kota --</option>';
      return;
    }

    const endpoint = `/api/provinsi/${provKode}/kabupaten`;
    const json = await fetchAndInspect(endpoint);

    if (json && json.data) {
      selectKabupaten.innerHTML = '<option value="">-- Pilih Kabupaten / Kota --</option>';
      json.data.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k.kode;
        opt.textContent = `${k.kode} - ${k.nama}`;
        selectKabupaten.appendChild(opt);
      });
      selectKabupaten.disabled = false;
    }
  });

  // 4. Kabupaten Change Event
  selectKabupaten.addEventListener('change', async () => {
    const kabKode = selectKabupaten.value;
    selectKecamatan.innerHTML = '<option value="">-- Memuat Kecamatan... --</option>';
    selectKecamatan.disabled = true;
    selectDesa.innerHTML = '<option value="">-- Pilih Desa / Kelurahan --</option>';
    selectDesa.disabled = true;
    desaInfoBadge.classList.add('hidden');
    subLevelsWrapper.classList.add('hidden');

    if (!kabKode) {
      selectKecamatan.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
      return;
    }

    const endpoint = `/api/kabupaten/${kabKode}/kecamatan`;
    const json = await fetchAndInspect(endpoint);

    if (json && json.data) {
      selectKecamatan.innerHTML = '<option value="">-- Pilih Kecamatan --</option>';
      json.data.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k.kode;
        opt.textContent = `${k.kode} - ${k.nama}`;
        selectKecamatan.appendChild(opt);
      });
      selectKecamatan.disabled = false;
    }
  });

  // 5. Kecamatan Change Event
  selectKecamatan.addEventListener('change', async () => {
    const kecKode = selectKecamatan.value;
    selectDesa.innerHTML = '<option value="">-- Memuat Desa/Kelurahan... --</option>';
    selectDesa.disabled = true;
    desaInfoBadge.classList.add('hidden');
    subLevelsWrapper.classList.add('hidden');

    if (!kecKode) {
      selectDesa.innerHTML = '<option value="">-- Pilih Desa / Kelurahan --</option>';
      return;
    }

    const endpoint = `/api/kecamatan/${kecKode}/desa`;
    const json = await fetchAndInspect(endpoint);

    if (json && json.data) {
      selectDesa.innerHTML = '<option value="">-- Pilih Desa / Kelurahan --</option>';
      json.data.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.kode;
        const postalText = d.kode_pos ? ` [Pos: ${d.kode_pos}]` : '';
        opt.textContent = `${d.kode} - [${d.tipe}] ${d.nama}${postalText}`;
        selectDesa.appendChild(opt);
      });
      selectDesa.disabled = false;
    }
  });

  // 6. Desa Change Event
  selectDesa.addEventListener('change', async () => {
    const desaKode = selectDesa.value;
    if (!desaKode) {
      desaInfoBadge.classList.add('hidden');
      subLevelsWrapper.classList.add('hidden');
      return;
    }

    const endpoint = `/api/desa/${desaKode}?with_dusun=true&with_rw=true`;
    const json = await fetchAndInspect(endpoint);

    if (json && json.data) {
      const d = json.data;
      currentDesaName.textContent = d.nama;

      // Update Desa summary info card
      desaDetailTitle.textContent = `${d.tipe} ${d.nama} (${d.kode})`;
      desaPostalBadge.textContent = d.kode_pos ? `📮 Kode Pos: ${d.kode_pos}` : '📮 Kode Pos: -';
      desaDetailSub.textContent = `Kec. ${d.kecamatan_nama}, ${d.kabupaten_kota_nama}, ${d.provinsi_nama}`;
      desaInfoBadge.classList.remove('hidden');

      subLevelsWrapper.classList.remove('hidden');
      renderSubLevels(d);
    }
  });

  // Render Dusun, RW, RT
  async function renderSubLevels(desaData) {
    const desaKode = desaData.kode;

    // Dusun
    const dusunList = desaData.dusun || [];
    countDusun.textContent = dusunList.length;
    dusunListContainer.innerHTML = '';
    if (dusunList.length === 0) {
      dusunListContainer.innerHTML = '<p class="text-muted" style="padding:0.5rem;font-size:0.8rem;">Belum ada data dusun.</p>';
    } else {
      dusunList.forEach(d => {
        const div = document.createElement('div');
        div.className = 'level-row';
        div.innerHTML = `
          <div>
            <div class="name">🌳 ${d.nama}</div>
            <div class="sub">Kepala Dusun: ${d.kepala_dusun || '-'} | ID: ${d.id}</div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="window.viewHierarchy('dusun', ${d.id})">Info</button>
        `;
        dusunListContainer.appendChild(div);
      });
    }

    // RW
    const rwList = desaData.rw || [];
    countRw.textContent = rwList.length;
    rwListContainer.innerHTML = '';
    if (rwList.length === 0) {
      rwListContainer.innerHTML = '<p class="text-muted" style="padding:0.5rem;font-size:0.8rem;">Belum ada data RW.</p>';
    } else {
      rwList.forEach(r => {
        const div = document.createElement('div');
        div.className = 'level-row';
        div.innerHTML = `
          <div>
            <div class="name">👥 ${r.nomor_rw}</div>
            <div class="sub">Ketua: ${r.nama_ketua || '-'} | Total RT: ${r.total_rt || 0}</div>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="window.viewHierarchy('rw', ${r.id})">Info</button>
        `;
        rwListContainer.appendChild(div);
      });
    }

    // RT
    try {
      const rtRes = await fetch(`/api/rt?desa_kelurahan_kode=${desaKode}&limit=100`);
      const rtJson = await rtRes.json();
      const rtList = rtJson.data || [];
      countRt.textContent = rtList.length;
      rtListContainer.innerHTML = '';
      if (rtList.length === 0) {
        rtListContainer.innerHTML = '<p class="text-muted" style="padding:0.5rem;font-size:0.8rem;">Belum ada data RT.</p>';
      } else {
        rtList.forEach(t => {
          const div = document.createElement('div');
          div.className = 'level-row';
          div.innerHTML = `
            <div>
              <div class="name">🏠 ${t.nomor_rt} (${t.nomor_rw})</div>
              <div class="sub">Ketua: ${t.nama_ketua || '-'} | ID: ${t.id}</div>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="window.viewHierarchy('rt', ${t.id})">Info</button>
          `;
          rtListContainer.appendChild(div);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Global handler for viewing hierarchy
  window.viewHierarchy = (type, id) => {
    if (type === 'rt') {
      fetchAndInspect(`/api/hierarchy/rt/${id}`);
    } else if (type === 'rw') {
      fetchAndInspect(`/api/hierarchy/rw/${id}`);
    } else if (type === 'dusun') {
      fetchAndInspect(`/api/dusun/${id}?with_rw=true`);
    }
  };

  // 7. Tabs switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // 8. Global Search
  async function performSearch() {
    const q = globalSearchInput.value.trim();
    if (!q) return;

    const level = searchLevelFilter.value;
    
    // If searching specifically for 5-digit kodepos
    if (level === 'kodepos' || (/^\d{5}$/.test(q) && level === 'all')) {
      const endpoint = `/api/kodepos/${encodeURIComponent(q)}`;
      searchResultsContainer.classList.remove('hidden');
      searchResultsContainer.innerHTML = '<p class="text-muted">Mencari kode pos...</p>';
      const json = await fetchAndInspect(endpoint);

      if (!json || !json.data || json.data.length === 0) {
        searchResultsContainer.innerHTML = `<p class="text-muted">Tidak ada wilayah ditemukan untuk kode pos "${q}".</p>`;
        return;
      }

      searchResultsContainer.innerHTML = '';
      const groupTitle = document.createElement('div');
      groupTitle.className = 'search-group-title';
      groupTitle.textContent = `📮 KODE POS ${q} (${json.data.length} Wilayah)`;
      searchResultsContainer.appendChild(groupTitle);

      json.data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
          <div class="search-item-info">
            <span class="item-code">${item.desa_kelurahan_kode}</span>
            <strong>${item.desa_tipe} ${item.desa_kelurahan_nama}</strong>
            <span class="postal-tag">Pos: ${item.kode_pos}</span>
            <div class="search-item-sub">Kec. ${item.kecamatan_nama} • ${item.kabupaten_kota_tipe} ${item.kabupaten_kota_nama} • ${item.provinsi_nama}</div>
          </div>
          <button class="btn btn-sm btn-outline">Detail Desa</button>
        `;
        div.addEventListener('click', () => {
          fetchAndInspect(`/api/desa/${item.desa_kelurahan_kode}?with_dusun=true&with_rw=true`);
        });
        searchResultsContainer.appendChild(div);
      });
      return;
    }

    const endpoint = `/api/search?q=${encodeURIComponent(q)}${level !== 'all' ? '&level=' + level : ''}`;
    
    searchResultsContainer.classList.remove('hidden');
    searchResultsContainer.innerHTML = '<p class="text-muted">Mencari...</p>';

    const json = await fetchAndInspect(endpoint);
    if (!json || !json.data) {
      searchResultsContainer.innerHTML = '<p class="text-muted">Tidak ada hasil yang ditemukan.</p>';
      return;
    }

    searchResultsContainer.innerHTML = '';
    const results = json.data;

    let hasAny = false;
    for (const [lvlKey, items] of Object.entries(results)) {
      if (items && items.length > 0) {
        hasAny = true;
        const groupTitle = document.createElement('div');
        groupTitle.className = 'search-group-title';
        groupTitle.textContent = `${lvlKey.replace('_', ' ').toUpperCase()} (${items.length})`;
        searchResultsContainer.appendChild(groupTitle);

        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'search-item';
          const code = item.kode || `ID: ${item.id}`;
          const name = item.nama || item.nomor_rw || item.nomor_rt;
          const postalBadge = item.kode_pos ? `<span class="postal-tag">Pos: ${item.kode_pos}</span>` : '';
          const sub = [item.desa_kelurahan_nama, item.kecamatan_nama, item.kabupaten_kota_nama, item.provinsi_nama].filter(Boolean).join(' • ');

          div.innerHTML = `
            <div class="search-item-info">
              <span class="item-code">${code}</span>
              <strong>${name}</strong>
              ${postalBadge}
              <div class="search-item-sub">${sub}</div>
            </div>
            <button class="btn btn-sm btn-outline">Lihat Detail</button>
          `;

          div.addEventListener('click', () => {
            if (item.kode) {
              fetchAndInspect(`/api/hierarchy/code/${item.kode}`);
            } else if (item.level === 'rt') {
              fetchAndInspect(`/api/hierarchy/rt/${item.id}`);
            } else if (item.level === 'rw') {
              fetchAndInspect(`/api/hierarchy/rw/${item.id}`);
            } else if (item.level === 'dusun') {
              fetchAndInspect(`/api/dusun/${item.id}`);
            }
          });

          searchResultsContainer.appendChild(div);
        });
      }
    }

    if (!hasAny) {
      searchResultsContainer.innerHTML = `<p class="text-muted">Tidak ada hasil ditemukan untuk kata kunci "${q}".</p>`;
    }
  }

  searchBtn.addEventListener('click', performSearch);
  globalSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // 9. Quick Add Actions (Dusun / RW / RT)
  document.getElementById('btn-add-dusun').addEventListener('click', async () => {
    const desaKode = selectDesa.value;
    if (!desaKode) return alert('Pilih Desa/Kelurahan terlebih dahulu!');

    const nama = prompt('Masukkan Nama Dusun / Lingkungan:');
    if (!nama) return;
    const kadus = prompt('Masukkan Nama Kepala Dusun (opsional):') || '';

    try {
      const res = await fetch('/api/dusun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desa_kelurahan_kode: desaKode,
          nama: nama,
          kepala_dusun: kadus
        })
      });
      const created = await res.json();
      fetchAndInspect(`/api/dusun/${created.data.id}`);
      loadStats();
      selectDesa.dispatchEvent(new Event('change'));
      alert(`Dusun '${nama}' berhasil ditambahkan!`);
    } catch (e) {
      alert('Gagal menambahkan dusun: ' + e.message);
    }
  });

  document.getElementById('btn-add-rw').addEventListener('click', async () => {
    const desaKode = selectDesa.value;
    if (!desaKode) return alert('Pilih Desa/Kelurahan terlebih dahulu!');

    const nomorRw = prompt('Masukkan Nomor RW (contoh: RW 05):');
    if (!nomorRw) return;
    const ketua = prompt('Masukkan Nama Ketua RW (opsional):') || '';

    try {
      const res = await fetch('/api/rw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desa_kelurahan_kode: desaKode,
          nomor_rw: nomorRw,
          nama_ketua: ketua
        })
      });
      const created = await res.json();
      fetchAndInspect(`/api/rw/${created.data.id}`);
      loadStats();
      selectDesa.dispatchEvent(new Event('change'));
      alert(`RW '${nomorRw}' berhasil ditambahkan!`);
    } catch (e) {
      alert('Gagal menambahkan RW: ' + e.message);
    }
  });

  document.getElementById('btn-add-rt').addEventListener('click', async () => {
    const desaKode = selectDesa.value;
    if (!desaKode) return alert('Pilih Desa/Kelurahan terlebih dahulu!');

    const rwRes = await fetch(`/api/rw?desa_kelurahan_kode=${desaKode}`);
    const rwJson = await rwRes.json();
    const rws = rwJson.data || [];

    if (rws.length === 0) {
      return alert('Belum ada RW di desa ini. Silakan buat RW terlebih dahulu!');
    }

    const rwId = rws[0].id;
    const nomorRt = prompt(`Masukkan Nomor RT (untuk ${rws[0].nomor_rw}, contoh: RT 03):`);
    if (!nomorRt) return;
    const ketua = prompt('Masukkan Nama Ketua RT (opsional):') || '';

    try {
      const res = await fetch('/api/rt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rw_id: rwId,
          nomor_rt: nomorRt,
          nama_ketua: ketua
        })
      });
      const created = await res.json();
      fetchAndInspect(`/api/rt/${created.data.id}`);
      loadStats();
      selectDesa.dispatchEvent(new Event('change'));
      alert(`RT '${nomorRt}' berhasil ditambahkan!`);
    } catch (e) {
      alert('Gagal menambahkan RT: ' + e.message);
    }
  });

  // 10. Copy buttons
  btnCopyUrl.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.origin + activeApiUrl.value);
    btnCopyUrl.textContent = 'Copied!';
    setTimeout(() => btnCopyUrl.textContent = 'Copy URL', 1500);
  });

  btnCopyJson.addEventListener('click', () => {
    navigator.clipboard.writeText(jsonViewer.textContent);
    btnCopyJson.textContent = 'Copied!';
    setTimeout(() => btnCopyJson.textContent = 'Copy JSON', 1500);
  });

  // Init
  loadStats();
  loadProvinsi();
});

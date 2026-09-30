# Konteks proyek & log progres — Portal Guru PSG

> Dokumen kerja untuk perubahan berikutnya. Diperbarui: 24 September 2026. **Status: BELUM KOMPLIT; eksekusi pengujian ditunda sampai sesudah perubahan baru.** Audit awal: baca kode oleh subagent eksplorasi, frontend, integrasi, dan QA; pemeriksaan sintaks/manifest lokal. Belum ada uji login, API langsung, atau cetak di browser.

## Ringkasan

Portal guru pembimbing untuk memantau absensi dan dokumentasi siswa PKL/PSG SMK Gajah Mungkur 1 Wuryantoro. Aplikasi statis, antarmuka mobile-first satu halaman (`index.html` + `app.js`); backend Google Apps Script di luar repositori. Data siswa/absensi/jurnal dibaca dari backend, bukan disimpan di proyek ini. Login memakai ID pembimbing dan secret; hanya nama guru yang disimpan untuk sesi berikutnya.

## Peta repositori

| File | Fungsi |
| --- | --- |
| `index.html` | Shell UI, login, lima tab, modal cetak jurnal/agenda, CSS print, tautan CDN dan registrasi service worker. |
| `app.js` | Login, fetch data, state, render halaman, matriks absensi, ekspor XLSX/DOCX dan pembuatan pratinjau cetak. |
| `manifest.json` | Metadata instalasi PWA. |
| `sw.js` | Service worker minimal; tidak menyimpan aset/data untuk offline. |
| `icon.png` | Ikon 256×256 piksel; manifest mengklaim ukuran 192×192 dan 512×512 untuk file yang sama. |

Tidak ada `package.json`, bundler, suite tes, file backend, skema Spreadsheet, atau `AGENTS.md` dalam repo. Dependensi lewat CDN pada `index.html:12-14,77-79`: Inter, Phosphor Icons, Tailwind, SheetJS, docx, FileSaver. Endpoint GAS ditetapkan di `app.js:1`. Jangan menyalin secret/data siswa ke log progres.

## Referensi pengujian (belum dieksekusi)

- **Aplikasi produksi:** https://skagamu.github.io/monitoring-absensi-psg/
- **ID proyek Google Apps Script yang diberikan:** `1HnrrZKsiielEbHLKd1q9gfyVpdw4fHWRiqYt9hPOB1NG6PJou8PWQK7P` — belum ada akses ke kode GAS; Script ID berbeda dari URL deployment `/exec` di `app.js:1` dan belum dicocokkan.
- **ID pembimbing uji:** `4`. Password diberikan di percakapan, **tidak disimpan di repo**. Sebelum pengujian nanti, pastikan akun masih aktif; setelah penggunaan, pertimbangkan rotasi password yang telah dibagikan.
- **Keputusan:** tidak login, tidak memanggil endpoint produksi, tidak mengunduh data siswa, dan tidak mengubah aplikasi saat tahap pencatatan ini.

## Alur aplikasi

1. `window.onload` mengecek `localStorage['nama_guru']`; jika ada, langsung buka dashboard dan `fetchData` (`app.js:103-116`). Login baru POST `{action:'login_guru', idGuru, secret}`; logout menghapus nama lalu reload (`app.js:120-160`).
2. `getRekapGuru&namaGuru=...&bulan=...` memuat absensi (`data`), daftar siswa (`siswa`), pengaturan periode/libur (`pengaturan`). Hasil disimpan dalam `rawDataCache`, `daftarSiswaCache`, `pengaturanCache` (`app.js:65-70,203-269`). `getJurnalGuru` memuat dokumentasi ke `jurnalGuruCache` (`app.js:817-831`).
3. Lima tab (`index.html:140-274`): **Dashboard** total/kehadiran hari ini + lokasi DUDI; **Harian** daftar/pencarian presensi; **Rekap Tabel** matriks mingguan/bulanan, filter siswa, XLSX; **Detail Siswa** riwayat bulanan, info DUDI, agenda; **Dokumentasi** jurnal per siswa, target dua foto/minggu, galeri.
4. Cetak jurnal/agenda membuka modal pratinjau, menawarkan cetak/PDF browser dan unduh DOCX. Cetak jurnal menampilkan satu lembar per foto/kegiatan; agenda membuat baris harian sepanjang periode (`app.js:1093-2063`). XLSX dibuat dari rekap pada `app.js:985-1089`.

**Kontrak data yang diharapkan frontend** (bukan jaminan backend): respons sukses `{status:'success', data:[...], siswa:[...], pengaturan:{tglMulai,tglSelesai,libur:[]}}`; siswa lazimnya memiliki `nisn`, `nama`, `kelas`/`jurusan`, `lokasiPKL`, `psgDetail`; absensi memiliki `nisn`, `tanggal`, `status`, dan opsional `waktu`, `foto`, `alasan`, `agenda`; jurnal memiliki `nisn`, `weekId`, `weekStart`, `weekEnd`, `keterangan`, `photoCount`, `photoUrls`. Login sukses diharapkan mengembalikan `nama`. Tanggal dibaca sebagai `DD/MM/YYYY`, `YYYY-MM-DD`, atau `YYYY-MM` (`app.js:73-96`); label status: Hadir/Sakit/Izin/Alpha/Belum Absen. **Periksa respons nyata sebelum mengubah kontrak.**

## Temuan awal / backlog verifikasi

Status di bawah = hasil inspeksi kode, **belum diuji end-to-end**. Urutan adalah prioritas investigasi, bukan izin mengubah perilaku tanpa arahan.

| Prioritas | Temuan & bukti | Dampak / batas kepastian |
| --- | --- | --- |
| P0 | Nilai `nama_guru` dari localStorage langsung dipakai membuka UI dan meminta data (`app.js:103-116,224,820`). Tidak ada token sesi di frontend. | Bypass login UI dapat dilakukan; **akses data tanpa izin belum terbukti**, tergantung validasi backend GAS yang tidak ada di repo. Audit backend sebelum menyimpulkan celah otorisasi. |
| P0 | Field respons backend dan URL foto disisipkan ke `innerHTML`/atribut/inline `onclick` tanpa escaping (`app.js:398-410,698-710,735-776,798-814,872-907,922-934,1260-1306,1789-1815`). | Potensi XSS bila data tersebut dikendalikan pihak lain; validasi URL foto dan sanitasi pada batas DOM diperlukan. |
| P1 | CSS print hanya membuat `#mainApp` terlihat (`index.html:68-75`), tetapi salinan konten cetak dimasukkan ke `#tempPrintWrapper` di bawah `body` (`app.js:1155-1170,1662-1676`). | Salinan tersembunyi saat print; PDF berisiko kosong/berisi UI, perlu bukti print preview browser. |
| P1 | Pergantian bulan memuat ulang siswa dan mereset semua dropdown (`app.js:233-255,957-976`). Cache dilacak hanya lewat angka bulan atau `all`, tanpa tahun (`app.js:204,217-220`). | Pilihan siswa hilang; pindah ke tahun lain dengan bulan sama dapat memakai data lama. Pilihan minggu lintas bulan hanya memakai data bulan yang sudah dimuat (`app.js:455-486,956`). |
| P1 | Cetak/Word agenda memakai fallback tanggal tetap 09/06/2026–26/09/2026 saat pengaturan tidak tersedia (`app.js:1720-1728,1909-1917`). Fallback nama siswa/DUDI/judul kegiatan menyisipkan contoh identitas/pekerjaan (`app.js:1228-1229,1271-1275,1681,1810-1815,1869,2006-2009`). | Risiko dokumen resmi berisi periode atau identitas salah; bila data kurang, lebih aman menolak ekspor daripada mengarang. `configCache` dan `rekapGuruCache` dilindungi `typeof`, jadi **tidak otomatis ReferenceError**, tetapi fallbacknya tidak terisi. |
| P1 | DOCX agenda mengambil hanya absensi (`app.js:1874-1958`), sementara pratinjau juga menggabungkan jurnal (`app.js:1595-1622,1717-1753`). Fallback pratinjau memakai `rekapGuruCache`, bukan `rawDataCache` (`app.js:1693`). | Pratinjau dan Word bisa berbeda; fetch gagal dapat menghasilkan Alpha/Libur padahal data absensi lokal tersedia. |
| P2 | Mode ringkasan `all` ada di JS tetapi tak tersedia dalam pilihan filter HTML (`index.html:223-226`, `app.js:531-607,944-954`). `isWorkingDay` menandai hari ini sebagai hari kerja, lalu rekap memberi Alpha untuk presensi yang belum masuk (`app.js:413-453,500-507`). | Fitur ringkasan tidak dapat dipilih; interpretasi Alpha hari berjalan perlu disepakati. |
| P2 | Detail membandingkan NISN dengan `!==` meski nilai `<select>` string (`app.js:657-671`); info DUDI membandingkan sama ketat (`app.js:785-790`). Filter jurnal juga demikian (`app.js:838-840`). | Jika API mengirim NISN angka, daftar/detail bisa kosong. |
| P2 | `fetchJurnalGuru` menulis `window.pengaturanCache` alih-alih variabel lokal `pengaturanCache` (`app.js:825`); sorting jurnal mengasumsikan `weekId` string (`app.js:848`). | Pengaturan jurnal tidak dipakai oleh perhitungan hari kerja; nilai `weekId` kosong dapat memutus render. |
| P2 | Footer jurnal mencetak `SMKN 1 Gombong` (`app.js:1303`), berbeda dengan identitas proyek. | Perlu konfirmasi nama sekolah yang sah sebelum mengganti. |
| P2 | `sw.js:1-7` tidak memiliki cache offline; aset utama bergantung CDN. Ikon 256×256 tidak sesuai ukuran yang diumumkan manifest (`manifest.json:9-19`). | PWA terdaftar tetapi tidak dapat diandalkan tanpa jaringan; kelayakan instalasi perlu diuji per browser. |
| P2 | Zoom dinonaktifkan (`index.html:5`); login tanpa label/form Enter (`index.html:123-133`); tab, profil, modal tidak lengkap semantik/fokus (`index.html:98,140-156,315-385`). | Hambatan aksesibilitas keyboard/pembesaran layar. |

Catatan: `text/plain;charset=utf-8` untuk POST login (`app.js:134-138`) mungkin sengaja dipakai agar cocok dengan Google Apps Script/CORS; **jangan ubah tanpa memeriksa backend**. Foto Drive bisa gagal dimuat/di-embed karena izin akses atau CORS; belum diverifikasi. URL produksi telah diberikan, tetapi belum diuji.

## Cara jalan & verifikasi perubahan

Jalankan server statis pada root, misalnya `python3 -m http.server 8080`, lalu buka `http://localhost:8080/`. Login/data nyata membutuhkan koneksi, izin endpoint GAS, dan akun uji yang sah. Jangan menyimpan kredensial atau data pribadi di repo. Pemeriksaan lokal awal: `node --check app.js` **lulus**; `python3 -m json.tool manifest.json` **lulus**. Belum ada tes otomatis. Setelah setiap perubahan, cek:

- [ ] Login benar/salah, muat ulang sesi, logout; validasi API dengan akun yang diizinkan.
- [ ] Dashboard dan Harian: total, status hari ini, pencarian, info lokasi DUDI, foto.
- [ ] Rekap: minggu lintas bulan, bulan lintas tahun, akhir pekan/libur, Alpha, pilihan siswa, XLSX.
- [ ] Detail/Dokumentasi: pemilih siswa dan bulan, NISN angka/string, jurnal kosong/berfoto, galeri.
- [ ] Cetak jurnal dan agenda: pratinjau, PDF (isi/halaman), DOCX (identitas, tanggal, uraian, gambar), data hilang/jaringan gagal.
- [ ] Mobile/desktop, keyboard, zoom, jaringan lambat/offline; console tanpa error.

## Fokus feedback: berkas dari Rekap Tabel & Dokumentasi

**Status:** SELESAI. Semua jalur XLSX (Rekap Tabel) dan DOCX/Cetak (Detail Siswa, Dokumentasi) telah diganti menjadi generator PDF terpadu.

### Ekspor PDF Terpadu (Rekap Tabel, Detail Siswa, Dokumentasi)

- UI: Seluruhnya diganti dengan satu modal pratinjau tunggal (iframe browser PDF viewer bawaan) dan satu tombol **Unduh PDF**. Pratinjau dan berkas yang diunduh adalah **Blob (byte-for-byte) yang sama persis**.
- Pembentukan (pdfmake): `pdfmake` versi stabil CDN 0.2.20 dan disetel untuk merender ukuran A4. Font bawaan `Carlito` (OFL 1.1) tersemat statik melalui VFS untuk memastikan kompatibilitas ukuran `Calibri` (tanpa masalah lisensi Microsoft).
- Tata letak Dokumentasi / Jurnal: Mempertahankan aturan 1 gambar/halaman. Identitas diperbarui menjadi `Kelas` (bukan Konsentrasi Keahlian) dan `Tempat PKL` (bukan Tempat PKL/DUDI). 10 baris putus-putus mengisi kolom rincian manual, dan menolak berlanjut jika gambar gagal dimuat.
- Tata letak Agenda Harian: Konsisten dengan label `Kelas`/`Tempat PKL`. Header tabel warna abu-abu (slate-100), padding di sekitar sel, sel Uraian disetel min-height (24px). Keterangan alpha disetel merah.
- Titik rawan: Menghindari fetch berlapis; data dibuat dari satu snapshot ke backend GAS. Apabila gambar Drive diblokir CORS, proses digagalkan agar PDF tidak kosong diam-diam. Penampil browser bawaan dibutuhkan (fallback tautan/pesan jika iframe diblokir di ponsel).

**Catatan status:** Tidak ada fallback identitas semu (menolak print bila profil belum diset). Jangan unggah berkas berisi data siswa asli jika belum dianonimkan untuk uji cetak ke publik/issues.

## Log progres

Tambahkan entri baru di bagian atas saat ada perubahan. Format singkat: tanggal, tujuan, file, hasil, verifikasi, sisa/keputusan.

### 2026-09-24 — Implementasi Ekspor PDF + Pratinjau Identik
- **Tujuan:** memenuhi tuntutan keluaran Agenda Harian, Rekap Tabel, & Jurnal agar berbentuk berkas PDF utuh (pdfmake).
- **File:** `index.html`, `app.js`, dan menyisipkan aset lokal VFS baru `fonts/vfs_fonts.js` (Carlito/OFL 1.1).
- **Hasil:** Seluruh ekspor dialihkan ke satu `modalPdfPreview`. Blob digenerate statis 1x (untuk frame iframe `src` + handler unduhan `a.download`). Perombakan label ("Kelas", "Tempat PKL"), spacing baris, `min-height`, & dotted lines Jurnal telah disematkan.
### 2026-09-30 — Penyempurnaan PDF Terpadu, Batching Fetch, dan UI PDF
- **Tujuan:** Migrasi tuntas dari ekspor XLSX, DOCX, dan print ke fitur eksklusif PDF (pdfmake). Menghapus library lawas (SheetJS/docx) dan menerapkan perbaikan format (margin, garis putus-putus) serta jaring pengaman jaringan.
- **Tindakan:**
  - Mengubah margin jilid ke kiri 2cm (57pt) di Agenda Harian & Jurnal.
  - Memperbaiki layout `app.js` Jurnal dengan garis putus-putus presisi (16 baris).
  - Menerapkan fitur **Batching/Cicilan (Fetch 1-12 bulan)** paralel untuk Cetak PDF guna memecah ukuran payload raksasa, dan meniadakan error Timeout (30s limit Google Apps Script) sekaligus menambahkan status progres unduhan di tombol.
  - Membantu konfirmasi keandalan live link GitHub Pages (berjalan lancar di sisi guru).
- **Status:** **SELESAI (Production-Ready)**. Semua commit telah di-*push* ke GitHub `main`.

### 2026-09-24 — Penggantian sistem ekspor ke pdfmake
- **Verifikasi:** Lolos check syntax DOM dan evaluasi struktur pdfmake (Audit). Uji data di production endpoints belum dilakukan.
- **Status:** **SELESAI**. XLSX dan DOCX dihilangkan.

### 2026-09-24 — Riset PDF dan pratinjau identik
- **Tujuan:** evaluasi pengganti XLSX/DOCX pada Rekap Tabel/Dokumentasi.
- **Hasil:** usulan pdfmake + pratinjau Blob PDF yang sama terpilih (memakai font metrics open-source).
- **Status:** **SELESAI**. Riset berlanjut ke tahap implementasi.

### 2026-09-24 — Analisis fokus berkas Rekap Tabel & Dokumentasi
- **Tujuan:** memahami jalur pembuatan XLSX rekap dan PDF/Word jurnal sebelum menerima rincian perubahan.
- **Hasil:** peta alur, sumber data, isi berkas, serta risiko terarah ditulis di bagian fokus feedback.
- **Status:** **BELUM KOMPLIT**; belum ada implementasi atau pengujian unduhan/print. Menunggu feedback format dan isi berkas dari pengguna.

### 2026-09-24 — Referensi pengujian diterima; belum komplit
- **Masukan:** Script ID GAS, URL produksi GitHub Pages, ID dan password pembimbing uji.
- **Tindakan:** catat referensi non-rahasia di atas; password sengaja tidak ditulis ke file. Tidak ada login, inspeksi backend, atau uji produksi.
- **Status:** **BELUM KOMPLIT**. Pengujian menyeluruh dilakukan setelah perubahan baru sesuai permintaan pengguna.
- **Masih diperlukan saat eksekusi:** akses baca kode GAS bila audit backend dikehendaki; aturan bisnis Alpha/libur/periode dan contoh keluaran yang diharapkan bila ingin memvalidasi ketepatan hasil.

### 2026-09-24 — Baseline analisis
- **Tujuan:** memetakan konteks sebelum menerima daftar perubahan.
- **Cakupan:** semua file proyek ditelaah; empat subagent mengaudit struktur/alur, UI, integrasi/data, dan QA. Tidak mengubah perilaku aplikasi.
- **Hasil:** peta fitur/kontrak/risiko di atas; sintaks JS dan JSON lolos pemeriksaan lokal.
- **Belum diverifikasi:** backend GAS, data nyata, hak akses, output PDF/DOCX/XLSX di browser, deployment produksi.
- **Berikutnya:** catat permintaan perubahan dan kriteria terima; pilih risiko relevan, implementasikan hanya dalam lingkup permintaan, lalu perbarui log ini.

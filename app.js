const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzJWdUPFWpuGEm6jY1cVsgUr-h1S9qAewQxDPxn3R9vkEQ9I8tnPaItJDchdt_TAE2blg/exec";

// DOM Elements
const sectionLogin = document.getElementById('loginSection');
const mainApp = document.getElementById('mainApp');
const inputIdGuru = document.getElementById('inputIdGuru');
const inputSecret = document.getElementById('inputSecret');
const btnLanjut = document.getElementById('btnLanjut');
const userProfile = document.getElementById('userProfile');
const displayNamaGuru = document.getElementById('displayNamaGuru');
const btnProfileMenu = document.getElementById('btnProfileMenu');
const dropdownMenu = document.getElementById('dropdownMenu');
const loadingOverlay = document.getElementById('loadingOverlay');

const searchHarian = document.getElementById('searchHarian');
const searchPeriodik = document.getElementById('searchPeriodik');
const selectPeriodikSiswa = document.getElementById('selectPeriodikSiswa');
const filterPeriodik = document.getElementById('filterPeriodik');
const weekSelector = document.getElementById('weekSelector');
const monthSelector = document.getElementById('monthSelector');
const btnDownloadRekapPdf = document.getElementById('btnDownloadRekapPdf');
const selectDetailSiswa = document.getElementById('selectDetailSiswa');
const detailMonthSelector = document.getElementById('detailMonthSelector');
const listDetailSiswa = document.getElementById('listDetailSiswa');

// Initialize selectors default values
const initNow = new Date();
const currentMonthStr = `${initNow.getFullYear()}-${(initNow.getMonth()+1).toString().padStart(2,'0')}`;
monthSelector.value = currentMonthStr;
detailMonthSelector.value = currentMonthStr;

function getWeekStr(d) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    const week = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}
weekSelector.value = getWeekStr(initNow);

function getMondayFromWeek(weekStr) {
    if (!weekStr) return null;
    const parts = weekStr.split('-W');
    if (parts.length !== 2) return null;
    const year = +parts[0];
    const week = +parts[1];
    if (isNaN(year) || isNaN(week)) return null;
    const d = new Date(year, 0, 1);
    const dayNum = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayNum);
    d.setDate(d.getDate() + 7 * (week - 1) - 3);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getCurrentMonday() {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

// State
let rawDataCache = [];
let daftarSiswaCache = [];
let pengaturanCache = { tglMulai: '', tglSelesai: '', libur: [] };
let jurnalGuruCache = [];
let currentTab = 'dashboard';

// Utilities
const parseDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : new Date(val.getTime());
    if (typeof val !== 'string') return null;
    const s = val.trim();
    if (!s) return null;
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
        const d = new Date(+m[3], +m[2] - 1, +m[1]);
        return (d.getFullYear() === +m[3] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[1]) ? d : null;
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    if (m) {
        const d = new Date(+m[1], +m[2] - 1, +m[3]);
        return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? d : null;
    }
    m = s.match(/^(\d{4})-(\d{1,2})$/);
    if (m) {
        const d = new Date(+m[1], +m[2] - 1, 1);
        return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1) ? d : null;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};
const getTodayStr = () => {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
};

// Init
window.onload = () => {
    const savedNamaGuru = localStorage.getItem('nama_guru');
    if (savedNamaGuru) {
        setLoggedInState(savedNamaGuru);
    }
};

function setLoggedInState(nama) {
    displayNamaGuru.innerText = nama;
    userProfile.style.display = 'flex';
    sectionLogin.style.display = 'none';
    mainApp.style.display = 'flex';
    switchTab('dashboard');
    fetchData(nama);
}

// Login Process
btnLanjut.addEventListener('click', async () => {
    const idGuru = inputIdGuru.value.trim();
    const secret = inputSecret.value.trim();
    if (!idGuru || !secret) {
        showToast("Mohon masukkan ID dan Kata Sandi", "error");
        return;
    }

    const originalText = btnLanjut.innerHTML;
    btnLanjut.innerHTML = `<div class="spinner w-5 h-5 border-2 border-white/20 border-t-white rounded-full"></div> Verifikasi...`;
    btnLanjut.disabled = true;

    try {
        const payload = { action: "login_guru", idGuru: idGuru, secret: secret };
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            localStorage.setItem('nama_guru', result.nama);
            setLoggedInState(result.nama);
            showToast("Login Berhasil!");
        } else {
            showToast(result.message, "error");
        }
    } catch (e) {
        showToast("Koneksi gagal saat memverifikasi.", "error");
    } finally {
        btnLanjut.innerHTML = originalText;
        btnLanjut.disabled = false;
    }
});

// Logout
document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('nama_guru');
    window.location.reload();
});

if (btnProfileMenu && dropdownMenu) {
    btnProfileMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!btnProfileMenu.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });
}

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentTab = e.currentTarget.getAttribute('data-target');
        switchTab(currentTab);
        renderCurrentTab();
    });
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.add('hidden');
        c.classList.remove('flex');
    });
    const target = document.getElementById('tab-' + tabId);
    if(target) {
        target.classList.remove('hidden');
        if(tabId !== 'dashboard') target.classList.add('flex');
    }
    // Show/hide PSG info based on tab
    const psgSection = document.getElementById('psgInfoSection');
    if (psgSection) {
        if (tabId === 'dashboard') psgSection.classList.remove('hidden');
        else psgSection.classList.add('hidden');
    }
}

// Fetch Data
let currentLoadedMonth = null;

async function fetchData(namaGuru, bulan = null) {
    if (!bulan) {
        const now = new Date();
        bulan = (now.getMonth() + 1).toString();
    }
    
    // Skip fetching if we already have 'all' data, or if we already have this exact month's data
    if (currentLoadedMonth === 'all' && bulan !== 'all') {
        renderCurrentTab();
        return;
    }
    if (currentLoadedMonth === bulan) {
        renderCurrentTab();
        return;
    }

    loadingOverlay.classList.remove('hidden');
    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getRekapGuru&namaGuru=${encodeURIComponent(namaGuru)}&bulan=${bulan}`;
        const res = await fetch(url);
        const result = await res.json();
        
        if (result.status === 'success') {
            rawDataCache = result.data || [];
            daftarSiswaCache = result.siswa || [];
            pengaturanCache = result.pengaturan || { tglMulai: '', tglSelesai: '', libur: [] };
            
            // Populate Detail & Periodik Siswa Select
            selectDetailSiswa.innerHTML = '<option value="">-- Pilih Siswa --</option>';
            if (selectPeriodikSiswa) selectPeriodikSiswa.innerHTML = '<option value="">-- Pilih Siswa --</option>';
            const selectJurnalSiswa = document.getElementById('selectJurnalSiswa');
            selectJurnalSiswa.innerHTML = '<option value="all">Semua Siswa</option>';
            daftarSiswaCache.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.nisn;
                opt.textContent = s.nama;
                selectDetailSiswa.appendChild(opt);

                if (selectPeriodikSiswa) {
                    const optP = document.createElement('option');
                    optP.value = s.nisn;
                    optP.textContent = s.nama;
                    selectPeriodikSiswa.appendChild(optP);
                }
                
                const opt2 = document.createElement('option');
                opt2.value = s.nisn;
                opt2.textContent = s.nama;
                selectJurnalSiswa.appendChild(opt2);
            });
            
            
            renderCurrentTab();
            currentLoadedMonth = bulan;
            
            // Fetch jurnal data
            fetchJurnalGuru(namaGuru, bulan);
        } else {
            showToast(result.message, "error");
        }
    } catch (e) {
        showToast("Gagal memuat data rekap.", "error");
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

// Global Filter Logic (Raw filtered items, no dummy padding)
function getFilteredData(waktu, keyword) {
    const now = new Date();
    
    let filtered = rawDataCache.filter(item => {
        if (waktu === 'all') return true;
        if (waktu === 'today') {
            const itemDate = parseDate(item.tanggal);
            return itemDate && itemDate.getDate() === now.getDate() && itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
        if (waktu === 'week') {
            const itemDate = parseDate(item.tanggal);
            if (!itemDate) return false;
            let monday = getMondayFromWeek(weekSelector ? weekSelector.value : null) || getCurrentMonday();
            const sunday = new Date(monday.getTime());
            sunday.setDate(sunday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            return itemDate >= monday && itemDate <= sunday;
        }
        if (waktu === 'month') {
            const itemDate = parseDate(item.tanggal);
            if (!itemDate) return false;
            const monthVal = (monthSelector && monthSelector.value) || currentMonthStr;
            const parsedMonth = parseDate(monthVal);
            if (parsedMonth) {
                return itemDate.getFullYear() === parsedMonth.getFullYear() && itemDate.getMonth() === parsedMonth.getMonth();
            }
            return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
        return true;
    });

    if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter(i => (i.nama && i.nama.toLowerCase().includes(kw)) || (i.nisn && String(i.nisn).toLowerCase().includes(kw)));
    }

    return filtered;
}

// Render Logic Switcher
function renderCurrentTab() {
    if (currentTab === 'dashboard') renderDashboard();
    else if (currentTab === 'harian') renderHarian();
    else if (currentTab === 'periodik') renderPeriodik();
    else if (currentTab === 'detail') renderDetailSiswa();
    else if (currentTab === 'jurnal') renderJurnalGuru();
}

function renderDashboard() {
    document.getElementById('dashTotalSiswa').innerText = `${daftarSiswaCache.length} Siswa`;
    
    let H = 0, S = 0, I = 0;
    const todayData = getFilteredData('today', '');
    
    todayData.forEach(item => {
        if(item.status === 'Hadir') H++;
        else if(item.status === 'Sakit') S++;
        else if(item.status === 'Izin') I++;
    });

    const A = Math.max(0, daftarSiswaCache.length - (H + S + I));

    document.getElementById('dashHadir').innerText = H;
    document.getElementById('dashSakit').innerText = S;
    document.getElementById('dashIzin').innerText = I;
    document.getElementById('dashBelum').innerText = A;
    
    // Render PSG Info Section in Dashboard
    renderPsgInfoDashboard();
}

function renderHarian() {
    const keyword = (searchHarian.value || '').toLowerCase();
    const todayData = getFilteredData('today', '');
    const container = document.getElementById('listHarian');
    
    let list = [];
    if (daftarSiswaCache.length > 0) {
        const todayMap = {};
        todayData.forEach(item => { todayMap[item.nisn] = item; });

        list = daftarSiswaCache.map(s => {
            if (todayMap[s.nisn]) return todayMap[s.nisn];
            return {
                nisn: s.nisn,
                nama: s.nama,
                tanggal: getTodayStr(),
                waktu: '--:--',
                status: 'Belum Absen',
                foto: null,
                alasan: ''
            };
        });
    } else {
        list = [...todayData];
    }

    if (keyword) {
        list = list.filter(i => (i.nama && i.nama.toLowerCase().includes(keyword)) || (i.nisn && String(i.nisn).toLowerCase().includes(keyword)));
    }

    list.sort((a, b) => {
        if (a.status === 'Belum Absen' && b.status !== 'Belum Absen') return 1;
        if (a.status !== 'Belum Absen' && b.status === 'Belum Absen') return -1;
        return (a.nama || '').localeCompare(b.nama || '');
    });

    if (!list.length) {
        container.innerHTML = `<div class="text-center text-slate-400 text-sm py-10 font-medium">Tidak ada data.</div>`;
        return;
    }

    let html = '';
    list.forEach(item => {
        let badgeColor = item.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            item.status === 'Izin' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            item.status === 'Belum Absen' ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-rose-50 text-rose-700 border-rose-200';

        let fotoUrl = item.foto;
        if (fotoUrl && fotoUrl.includes('drive.google.com/file/d/')) {
            const match = fotoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) fotoUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w120`;
        }

        html += `
        <div class="bg-white border border-slate-200 shadow-sm rounded-xl p-3 flex gap-3 items-center">
            ${fotoUrl ? `<img src="${fotoUrl}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzQ3NTU2OSIgZD0iTTEyIDJDMiAyIDIgMTIgMiAxMnMyIDEwIDEwIDEwIDEwLTEwIDEwLTEwUzIyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6Ii8+PC9zdmc+'" />` : '<div class="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0"><i class="ph ph-image text-slate-300"></i></div>'}
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-0.5">
                    <span class="text-slate-800 font-semibold text-sm truncate">${item.nama}</span>
                    <span class="text-[10px] border px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${badgeColor}">${item.status}</span>
                </div>
                <div class="text-slate-500 text-xs font-medium truncate">${item.tanggal} • ${item.waktu} ${item.alasan ? '• ' + item.alasan : ''} ${item.agenda ? '• Agenda: ' + item.agenda : ''}</div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function isWorkingDay(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);

    // Weekend (0 = Minggu, 6 = Sabtu)
    const day = d.getDay();
    if (day === 0 || day === 6) return false;

    // Tidak boleh masa depan
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (d > now) return false;

    // Batas periode jika ada pengaturan
    if (pengaturanCache.tglMulai) {
        const start = parseDate(pengaturanCache.tglMulai);
        if (start) {
            start.setHours(0, 0, 0, 0);
            if (d < start) return false;
        }
    }
    if (pengaturanCache.tglSelesai) {
        const end = parseDate(pengaturanCache.tglSelesai);
        if (end) {
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
        }
    }

    // Cek hari libur
    if (Array.isArray(pengaturanCache.libur) && pengaturanCache.libur.length > 0) {
        const isLibur = pengaturanCache.libur.some(l => {
            const ld = parseDate(l);
            return ld && ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth() && ld.getDate() === d.getDate();
        });
        if (isLibur) return false;
    }

    return true;
}

function getRekapMatrixData(waktu, targetNisn = null, keyword = '') {
    let dates = [];
    if (waktu === 'week') {
        let monday = getMondayFromWeek(weekSelector ? weekSelector.value : null) || getCurrentMonday();
        for (let i = 0; i < 7; i++) {
            let d = new Date(monday.getTime());
            d.setDate(d.getDate() + i);
            dates.push(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`);
        }
    } else if (waktu === 'month') {
        const monthVal = (monthSelector && monthSelector.value) || currentMonthStr;
        const parsedMonth = parseDate(monthVal);
        const year = parsedMonth ? parsedMonth.getFullYear() : parseInt(monthVal.split('-')[0]);
        const month = parsedMonth ? parsedMonth.getMonth() : parseInt(monthVal.split('-')[1]) - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push(`${i.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`);
        }
    }

    let targetSiswa = daftarSiswaCache;
    if (targetNisn) {
        targetSiswa = daftarSiswaCache.filter(s => String(s.nisn) === String(targetNisn));
    }

    let matrix = {};
    targetSiswa.forEach(s => {
        matrix[s.nisn] = { nisn: s.nisn, nama: s.nama, records: {} };
        dates.forEach(d => matrix[s.nisn].records[d] = '-');
    });

    const data = getFilteredData(waktu, '');
    data.forEach(item => {
        if (matrix[item.nisn]) {
            const itemD = parseDate(item.tanggal);
            if (itemD) {
                const dStr = `${itemD.getDate().toString().padStart(2, '0')}/${(itemD.getMonth() + 1).toString().padStart(2, '0')}/${itemD.getFullYear()}`;
                if (matrix[item.nisn].records[dStr] !== undefined) {
                    let stat = item.status === 'Hadir' ? 'H' : item.status === 'Izin' ? 'I' : item.status === 'Sakit' ? 'S' : (item.status === 'Alpha' || item.status === 'A' ? 'A' : '-');
                    matrix[item.nisn].records[dStr] = stat;
                }
            }
        }
    });

    // Terapkan "A" pada hari kerja yang belum absen
    dates.forEach(d => {
        if (isWorkingDay(d)) {
            Object.values(matrix).forEach(m => {
                if (m.records[d] === '-') m.records[d] = 'A';
            });
        }
    });

    let matrixRows = Object.values(matrix);
    if (keyword) {
        const kw = keyword.toLowerCase();
        matrixRows = matrixRows.filter(s => s.nama.toLowerCase().includes(kw));
    }

    return { dates, matrixRows };
}

function renderPeriodik() {
    const waktu = filterPeriodik.value;
    const selectedNisn = selectPeriodikSiswa ? selectPeriodikSiswa.value : '';
    const keyword = searchPeriodik.value;
    const container = document.getElementById('tablePeriodik');

    if (!pengaturanCache.tglMulai && daftarSiswaCache.length === 0) {
        container.innerHTML = `<div class="text-center text-slate-400 text-sm py-10 font-medium">Tidak ada data rekap.</div>`;
        return;
    }

    let html = '';
    
    if (waktu === 'all') {
        // SUMMARY TABLE
        const data = getFilteredData(waktu, keyword);
        let targetSiswa = daftarSiswaCache;
        if (selectedNisn) {
            targetSiswa = daftarSiswaCache.filter(s => String(s.nisn) === String(selectedNisn));
        }

        let stats = {};
        targetSiswa.forEach(s => stats[s.nisn] = { nama: s.nama, H: 0, I: 0, S: 0, A: 0 });
        
        // Hitung total hari kerja yang valid sejak tglMulai s.d Hari Ini
        let workingDatesCount = 0;
        let startD = parseDate(pengaturanCache.tglMulai);
        let endD = pengaturanCache.tglSelesai ? parseDate(pengaturanCache.tglSelesai) : new Date();
        let nowD = new Date();
        if (endD && endD > nowD) endD = nowD;

        if (startD) {
            startD.setHours(0, 0, 0, 0);
            if (endD) endD.setHours(0, 0, 0, 0);
            for (let curr = new Date(startD); curr <= endD; curr.setDate(curr.getDate() + 1)) {
                let currStr = `${curr.getDate().toString().padStart(2, '0')}/${(curr.getMonth() + 1).toString().padStart(2, '0')}/${curr.getFullYear()}`;
                if (isWorkingDay(currStr)) workingDatesCount++;
            }
        }

        data.forEach(item => {
            if (stats[item.nisn]) {
                if (item.status === 'Hadir') stats[item.nisn].H++;
                else if (item.status === 'Izin') stats[item.nisn].I++;
                else if (item.status === 'Sakit') stats[item.nisn].S++;
                else if (item.status === 'Alpha' || item.status === 'A') stats[item.nisn].A++;
            }
        });

        // Set Alpha
        Object.values(stats).forEach(s => {
            if (startD) {
                s.A = Math.max(0, workingDatesCount - (s.H + s.I + s.S));
            }
        });

        // Terapkan search lagi karena object
        let statRows = Object.values(stats);
        if (keyword) {
            const kw = keyword.toLowerCase();
            statRows = statRows.filter(s => s.nama.toLowerCase().includes(kw));
        }

        html += `
        <div class="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm w-full">
            <table class="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        <th class="p-3 font-semibold text-center w-10">No</th>
                        <th class="p-3 font-semibold">Nama Siswa</th>
                        <th class="p-3 font-semibold text-center text-emerald-600">Hadir</th>
                        <th class="p-3 font-semibold text-center text-rose-600">Sakit</th>
                        <th class="p-3 font-semibold text-center text-amber-600">Izin</th>
                        <th class="p-3 font-semibold text-center text-slate-500">Alpha</th>
                    </tr>
                </thead>
                <tbody class="text-sm divide-y divide-slate-100">`;
        
        statRows.forEach((row, index) => {
            html += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="p-3 text-center text-slate-400 text-xs">${index + 1}</td>
                    <td class="p-3 font-semibold text-slate-800">${row.nama}</td>
                    <td class="p-3 text-center font-bold text-emerald-600 bg-emerald-50/50">${row.H}</td>
                    <td class="p-3 text-center font-bold text-rose-600 bg-rose-50/50">${row.S}</td>
                    <td class="p-3 text-center font-bold text-amber-600 bg-amber-50/50">${row.I}</td>
                    <td class="p-3 text-center font-bold text-slate-500">${row.A}</td>
                </tr>`;
        });
        html += `</tbody></table></div>`;
    } else {
        // MATRIX TABLE (WEEK / MONTH)
        const { dates, matrixRows } = getRekapMatrixData(waktu, selectedNisn, keyword);

        html += `
        <div class="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm w-full relative">
            <table class="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr class="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
                        <th class="p-2 font-semibold text-center sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[30px]">No</th>
                        <th class="p-2 font-semibold sticky left-[30px] bg-slate-50 z-10 border-r border-slate-200 min-w-[120px]">Siswa</th>`;
        
        dates.forEach((d, i) => {
            let dayLabel = waktu === 'week' ? `Hari ${i+1}` : d.split('/')[0];
            html += `<th class="p-1 font-semibold text-center min-w-[30px]" title="${d}">${dayLabel}</th>`;
        });
        
        html += `
            <th class="p-2 font-semibold text-center text-emerald-600 bg-slate-100 border-l border-slate-200">H</th>
            <th class="p-2 font-semibold text-center text-rose-600 bg-slate-100">S</th>
            <th class="p-2 font-semibold text-center text-amber-600 bg-slate-100">I</th>
            <th class="p-2 font-semibold text-center text-slate-500 bg-slate-100 border-r border-slate-200">A</th>
        </tr></thead><tbody class="text-xs divide-y divide-slate-100">`;

        matrixRows.forEach((row, index) => {
            html += `<tr class="hover:bg-slate-50 transition-colors">
                <td class="p-2 text-center text-slate-400 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">${index + 1}</td>
                <td class="p-2 font-semibold text-slate-800 sticky left-[30px] bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] truncate max-w-[120px]" title="${row.nama}">${row.nama}</td>`;
            
            let totalH = 0, totalS = 0, totalI = 0, totalA = 0;
            dates.forEach(d => {
                let stat = row.records[d];
                if (stat === 'H') totalH++; else if (stat === 'S') totalS++; else if (stat === 'I') totalI++; else if (stat === 'A') totalA++;
                let colorClass = stat === 'H' ? 'text-emerald-600 bg-emerald-50' : stat === 'I' ? 'text-amber-600 bg-amber-50' : stat === 'S' ? 'text-rose-600 bg-rose-50' : stat === 'A' ? 'text-slate-500 bg-slate-100' : 'text-slate-300';
                html += `<td class="p-1 text-center font-bold border-l border-slate-100 ${colorClass}" title="${d}: ${stat}">${stat}</td>`;
            });
            
            html += `
                <td class="p-1 text-center font-bold text-emerald-600 bg-emerald-50/50 border-l border-slate-200">${totalH}</td>
                <td class="p-1 text-center font-bold text-rose-600 bg-rose-50/50">${totalS}</td>
                <td class="p-1 text-center font-bold text-amber-600 bg-amber-50/50">${totalI}</td>
                <td class="p-1 text-center font-bold text-slate-500 bg-slate-50/50 border-r border-slate-200">${totalA}</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
    }
    container.innerHTML = html;
}

function renderDetailSiswa() {
    const nisn = selectDetailSiswa.value;
    const monthVal = detailMonthSelector.value || currentMonthStr;
    const [y, m] = monthVal.split('-');
    
    if (!nisn) {
        listDetailSiswa.innerHTML = `<div class="text-center text-slate-400 text-sm py-10 font-medium">Pilih siswa terlebih dahulu.</div>`;
        return;
    }

    const studentData = rawDataCache.filter(item => {
        if (item.nisn !== nisn) return false;
        const itemDate = parseDate(item.tanggal);
        if (!itemDate) return false;
        return itemDate.getFullYear() == y && (itemDate.getMonth() + 1) == m;
    });
    
    // Sort by date ascending (oldest to newest)
    studentData.sort((a,b) => {
        const da = parseDate(a.tanggal);
        const db = parseDate(b.tanggal);
        return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
    });

    if (!studentData.length) {
        listDetailSiswa.innerHTML = `<div class="text-center text-slate-400 text-sm py-10 font-medium">Tidak ada data kehadiran di bulan ini.</div>`;
        return;
    }

    let html = '';
    studentData.forEach(item => {
        let badgeColor = item.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            item.status === 'Izin' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-rose-50 text-rose-700 border-rose-200';

        let fotoUrl = item.foto;
        if (fotoUrl && fotoUrl.includes('drive.google.com/file/d/')) {
            const match = fotoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) fotoUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w120`;
        }

        html += `
        <div class="bg-white border border-slate-200 shadow-sm rounded-xl p-3 flex gap-3 items-center">
            ${fotoUrl ? `<img src="${fotoUrl}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzQ3NTU2OSIgZD0iTTEyIDJDMiAyIDIgMTIgMiAxMnMyIDEwIDEwIDEwIDEwLTEwIDEwLTEwUzIyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6Ii8+PC9zdmc+'" />` : '<div class="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0"><i class="ph ph-image text-slate-300"></i></div>'}
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-0.5">
                    <span class="text-slate-800 font-semibold text-sm truncate">${item.tanggal} • ${item.waktu}</span>
                    <span class="text-[10px] border px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${badgeColor}">${item.status}</span>
                </div>
                <div class="text-slate-500 text-xs font-medium">${item.alasan ? 'Alasan: ' + item.alasan : 'Lokasi: ' + (item.lat ? item.lat+','+item.lng : '-')} ${item.agenda ? '<br>Agenda: ' + item.agenda : ''}</div>
            </div>
        </div>`;
    });
    listDetailSiswa.innerHTML = html;
}

// ===== PSG INFO RENDERING =====
function renderPsgInfoDashboard() {
    const section = document.getElementById('psgInfoSection');
    const container = document.getElementById('psgInfoContainer');
    
    if (!daftarSiswaCache.length) {
        section.classList.add('hidden');
        return;
    }
    
    // Group students by PSG location
    const psgGroups = {};
    daftarSiswaCache.forEach(s => {
        const lokasi = s.lokasiPKL || 'Belum Ditentukan';
        if (!psgGroups[lokasi]) psgGroups[lokasi] = { detail: s.psgDetail, students: [] };
        psgGroups[lokasi].students.push(s);
    });
    
    let html = `<h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
        <i class="ph ph-map-pin text-primary text-lg"></i> Info Lokasi PSG
    </h3>`;
    
    Object.entries(psgGroups).forEach(([lokasi, group]) => {
        const detail = group.detail;
        const studentNames = group.students.map(s => `<span class="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-100 mr-1 mb-1">${s.nama}</span>`).join('');
        
        html += `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-3">
            <div class="flex items-start gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <i class="ph-fill ph-buildings text-xl"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-bold text-slate-800">${lokasi}</h4>
                    ${detail && detail.alamat ? `<p class="text-xs text-slate-500 mt-0.5"><i class="ph ph-map-pin"></i> ${detail.alamat}</p>` : ''}
                </div>
            </div>
            ${detail ? `
            <div class="grid grid-cols-1 gap-2 mb-3">
                ${detail.pemilik ? `
                <div class="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <i class="ph ph-crown text-amber-500"></i>
                    <div><p class="text-[10px] text-slate-400 font-semibold uppercase">Pemilik</p><p class="text-xs font-bold text-slate-700">${detail.pemilik}</p></div>
                </div>` : ''}
                ${detail.contactPerson ? `
                <div class="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <i class="ph ph-user-circle text-blue-500"></i>
                    <div class="flex-1"><p class="text-[10px] text-slate-400 font-semibold uppercase">Contact Person</p><p class="text-xs font-bold text-slate-700">${detail.contactPerson}</p></div>
                    ${detail.noTelpCP ? `<a href="tel:${detail.noTelpCP}" class="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all"><i class="ph ph-phone text-sm"></i></a>` : ''}
                </div>` : ''}
                ${detail.noTelpCP ? `
                <div class="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <i class="ph ph-phone text-emerald-500"></i>
                    <div><p class="text-[10px] text-slate-400 font-semibold uppercase">No. Telepon</p><p class="text-xs font-bold text-slate-700">${detail.noTelpCP}</p></div>
                </div>` : ''}
            </div>` : ''}
            <div class="border-t border-slate-100 pt-2">
                <p class="text-[10px] text-slate-400 font-semibold uppercase mb-1">Siswa (${group.students.length})</p>
                <div class="flex flex-wrap">${studentNames}</div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
    // Visibility is controlled by switchTab()
    if (currentTab === 'dashboard') {
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
    }
}

function renderDetailPsgInfo(nisn) {
    const detailPsgInfo = document.getElementById('detailPsgInfo');
    if (!detailPsgInfo) return;
    
    const student = daftarSiswaCache.find(s => s.nisn === nisn);
    if (!student || !student.psgDetail) {
        detailPsgInfo.classList.add('hidden');
        detailPsgInfo.innerHTML = '';
        return;
    }
    
    const d = student.psgDetail;
    detailPsgInfo.classList.remove('hidden');
    detailPsgInfo.innerHTML = `
    <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-4 space-y-3">
        <div class="flex items-center gap-2">
            <i class="ph-fill ph-buildings text-indigo-600 text-lg"></i>
            <h4 class="text-sm font-bold text-slate-800">${student.lokasiPKL || '-'}</h4>
        </div>
        <div class="grid grid-cols-1 gap-2 text-xs">
            <div class="flex items-start gap-2">
                <i class="ph ph-student text-slate-400 mt-0.5"></i>
                <div><span class="text-slate-400 font-semibold">Siswa:</span> <span class="text-slate-700 font-bold">${student.nama}</span> • <span class="text-slate-500">${student.kelas || '-'}</span> • <span class="text-slate-500">NISN: ${student.nisn}</span></div>
            </div>
            ${student.kontak ? `<div class="flex items-center gap-2"><i class="ph ph-phone text-slate-400"></i><span class="text-slate-400 font-semibold">Kontak Siswa:</span> <span class="text-slate-700 font-bold">${student.kontak}</span></div>` : ''}
            ${d.alamat ? `<div class="flex items-start gap-2"><i class="ph ph-map-pin text-slate-400 mt-0.5"></i><span class="text-slate-400 font-semibold">Alamat:</span> <span class="text-slate-700">${d.alamat}</span></div>` : ''}
            ${d.pemilik ? `<div class="flex items-center gap-2"><i class="ph ph-crown text-amber-500"></i><span class="text-slate-400 font-semibold">Pemilik:</span> <span class="text-slate-700 font-bold">${d.pemilik}</span></div>` : ''}
            ${d.contactPerson ? `<div class="flex items-center gap-2"><i class="ph ph-user-circle text-blue-500"></i><span class="text-slate-400 font-semibold">CP:</span> <span class="text-slate-700 font-bold">${d.contactPerson}</span> ${d.noTelpCP ? `(<a href="tel:${d.noTelpCP}" class="text-blue-600 underline">${d.noTelpCP}</a>)` : ''}</div>` : ''}
        </div>
    </div>`;
}

// ===== JURNAL GURU LOGIC =====
async function fetchJurnalGuru(namaGuru, bulan = 'all') {
    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getJurnalGuru&namaGuru=${encodeURIComponent(namaGuru)}&bulan=${bulan}`;
        const res = await fetch(url);
        const result = await res.json();
        if (result.status === 'success') {
            jurnalGuruCache = result.data || [];
            if (result.pengaturan) window.pengaturanCache = result.pengaturan;
            if (currentTab === 'jurnal') renderJurnalGuru();
        }
    } catch (e) {
        console.error("Gagal load jurnal guru", e);
    }
}

function renderJurnalGuru() {
    const container = document.getElementById('jurnalGuruContainer');
    const filterNisn = document.getElementById('selectJurnalSiswa').value;
    
    let data = jurnalGuruCache;
    if (filterNisn !== 'all') {
        data = data.filter(j => j.nisn === filterNisn);
    }
    
    if (!data.length) {
        container.innerHTML = `<div class="text-center text-slate-400 text-sm py-10 font-medium bg-white rounded-xl border border-slate-200">Belum ada data jurnal.</div>`;
        return;
    }
    
    // Sort by weekId descending
    const sorted = [...data].sort((a, b) => b.weekId.localeCompare(a.weekId));
    
    let html = '';
    sorted.forEach(entry => {
        const photoCount = entry.photoCount || 0;
        const progressPct = Math.round((photoCount / 2) * 100);
        const progressColor = photoCount >= 2 ? 'bg-emerald-500' : 'bg-amber-500';
        
        // Photo gallery
        let photosHtml = '';
        const photoUrls = entry.photoUrls || [];
        if (photoUrls.length > 0) {
            photosHtml = `<div class="grid grid-cols-2 gap-2 mt-3">`;
            photoUrls.forEach((url, i) => {
                let thumbUrl = url;
                if (url && url.includes('drive.google.com/file/d/')) {
                    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (match && match[1]) thumbUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w300`;
                }
                let downloadUrl = url;
                if (url && url.includes('drive.google.com/file/d/')) {
                    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (match && match[1]) downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
                }
                photosHtml += `
                    <div class="relative group cursor-pointer" onclick="openGuruImageViewer('${thumbUrl.replace('sz=w300','sz=w1200')}', '${downloadUrl}', 'Foto ${i+1} - ${entry.nama} - Minggu ${entry.weekStart}')">
                        <img src="${thumbUrl}" class="w-full aspect-square object-cover rounded-lg border border-slate-200 bg-slate-100" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzQ3NTU2OSIgZD0iTTEyIDJDMiAyIDIgMTIgMiAxMnMyIDEwIDEwIDEwIDEwLTEwIDEwLTEwUzIyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6Ii8+PC9zdmc+'" 
                             alt="Foto ${i+1}">
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <i class="ph ph-magnifying-glass-plus text-white text-xl"></i>
                        </div>
                    </div>`;
            });
            photosHtml += `</div>`;
        }
        
        html += `
        <div class="jurnal-card">
            <div class="p-4">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span class="text-xs font-bold text-primary bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 truncate">${entry.nama}</span>
                            <span class="text-[10px] ${progressColor.replace('bg-','text-').replace('500','600')} ${progressColor.replace('500','50')} border ${progressColor.replace('bg-','border-').replace('500','200')} px-2 py-0.5 rounded-md font-bold">${photoCount}/2 Foto</span>
                        </div>
                        <p class="text-sm font-bold text-slate-800">${entry.weekStart || ''} — ${entry.weekEnd || ''}</p>
                    </div>
                </div>
                
                <div class="jurnal-status-bar mb-3">
                    <div class="jurnal-status-fill ${progressColor}" style="width: ${progressPct}%"></div>
                </div>
                
                ${entry.keterangan ? `<p class="text-sm text-slate-600 leading-relaxed mb-1"><span class="font-semibold text-slate-700">Kegiatan:</span> ${entry.keterangan}</p>` : ''}
                <p class="text-xs text-slate-400 mt-1"><i class="ph ph-clock"></i> Dikirim: ${entry.waktu || '-'}</p>
                
                ${photosHtml}
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

// Image Viewer for Guru
function openGuruImageViewer(imgSrc, downloadUrl, title) {
    let modal = document.getElementById('guruImageModal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'guruImageModal';
    modal.className = 'fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4';
    modal.style.animation = 'fadeIn 0.2s ease-out forwards';
    modal.innerHTML = `
        <div class="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <p class="text-white text-sm font-semibold truncate flex-1 mr-4">${title}</p>
            <div class="flex gap-2">
                <a href="${downloadUrl}" target="_blank" rel="noopener" class="bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-white/30 transition-all">
                    <i class="ph ph-download-simple text-lg"></i> Unduh
                </a>
                <button onclick="document.getElementById('guruImageModal').remove()" class="bg-white/20 backdrop-blur-sm text-white p-2 rounded-xl hover:bg-white/30 transition-all">
                    <i class="ph ph-x text-xl font-bold"></i>
                </button>
            </div>
        </div>
        <img src="${imgSrc}" class="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" alt="${title}">
    `;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
}

searchHarian.addEventListener('input', renderHarian);
searchPeriodik.addEventListener('input', renderPeriodik);
filterPeriodik.addEventListener('change', (e) => {
    const val = e.target.value;
    weekSelector.classList.toggle('hidden', val !== 'week');
    monthSelector.classList.toggle('hidden', val !== 'month');
    
    if (val === 'all') {
        const namaGuru = localStorage.getItem('nama_guru');
        fetchData(namaGuru, 'all');
    } else {
        renderPeriodik();
    }
});
weekSelector.addEventListener('change', renderPeriodik);
monthSelector.addEventListener('change', (e) => {
    if (currentLoadedMonth !== 'all') {
        const m = e.target.value.split('-')[1].replace(/^0+/, '');
        fetchData(localStorage.getItem('nama_guru'), m);
    } else {
        renderPeriodik();
    }
});

selectDetailSiswa.addEventListener('change', () => {
    renderDetailSiswa();
    renderDetailPsgInfo(selectDetailSiswa.value);
});
detailMonthSelector.addEventListener('change', (e) => {
    if (currentLoadedMonth !== 'all') {
        const m = e.target.value.split('-')[1].replace(/^0+/, '');
        fetchData(localStorage.getItem('nama_guru'), m);
    } else {
        renderDetailSiswa();
    }
});

document.getElementById('selectJurnalSiswa').addEventListener('change', renderJurnalGuru);

if (selectPeriodikSiswa) {
    selectPeriodikSiswa.addEventListener('change', renderPeriodik);
}

function buildRekapPdfModel(selectedNisn) {
    const siswa = daftarSiswaCache.find(s => String(s.nisn) === String(selectedNisn));
    if (!siswa || !siswa.nama) return { error: 'Data siswa tidak ditemukan. Muat ulang data, jangan unduh identitas kosong.' };
    const waktu = filterPeriodik ? filterPeriodik.value : 'week';
    if (waktu !== 'week' && waktu !== 'month') return { error: 'Pilih periode mingguan atau bulanan.' };
    const { dates, matrixRows } = getRekapMatrixData(waktu, selectedNisn, '');
    if (!dates.length || !matrixRows.length) return { error: 'Tidak ada data rekap untuk siswa dan periode ini.' };
    const row = matrixRows[0];
    let totalH = 0, totalS = 0, totalI = 0, totalA = 0;
    const cells = dates.map(d => {
        const s = row.records[d] || '-';
        if (s === 'H') totalH++; else if (s === 'S') totalS++; else if (s === 'I') totalI++; else if (s === 'A') totalA++;
        return s;
    });
    const periode = waktu === 'week'
        ? `Mingguan (${dates[0]} - ${dates[dates.length - 1]})`
        : `Bulanan (${monthSelector ? monthSelector.value : currentMonthStr})`;
    return {
        nama: siswa.nama,
        nisn: String(siswa.nisn),
        waktu,
        periode,
        dates,
        cells,
        totals: [totalH, totalS, totalI, totalA]
    };
}

async function downloadRekapPdf() {
    const selectedNisn = selectPeriodikSiswa ? selectPeriodikSiswa.value : '';
    if (!selectedNisn) return notify('Silakan pilih siswa terlebih dahulu!', 'error');
    const model = buildRekapPdfModel(selectedNisn);
    if (model.error) return notify(model.error, 'error');
    const btn = btnDownloadRekapPdf;
    const original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Menyusun PDF...`; }
    try {
        const filename = `Rekap_${safeFilePart(model.nama)}_${model.waktu}_${new Date().toISOString().slice(0, 10)}.pdf`;
        const built = await createPdfBlob(rekapDocDefinition(model));
        showPdfPreview(built.blob, filename, 'Pratinjau Rekap Kehadiran PDF');
    } catch (err) {
        notify(err.message || 'Gagal membuat PDF rekap.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}

if (btnDownloadRekapPdf) btnDownloadRekapPdf.addEventListener('click', downloadRekapPdf);


// ===== PDF (pdfmake). Satu Blob untuk pratinjau dan unduhan. =====
const PDF_FONT = 'Carlito';
let pdfPreview = null;

function notify(message, type) {
    if (typeof showToast === 'function') showToast(message, type || 'success');
    else alert(message);
}

function safeFilePart(name) {
    return String(name || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'Siswa';
}

function requireStudent(nisn) {
    const student = daftarSiswaCache.find(s => String(s.nisn) === String(nisn));
    if (!student || !String(student.nama || '').trim()) {
        throw new Error('Data siswa tidak ditemukan. Muat ulang, jangan isi identitas palsu.');
    }
    const namaGuru = localStorage.getItem('nama_guru') || '';
    if (!namaGuru) throw new Error('Sesi guru tidak ada. Masuk ulang.');
    const kelas = student.kelas || student.jurusan || '';
    const tempat = student.lokasiPKL || student.dudi || '';
    if (!kelas || !tempat) throw new Error('Kelas atau tempat PKL kosong. Lengkapi data, jangan diisi contoh.');
    return { student, namaGuru, kelas, tempat };
}

function periodBounds() {
    const start = parseDate(pengaturanCache && pengaturanCache.tglMulai);
    const end = parseDate(pengaturanCache && pengaturanCache.tglSelesai);
    if (!start || !end || end < start) {
        throw new Error('Periode PKL (tglMulai/tglSelesai) tidak tersedia. Tidak memakai tanggal contoh.');
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function cleanUraian(raw) {
    let s = String(raw || '-').trim();
    if (/^foto\s*\d*[\s:.\-]*$/i.test(s)) return '-';
    s = s.replace(/^foto\s*\d*[\s:.\-]*\s*/gi, '').trim();
    return s || '-';
}

function dateKey(d) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function registerDate(map, tgl, entry, type) {
    const parsed = parseDate(tgl);
    if (!parsed) return;
    const key = dateKey(parsed);
    if (!map[key]) map[key] = {};
    map[key][type] = entry;
}

function createPdfBlob(docDefinition) {
    return new Promise((resolve, reject) => {
        try {
            const pdfMake = window.pdfMake;
            if (!pdfMake || typeof pdfMake.createPdf !== 'function') {
                return reject(new Error('pdfmake belum termuat. Periksa koneksi lalu muat ulang.'));
            }
            docDefinition.defaultStyle = Object.assign({ font: PDF_FONT, fontSize: 10 }, docDefinition.defaultStyle);
            pdfMake.createPdf(docDefinition).getBlob(blob => {
                if (!blob || blob.size < 80) reject(new Error('PDF kosong.'));
                else resolve({ blob });
            });
        } catch (err) { reject(err); }
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function closePdfPreview() {
    const modal = document.getElementById('modalPdfPreview');
    const frame = document.getElementById('pdfPreviewFrame');
    if (pdfPreview) { URL.revokeObjectURL(pdfPreview.url); pdfPreview = null; }
    if (frame) frame.removeAttribute('src');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function showPdfPreview(blob, filename, title) {
    const modal = document.getElementById('modalPdfPreview');
    const frame = document.getElementById('pdfPreviewFrame');
    const fallback = document.getElementById('pdfPreviewFallback');
    if (!modal || !frame) throw new Error('Panel pratinjau PDF tidak ada.');
    if (pdfPreview) URL.revokeObjectURL(pdfPreview.url);
    const url = URL.createObjectURL(blob);
    pdfPreview = { blob, filename, url };
    document.getElementById('pdfPreviewTitle').textContent = title;
    frame.src = url;
    if (fallback) fallback.classList.toggle('hidden', 'src' in frame);
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

document.addEventListener('click', (e) => {
    if (e.target.closest('#btnClosePdfPreview') || e.target.closest('#btnClosePdfPreviewMobile')) closePdfPreview();
    if (e.target.closest('#btnDownloadPdf')) {
        if (!pdfPreview) return notify('Belum ada PDF. Buat pratinjau dulu.', 'error');
        downloadBlob(pdfPreview.blob, pdfPreview.filename);
    }
});

const cellPad = { margin: [4, 3, 4, 3] };
function th(text) {
    return Object.assign({ text, bold: true, fillColor: '#e2e8f0', alignment: 'center' }, cellPad);
}
function td(text, extra) {
    return Object.assign({ text: text == null ? '' : String(text) }, cellPad, extra);
}
function identBlock(student, kelas, tempat, guru) {
    const line = (label, value, bold) => ({ text: [{ text: label + ' : ', bold: true }, { text: String(value).toUpperCase(), bold: !!bold }], margin: [0, 1, 8, 1] });
    return {
        columns: [
            { stack: [line('Nama Siswa', student.nama, true), line('Kelas', kelas)] },
            { stack: [line('Tempat PKL', tempat), line('Guru Pembimbing', guru)] }
        ],
        margin: [0, 8, 0, 10]
    };
}

function rekapDocDefinition(model) {
    const head = [th('No'), th('NISN'), th('Nama')].concat(model.dates.map(d => th(model.waktu === 'week' ? d.slice(0, 5) : d.split('/')[0])), [th('H'), th('S'), th('I'), th('A')]);
    const body = [td('1', { alignment: 'center' }), td(model.nisn), td(model.nama)].concat(
        model.cells.map(s => td(s, { alignment: 'center', color: s === 'A' ? '#dc2626' : '#0f172a' })),
        model.totals.map(n => td(String(n), { alignment: 'center', bold: true }))
    );
    const narrow = model.dates.length > 16;
    return {
        pageSize: 'A4',
        pageOrientation: narrow ? 'landscape' : 'portrait',
        pageMargins: [18, 24, 18, 24],
        content: [
            { text: 'REKAP KEHADIRAN SISWA PRAKERIN / PSG', bold: true, fontSize: 13, alignment: 'center' },
            { text: model.periode, alignment: 'center', margin: [0, 2, 0, 8] },
            { table: { headerRows: 1, widths: ['auto', 'auto', '*'].concat(model.dates.map(() => 'auto'), ['auto', 'auto', 'auto', 'auto']), body: [head, body] }, fontSize: narrow ? 7 : 8 }
        ]
    };
}

function buildAgendaRows(absensi, jurnal) {
    const { start, end } = periodBounds();
    const map = {};
    absensi.forEach(a => registerDate(map, a.tanggal || a.tgl, a, 'absensi'));
    jurnal.forEach(j => registerDate(map, j.tanggal || j.weekStart, j, 'jurnal'));
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const rows = [];
    for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        const key = dateKey(cur);
        const rec = map[key] || {};
        const abs = rec.absensi;
        const jur = rec.jurnal;
        let ket, uraian;
        if (abs || jur) {
            const raw = abs && abs.status ? abs.status : 'Hadir';
            ket = (raw === 'Alpha' || raw === 'A') ? 'Alpha' : raw;
            const rawUraian = (abs && (abs.agenda || abs.agendaHarian || abs.kegiatan || abs.alasan || abs.keterangan))
                || (jur && (jur.keterangan || jur.agenda || jur.jurnal))
                || (abs && abs.status === 'Sakit' ? 'Sakit' : (abs && abs.status === 'Izin' ? 'Izin' : '-'));
            uraian = cleanUraian(rawUraian);
        } else {
            const working = isWorkingDay(key);
            ket = working ? 'Alpha' : 'Libur';
            uraian = working ? '-' : 'Libur';
        }
        rows.push({ hariTanggal: `${days[cur.getDay()]}, ${key}`, keterangan: ket, uraian });
    }
    if (!rows.length) throw new Error('Periode tidak menghasilkan baris agenda.');
    return rows;
}

function agendaDocDefinition(info, rows) {
    const body = [[th('NO'), th('HARI, TANGGAL'), th('KETERANGAN'), th('URAIAN SINGKAT PEKERJAAN YANG DILAKUKAN')]];
    rows.forEach((row, i) => {
        body.push([
            td(String(i + 1), { alignment: 'center' }),
            td(row.hariTanggal, { bold: true }),
            td(row.keterangan, { alignment: 'center', bold: true, color: row.keterangan === 'Alpha' ? '#dc2626' : '#0f172a' }),
            td(row.uraian.toUpperCase(), { minHeight: 24 })
        ]);
    });
    return {
        pageSize: 'A4',
        pageMargins: [57, 28, 28, 36],
        footer: (current) => ({ text: String(current), alignment: 'right', margin: [0, 8, 28, 0], fontSize: 8, color: '#64748b' }),
        content: [
            { text: 'AGENDA HARIAN PKL', bold: true, fontSize: 14, alignment: 'center' },
            identBlock(info.student, info.kelas, info.tempat, info.namaGuru),
            { table: { headerRows: 1, widths: [28, 110, 70, '*'], body }, layout: { paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 4, paddingBottom: () => 4, fillColor: (i) => i === 0 ? '#e2e8f0' : null } },
            { text: 'Ket : diisi siswa dari agenda harian online', italics: true, fontSize: 8, color: '#64748b', margin: [0, 8, 0, 0] }
        ]
    };
}

function driveFileId(url) {
    if (!url) return null;
    const m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/) || String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
}

async function loadImageData(rawUrl) {
    const id = driveFileId(rawUrl);
    const thumbUrl = id ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800' : rawUrl;
    const candidates = id ? [
        thumbUrl,
        'https://lh3.googleusercontent.com/d/' + id + '=w800',
        rawUrl,
        'https://corsproxy.io/?url=' + encodeURIComponent(thumbUrl)
    ] : [
        rawUrl,
        'https://corsproxy.io/?url=' + encodeURIComponent(rawUrl)
    ];

    for (const url of candidates) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Fetch failed');
            const ct = res.headers.get('content-type') || '';
            if (!ct.startsWith('image')) throw new Error('Content-Type bukan image');

            const blob = await res.blob();
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            return await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth || 600;
                        canvas.height = img.naturalHeight || 400;
                        canvas.getContext('2d').drawImage(img, 0, 0);
                        resolve({ data: canvas.toDataURL('image/jpeg', 0.86), w: canvas.width, h: canvas.height });
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = reject;
                img.src = base64;
            });
        } catch (e) {
            // Coba kandidat berikutnya
        }
    }
    throw new Error('Foto dokumentasi gagal dimuat. PDF tidak dibuat tanpa gambar.');
}

function jurnalPages(entries) {
    const pages = [];
    entries.forEach(entry => {
        const raw = entry.keterangan || entry.agenda || entry.jurnal || entry.kegiatan || entry.alasan || '-';
        const urls = Array.isArray(entry.photoUrls) && entry.photoUrls.length ? entry.photoUrls : (entry.foto ? [entry.foto] : []);
        const parts = String(raw).split(/foto\s*\d+\s*[:.\-]?\s*/gi).map(s => s.trim()).filter(Boolean);
        if (!urls.length) {
            pages.push({ photoUrl: null, judul: cleanUraian(raw) });
            return;
        }
        urls.forEach((url, i) => pages.push({ photoUrl: url, judul: parts[i] || parts[0] || cleanUraian(raw) }));
    });
    return pages;
}

async function jurnalDocDefinition(info, pages) {
    const content = [];
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        let image = null;
        if (page.photoUrl) {
            const loaded = await loadImageData(page.photoUrl);
            const maxW = 500, maxH = 250;
            const ratio = Math.min(maxW / loaded.w, maxH / loaded.h, 1);
            image = { image: loaded.data, width: Math.round(loaded.w * ratio), height: Math.round(loaded.h * ratio), alignment: 'center', margin: [0, 4, 0, 6] };
        } else {
            image = { text: '[ Foto Dokumentasi ]', italics: true, color: '#64748b', alignment: 'center', margin: [0, 12, 0, 12] };
        }
        const lines = [];
        for (let n = 0; n < 16; n++) lines.push([{ text: ' ', fontSize: 10 }]);
        content.push(
            { text: 'LEMBAR KEGIATAN HARIAN PKL', bold: true, fontSize: 14, alignment: 'center', margin: [0, 0, 0, 6] },
            identBlock(info.student, info.kelas, info.tempat, info.namaGuru),
            { text: 'Judul Kegiatan/Pekerjaan :', bold: true, margin: [0, 0, 0, 2] },
            { text: '1. ' + String(page.judul || '-').toUpperCase(), bold: true, margin: [0, 0, 0, 8] },
            { text: 'Dokumentasi Kegiatan/Pekerjaan :', bold: true },
            image,
            { text: 'Uraian Kegiatan/Pekerjaan :', bold: true, margin: [0, 4, 0, 2] },
            {
                table: { widths: ['*'], heights: lines.map(() => 14), body: lines },
                layout: {
                    hLineWidth: (idx) => idx === 0 ? 0 : 0.7,
                    vLineWidth: () => 0,
                    hLineColor: () => '#64748b',
                    hLineStyle: (idx) => idx === 0 ? null : { dash: { length: 2, space: 2 } },
                    paddingTop: () => 6,
                    paddingBottom: () => 0
                }
            },
            i < pages.length - 1 ? { text: '', pageBreak: 'after' } : { text: '' }
        );
    }
    return { pageSize: 'A4', pageMargins: [57, 28, 32, 28], content };
}

async function fetchJson(action, namaGuru, customBulan = 'all') {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=${action}&namaGuru=${encodeURIComponent(namaGuru)}&bulan=${customBulan}`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const text = await res.text();
    if (!text.startsWith('{') && !text.startsWith('[')) throw new Error('Data terlalu besar/Server timeout.');
    try {
        const json = JSON.parse(text);
        if (json.status !== 'success' || !Array.isArray(json.data)) throw new Error('Data server gagal dibaca.');
        return json.data;
    } catch (e) {
        throw new Error('Respons JSON rusak.');
    }
}

// Fungsi Batching
async function fetchAllMonthsData(action, namaGuru, onProgress) {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const WAVE = 3;
    const combined = [];
    
    for (let i = 0; i < months.length; i += WAVE) {
        const wave = months.slice(i, i + WAVE);
        const results = await Promise.all(wave.map(async (bulan) => {
            try {
                const data = await fetchJson(action, namaGuru, bulan);
                if (onProgress) onProgress(1); // Tambah 1 selesai
                return data;
            } catch (err) {
                if (onProgress) onProgress(1); // Gagal tetap dihitung selesai
                return [];
            }
        }));
        results.forEach(d => { if (Array.isArray(d)) combined.push(...d); });
    }
    return combined;
}

document.addEventListener('click', async (e) => {
    const jurnalBtn = e.target.closest('#btnCetakJurnal');
    if (jurnalBtn) {
        const nisn = (document.getElementById('selectJurnalSiswa') || {}).value || '';
        if (!nisn || nisn === 'all') return notify('Silakan pilih siswa terlebih dahulu di dropdown', 'error');
        const original = jurnalBtn.innerHTML;
        jurnalBtn.disabled = true;
        jurnalBtn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Mengunduh bln 0/12...`;
        try {
            const info = requireStudent(nisn);
            let doneBulan = 0;
            const jurnalAll = await fetchAllMonthsData('getJurnalGuru', info.namaGuru, (tambah) => {
                doneBulan += tambah;
                jurnalBtn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Jurnal bln ${doneBulan}/12...`;
            });
            const data = jurnalAll.filter(j => String(j.nisn) === String(nisn));
            if (!data.length) throw new Error('Jurnal siswa kosong. PDF tidak dibuat dengan judul contoh.');
            
            jurnalBtn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Menyusun PDF...`;
            const pages = jurnalPages(data);
            if (!pages.length) throw new Error('Tidak ada halaman jurnal.');
            const built = await createPdfBlob(await jurnalDocDefinition(info, pages));
            showPdfPreview(built.blob, `Lembar_Kegiatan_PKL_${safeFilePart(info.student.nama)}.pdf`, 'Pratinjau Jurnal PDF');
        } catch (err) {
            notify(err.message || 'Gagal membuat PDF jurnal.', 'error');
        } finally {
            jurnalBtn.disabled = false;
            jurnalBtn.innerHTML = original;
        }
        return;
    }

    const agendaBtn = e.target.closest('#btnCetakAgendaHarian');
    if (!agendaBtn) return;
    const nisn = (document.getElementById('selectDetailSiswa') || {}).value || '';
    if (!nisn) return notify('Silakan pilih siswa terlebih dahulu di dropdown', 'error');
    const original = agendaBtn.innerHTML;
    agendaBtn.disabled = true;
    agendaBtn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Mengunduh bln 0/12...`;
    try {
        const info = requireStudent(nisn);
        let doneRekap = 0;
        let doneJurnal = 0;
        const [absensiAll, jurnalAll] = await Promise.all([
            fetchAllMonthsData('getRekapGuru', info.namaGuru, (tambah) => {
                doneRekap += tambah;
                agendaBtn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Rekap ${doneRekap}/12, Jurnal ${doneJurnal}/12...`;
            }),
            fetchAllMonthsData('getJurnalGuru', info.namaGuru, (tambah) => {
                doneJurnal += tambah;
                agendaBtn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Rekap ${doneRekap}/12, Jurnal ${doneJurnal}/12...`;
            })
        ]);
        const absensi = absensiAll.filter(a => String(a.nisn) === String(nisn));
        const jurnal = jurnalAll.filter(j => String(j.nisn) === String(nisn));
        if (!absensi.length && !jurnal.length) throw new Error('Tidak ada absensi atau jurnal untuk siswa ini.');
        
        agendaBtn.innerHTML = `<i class="ph ph-spinner animate-spin text-lg"></i> Menyusun PDF...`;
        const built = await createPdfBlob(agendaDocDefinition(info, buildAgendaRows(absensi, jurnal)));
        showPdfPreview(built.blob, `Agenda_Harian_PKL_${safeFilePart(info.student.nama)}.pdf`, 'Pratinjau Agenda Harian PDF');
    } catch (err) {
        notify(err.message || 'Gagal membuat PDF agenda.', 'error');
    } finally {
        agendaBtn.disabled = false;
        agendaBtn.innerHTML = original;
    }
});

# Carlito (OFL 1.1) — embed pdfmake

Font asli, tidak diubah. Sumber: https://github.com/googlefonts/carlito `fonts/ttf`.
Lisensi: `OFL.txt`. Reserved Font Name: **Carlito**. Boleh di-embed di PDF. Jangan dijual sendiri. Jangan ganti nama family.

Bukan CSS `@font-face`. Hanya untuk pdfmake (Jurnal, Rekap, Agenda Detail Siswa).

## File

| File | pdfmake style |
|---|---|
| `Carlito-Regular.ttf` | normal |
| `Carlito-Bold.ttf` | bold |
| `Carlito-Italic.ttf` | italics |
| `Carlito-BoldItalic.ttf` | bolditalics |
| `vfs_fonts.js` | VFS base64, key = nama file |

## Wire (agent induk, jangan di sini)

Script setelah `pdfmake`, sebelum `app.js`:

```html
<script src="fonts/vfs_fonts.js"></script>
```

0.1 / 0.2 (CDN `pdfmake.min.js` + assign vfs):

```javascript
pdfMake.vfs = vfs;
pdfMake.fonts = {
  Carlito: {
    normal: 'Carlito-Regular.ttf',
    bold: 'Carlito-Bold.ttf',
    italics: 'Carlito-Italic.ttf',
    bolditalics: 'Carlito-BoldItalic.ttf'
  }
};
```

0.3 (`addVirtualFileSystem` sudah dipanggil vfs_fonts.js jika `pdfMake` ada):

```javascript
pdfMake.addFonts({
  Carlito: {
    normal: 'Carlito-Regular.ttf',
    bold: 'Carlito-Bold.ttf',
    italics: 'Carlito-Italic.ttf',
    bolditalics: 'Carlito-BoldItalic.ttf'
  }
});
```

Dokumen:

```javascript
defaultStyle: { font: 'Carlito' }
```

Empat style wajib. Jangan pakai URL font sebagai pengganti embed.

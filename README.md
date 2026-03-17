# Gamato Piranti v2.0

**Suite alat digital modern — browser-native, gratis, tanpa upload ke server.**

[![Built with React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Built with Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

---

## ✨ Fitur

| Alat | Deskripsi |
|------|-----------|
| **QR & Barcode Studio** | QR code multi-template (URL, WiFi, email, telepon) + barcode berbagai format, warna & logo kustom |
| **PDF Lab – Suite** | 9 mode: kompres, gabung, pecah, ekstrak, hapus halaman, putar, atur ulang, gambar→PDF, teks→PDF |
| **Doc Studio** | Editor .docx dengan Find & Replace, template cepat, snapshot, ekspor .docx / .pdf / .txt |
| **Image Lab** | Kompres, resize, konversi format (JPG/PNG/WEBP), putar — batch processing |
| **Rak Utilitas** | JSON formatter, Base64, bulk teks/data, kalkulator pajak & bunga, statistik, WA link, password & token generator, hapus metadata gambar |

---

## 🚀 Pengembangan Lokal

```bash
npm install
npm run dev
```

## 📦 Build Produksi

```bash
npm run build
npm run preview
```

---

## 🌐 Deploy

### Vercel
Sudah ada `vercel.json` — push ke GitHub lalu connect ke Vercel. Otomatis.

### Netlify
Sudah ada `public/_redirects` — drag & drop folder `dist/` ke Netlify, atau connect repo.

### Cloudflare Pages
Build command: `npm run build` · Output: `dist`

---

## 🛠 Teknologi

- **React 19** + **Vite 7** + **TypeScript**
- **Tailwind CSS v4** — utility-first styling
- **framer-motion** — animasi halaman & komponen
- **lucide-react** — icon set
- **react-router-dom v7** — client-side routing
- **pdf-lib** — pemrosesan PDF di browser
- **docx** — ekspor .docx
- **qrcode** + **JsBarcode** — generasi QR & barcode

---

## 📁 Struktur Proyek

```
src/
├── components/
│   └── layout/
│       ├── Header.tsx      # Navbar sticky dengan dropdown animasi
│       ├── Footer.tsx      # Footer 4 kolom
│       └── Layout.tsx      # Shell wrapper + breadcrumb
├── pages/
│   ├── Home.tsx            # Landing page hero + tool grid
│   └── About.tsx           # Halaman About Us
├── utils/
│   ├── cn.ts               # Class name helper
│   └── sanitize.ts         # Input sanitizer
├── App.tsx                 # Semua logika tool + routing
├── main.tsx
└── index.css
```

---

© 2025 Gamato Piranti. Fokus ke utilitas, bukan klaim.

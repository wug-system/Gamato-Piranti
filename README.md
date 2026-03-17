# Gamato Piranti v2.0

**Suite alat digital modern — browser-native, gratis, privasi terjaga.**

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

## 📦 Build

```bash
npm run build
npm run preview
```

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
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Layout.tsx
├── pages/
│   ├── Home.tsx
│   └── About.tsx
├── utils/
│   ├── cn.ts
│   └── sanitize.ts
├── App.tsx          # Semua logika tool + routing
├── main.tsx
└── index.css
```

---

© 2025 Gamato Piranti · Powered by **WisDev**

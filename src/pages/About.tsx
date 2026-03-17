import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, QrCode, FileText, Image, Sliders, Shield, Cpu, ArrowRight } from 'lucide-react';

const pillars = [
  {
    icon: <Cpu className="w-5 h-5 text-blue-500" />,
    title: 'Browser-Native',
    desc: 'Semua pemrosesan terjadi langsung di perangkat kamu. File tidak pernah meninggalkan browser — tidak ada upload ke server kami.',
  },
  {
    icon: <Shield className="w-5 h-5 text-green-500" />,
    title: 'Privat & Aman',
    desc: 'Tidak ada akun, tidak ada tracking, tidak ada penyimpanan data. Kamu yang pegang kendali penuh atas file dan datamu.',
  },
  {
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    title: 'Cepat & Ringan',
    desc: 'Dibangun dengan React + Vite + Tailwind. Performa tinggi, antarmuka responsif, dan siap deploy ke hosting statis manapun.',
  },
];

const toolSuite = [
  { icon: <QrCode className="w-5 h-5" />, label: 'QR & Barcode Studio', desc: 'Buat QR code multi-template (URL, WiFi, email, telepon) dan barcode berbagai format dengan kustomisasi warna & logo.' },
  { icon: <FileText className="w-5 h-5" />, label: 'PDF Lab – Suite', desc: '9 mode pemrosesan PDF: kompres, gabung, pecah, ekstrak, hapus, putar, atur halaman, gambar→PDF, dan teks→PDF.' },
  { icon: <FileText className="w-5 h-5" />, label: 'Doc Studio', desc: 'Editor teks ringan dengan ekspor .docx, .pdf, .txt. Dilengkapi Find & Replace, format case, snapshot sesi, dan template cepat.' },
  { icon: <Image className="w-5 h-5" />, label: 'Image Lab', desc: 'Kompres, ubah ukuran, konversi format (JPG/PNG/WEBP), dan putar gambar secara batch langsung di browser.' },
  { icon: <Sliders className="w-5 h-5" />, label: 'Rak Utilitas', desc: '10+ alat kecil: JSON formatter, Base64 encoder, bulk teks, kalkulator pajak & bunga, statistik, WA link, password/token generator, dan hapus metadata gambar.' },
];

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-5"
      >
        <div className="inline-flex items-center gap-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-2xl">
          <Zap className="w-5 h-5" />
          <span className="font-bold text-lg">Gamato Piranti</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
          Tentang Kami
        </h1>
        <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto">
          Suite alat digital yang dibuat untuk menyederhanakan pekerjaan sehari-hari — tanpa ribet, tanpa biaya, tanpa privasi yang dikorbankan.
        </p>
      </motion.div>

      {/* Story */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm space-y-5"
      >
        <h2 className="text-2xl font-bold text-slate-900">Awal Mula</h2>
        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>
            <strong className="text-slate-900">Gamato Piranti</strong> lahir dari frustrasi yang sangat sederhana: terlalu banyak waktu yang terbuang berpindah-pindah antara berbagai website untuk menyelesaikan pekerjaan digital sehari-hari — mengompres gambar di satu tab, menggabungkan PDF di tab lain, membuat QR code di website berbeda, lalu kembali ke tempat lain untuk mengonversi dokumen.
          </p>
          <p>
            Kami percaya semua alat itu harusnya ada dalam satu tempat. Bersih. Cepat. Dan yang paling penting — <em>aman</em>. File kamu adalah milikmu, bukan milik server orang lain.
          </p>
          <p>
            Dengan arsitektur <strong className="text-slate-900">browser-native</strong>, semua pemrosesan di Gamato Piranti terjadi langsung di perangkat pengguna menggunakan Web APIs modern — tidak ada file yang dikirim ke server mana pun. Ini bukan sekadar klaim marketing, ini adalah pilihan arsitektur yang disengaja sejak hari pertama.
          </p>
        </div>
      </motion.section>

      {/* Pillars */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Prinsip Kami</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {pillars.map((p) => (
            <div key={p.title} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-slate-100">
                {p.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{p.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Tool Suite */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Suite Alat Digital</h2>
        <div className="space-y-3">
          {toolSuite.map((tool) => (
            <div key={tool.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl shrink-0 text-slate-500">
                {tool.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{tool.label}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{tool.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Tech stack */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white"
      >
        <h2 className="text-2xl font-bold mb-4">Dibangun dengan teknologi open source</h2>
        <p className="text-slate-400 mb-6 leading-relaxed">
          Gamato Piranti berdiri di atas ekosistem open source yang solid. Kami bersyukur pada komunitas developer yang telah membangun library-library luar biasa ini:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['React 19', 'Vite', 'Tailwind CSS', 'pdf-lib', 'docx', 'qrcode', 'JsBarcode', 'framer-motion', 'TypeScript'].map((t) => (
            <div key={t} className="bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 font-mono border border-slate-700">
              {t}
            </div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Siap mencoba?</h2>
        <p className="text-slate-500">Tidak perlu daftar. Langsung pakai.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/qr"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 group"
          >
            <span>Buka QR Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/pdf"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl font-semibold hover:bg-slate-50 transition-all"
          >
            PDF Lab
          </Link>
        </div>
      </div>
    </div>
  );
}

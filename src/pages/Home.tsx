import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  QrCode, FileText, Image as ImageIcon, SlidersHorizontal, BookOpen, Zap,
  ArrowRight, ShieldCheck, Cpu, Lock, Sparkles
} from 'lucide-react';

const tools = [
  {
    icon: <QrCode className="w-7 h-7 text-white" />,
    title: 'QR & Barcode Studio',
    desc: 'Buat QR code dengan logo & warna kustom. Barcode multi-format untuk produk, tiket, dan lainnya.',
    path: '/qr',
    gradient: 'from-teal-400 to-emerald-600',
    badge: 'QR · Barcode',
  },
  {
    icon: <FileText className="w-7 h-7 text-white" />,
    title: 'PDF Lab – Suite',
    desc: 'Toolkit PDF lengkap: kompres, gabung, pecah, atur ulang halaman, dan konversi.',
    path: '/pdf',
    gradient: 'from-blue-400 to-indigo-600',
    badge: '9 Mode',
  },
  {
    icon: <BookOpen className="w-7 h-7 text-white" />,
    title: 'Doc Studio',
    desc: 'Editor dokumen ringan dengan ekspor .docx, .pdf, dan .txt. Lengkap dengan utilitas teks.',
    path: '/docs',
    gradient: 'from-violet-400 to-purple-600',
    badge: '.docx · .pdf · .txt',
  },
  {
    icon: <ImageIcon className="w-7 h-7 text-white" />,
    title: 'Image Lab',
    desc: 'Kompres, ubah ukuran, konversi format, dan putar gambar langsung di perangkatmu.',
    path: '/image',
    gradient: 'from-orange-400 to-rose-500',
    badge: 'JPG · PNG · WEBP',
  },
  {
    icon: <SlidersHorizontal className="w-7 h-7 text-white" />,
    title: 'Rak Utilitas',
    desc: 'JSON formatter, Base64, kalkulator pajak & bunga, WhatsApp link, password generator, dan lainnya.',
    path: '/utility',
    gradient: 'from-pink-400 to-fuchsia-600',
    badge: '10+ Alat',
  },
];

const features = [
  { icon: <Cpu className="w-5 h-5 text-green-400" />, text: 'Semua diproses langsung di perangkatmu — privasi terjaga penuh' },
  { icon: <Lock className="w-5 h-5 text-green-400" />, text: 'Tanpa akun, tanpa registrasi, tanpa biaya tersembunyi' },
  { icon: <ShieldCheck className="w-5 h-5 text-green-400" />, text: 'File kamu tidak pernah meninggalkan perangkatmu' },
  { icon: <Zap className="w-5 h-5 text-green-400" />, text: 'Cepat, ringan, dan bekerja bahkan tanpa koneksi internet' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function Home() {
  return (
    <div className="space-y-24 pb-24">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-16 left-1/4 w-80 h-80 bg-blue-300/25 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-16 right-1/4 w-80 h-80 bg-purple-300/25 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
            <span className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 ring-1 ring-blue-100">
              <Sparkles className="w-4 h-4" />
              <span>Versi 2.0 — UI dirombak total, fitur makin lengkap</span>
            </span>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Satu Tempat,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Semua Alat Digital
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 mb-10 leading-relaxed">
              Gamato Piranti merapikan kerja harian: QR code, PDF suite, editor dokumen, olah gambar, sampai puluhan utilitas kecil. Cepat, aman, 100% gratis.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/qr" className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 group">
                <span>Mulai Eksplorasi</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/pdf" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
                <ShieldCheck className="w-5 h-5 text-slate-400" />
                <span>Lihat PDF Lab</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tools Grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Suite Lengkap</p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Alat yang benar-benar terpakai</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">Tidak perlu pindah-pindah website. Semua kebutuhan digital ada di satu tempat.</p>
        </div>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          {tools.map((tool) => (
            <motion.div key={tool.path} variants={cardVariants}>
              <Link to={tool.path} className="group block h-full">
                <div className="h-full bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${tool.gradient} opacity-[0.07] rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:opacity-[0.14] transition-opacity`} />
                  <div className="flex items-start justify-between mb-5">
                    <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${tool.gradient} shadow-lg`}>{tool.icon}</div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">{tool.badge}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{tool.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{tool.desc}</p>
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Buka alat</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Feature dark section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />

          <div className="relative z-10 grid md:grid-cols-2 gap-10 p-10 md:p-14 items-center">
            <div className="space-y-6">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Kenapa Gamato Piranti?</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">Semua yang kamu butuhkan, dalam satu kanvas.</h2>
              <p className="text-slate-400 text-base leading-relaxed">Berhenti loncat-loncat ke banyak website. Gamato Piranti menghadirkan semua alat digital esensial dalam satu antarmuka yang bersih, cepat, dan terpercaya.</p>
              <ul className="space-y-3">
                {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <div className="bg-green-500/15 p-1.5 rounded-full shrink-0">{f.icon}</div>
                    <span className="text-sm">{f.text}</span>
                  </li>
                ))}
              </ul>
              <Link to="/about" className="inline-flex items-center gap-2 text-white font-semibold text-sm hover:text-blue-300 transition-colors">
                Pelajari lebih lanjut <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mock terminal */}
            <div className="relative">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700/60 shadow-2xl">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 text-slate-500 text-xs font-mono">gamato-piranti</span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  {[
                    ["QR code generated", "280×280px"],
                    ["PDF merged", "3 files → 1"],
                    ["Image compressed", "4.2MB → 890KB"],
                    ["DOCX exported", "ready to share"],
                  ].map(([action, detail]) => (
                    <div key={action} className="flex gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-slate-300 flex-1">{action}</span>
                      <span className="text-slate-500">{detail}</span>
                    </div>
                  ))}
                  <div className="mt-4 flex gap-2 items-center">
                    <span className="text-blue-400">›</span>
                    <span className="text-slate-300">All done. No data sent.</span>
                    <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

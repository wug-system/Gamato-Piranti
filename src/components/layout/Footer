import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-1.5 rounded-lg text-white">
                <Zap className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-slate-900">Gamato Piranti</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Suite alat digital modern. QR code, PDF, gambar, dokumen — semuanya diproses langsung di browser kamu. Tanpa upload. Tanpa ribet.
            </p>
            <div className="inline-flex items-center space-x-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span>100% Browser-native · Gratis</span>
            </div>
          </div>

          {/* Tools */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">Alat</h3>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link to="/qr" className="hover:text-blue-600 transition-colors">QR & Barcode Studio</Link></li>
              <li><Link to="/pdf" className="hover:text-blue-600 transition-colors">PDF Lab – Suite</Link></li>
              <li><Link to="/docs" className="hover:text-blue-600 transition-colors">Doc Studio</Link></li>
              <li><Link to="/image" className="hover:text-blue-600 transition-colors">Image Lab</Link></li>
              <li><Link to="/utility" className="hover:text-blue-600 transition-colors">Rak Utilitas</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">Perusahaan</h3>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Tech info */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">Teknologi</h3>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li>React + Vite + Tailwind CSS</li>
              <li>pdf-lib · docx · qrcode</li>
              <li>JsBarcode · framer-motion</li>
              <li className="pt-1 text-xs text-slate-400">Siap deploy ke Vercel, Netlify, Cloudflare Pages</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Gamato Piranti. Fokus ke utilitas, bukan klaim.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
            <span className="text-slate-200">•</span>
            <Link to="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

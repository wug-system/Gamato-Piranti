import { Link } from 'react-router-dom';
import { Zap, Code2, Heart } from 'lucide-react';

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
              Suite alat digital modern. QR code, PDF, gambar, dokumen — semuanya diproses langsung di perangkatmu. Aman, cepat, gratis.
            </p>
            <div className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-100">
              <Zap className="w-3 h-3" />
              <span>100% Native · Gratis</span>
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
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">Informasi</h3>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link to="/about" className="hover:text-blue-600 transition-colors">About Us</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Tech */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 text-sm">Teknologi</h3>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li>React + Vite + Tailwind CSS</li>
              <li>pdf-lib · docx · qrcode</li>
              <li>JsBarcode · framer-motion</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-100 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Gamato Piranti. Dibuat dengan <Heart className="w-3 h-3 inline text-red-400" /> untuk produktivitas.</p>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Code2 className="w-3.5 h-3.5" />
            <span>Powered by</span>
            <span className="text-slate-600 font-bold">WisDev</span>
          </div>
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

import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Page hero bar (shown on tool pages, not home) */}
        {!isHome && (
          <div className="border-b border-slate-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center text-xs text-slate-400 gap-2">
                <a href="/" className="hover:text-slate-600 transition-colors">Beranda</a>
                <span>›</span>
                <span className="text-slate-600">{getPageLabel(pathname)}</span>
              </div>
            </div>
          </div>
        )}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function getPageLabel(path: string) {
  const map: Record<string, string> = {
    '/qr': 'QR & Barcode Studio',
    '/pdf': 'PDF Lab – Suite',
    '/docs': 'Doc Studio',
    '/image': 'Image Lab',
    '/utility': 'Rak Utilitas',
    '/about': 'About Us',
    '/privacy': 'Privacy Policy',
    '/terms': 'Terms of Service',
  };
  return map[path] ?? 'Halaman';
}

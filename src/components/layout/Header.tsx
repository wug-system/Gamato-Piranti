import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, ChevronDown,
  FileText, Image, QrCode, Sliders,
  Wrench, Zap, Barcode, Info, Shield, BookOpen,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type DropGroup = 'kode' | 'dokumen' | 'gambar' | 'utilitas' | null;

const menuGroups = [
  {
    id: 'kode' as const,
    title: 'Kode',
    icon: <QrCode className="w-4 h-4" />,
    items: [
      { name: 'QR & Barcode Studio', path: '/qr', icon: <QrCode className="w-4 h-4 text-teal-500" />, desc: 'QR code + barcode dalam satu studio' },
    ],
  },
  {
    id: 'dokumen' as const,
    title: 'Dokumen',
    icon: <FileText className="w-4 h-4" />,
    items: [
      { name: 'PDF Lab – Suite', path: '/pdf', icon: <FileText className="w-4 h-4 text-blue-500" />, desc: 'Gabung, kompres, pecah, atur halaman' },
      { name: 'Doc Studio', path: '/docs', icon: <BookOpen className="w-4 h-4 text-violet-500" />, desc: 'Editor ringan & ekspor .docx / .pdf' },
    ],
  },
  {
    id: 'gambar' as const,
    title: 'Gambar',
    icon: <Image className="w-4 h-4" />,
    items: [
      { name: 'Image Lab', path: '/image', icon: <Image className="w-4 h-4 text-orange-500" />, desc: 'Kompres, resize, konversi, putar' },
    ],
  },
  {
    id: 'utilitas' as const,
    title: 'Utilitas',
    icon: <Wrench className="w-4 h-4" />,
    items: [
      { name: 'Rak Utilitas', path: '/utility', icon: <Sliders className="w-4 h-4 text-pink-500" />, desc: 'JSON, Base64, kalkulator, password & lainnya' },
    ],
  },
];

const pagesLinks = [
  { name: 'About Us', path: '/about' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropGroup>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (items: { path: string }[]) =>
    items.some(i => location.pathname === i.path);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
              <Zap className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              Gamato<span className="text-slate-400 font-light">Piranti</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1" ref={dropdownRef}>
            {menuGroups.map((group) => (
              <div key={group.id} className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === group.id ? null : group.id)}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeDropdown === group.id || isActive(group.items)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {group.icon}
                  <span>{group.title}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activeDropdown === group.id ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeDropdown === group.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden ring-1 ring-black/5"
                    >
                      <div className="p-2 space-y-1">
                        {group.items.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            className="flex items-start space-x-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group/item"
                          >
                            <div className="mt-0.5 bg-white p-1.5 rounded-lg shadow-sm ring-1 ring-slate-100 group-hover/item:shadow-md transition-all shrink-0">
                              {item.icon}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900 group-hover/item:text-blue-600 transition-colors">{item.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 mx-1" />

            <Link
              to="/about"
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                location.pathname === '/about'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </Link>
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-white border-t border-slate-100"
          >
            <div className="px-4 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
              {menuGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <h3 className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {group.icon}
                    <span>{group.title}</span>
                  </h3>
                  <div className="space-y-1 pl-2 border-l-2 border-slate-100">
                    {group.items.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center space-x-3 py-2.5 px-3 rounded-xl transition-colors ${
                          location.pathname === item.path
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {item.icon}
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-100 space-y-1">
                {pagesLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="flex items-center space-x-2 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {link.name === 'About Us' && <Info className="w-4 h-4 text-slate-400" />}
                    {link.name === 'Privacy Policy' && <Shield className="w-4 h-4 text-slate-400" />}
                    {link.name === 'Terms of Service' && <BookOpen className="w-4 h-4 text-slate-400" />}
                    <span>{link.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

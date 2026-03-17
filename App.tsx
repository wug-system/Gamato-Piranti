import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { cn } from "./utils/cn";
import { sanitizeText, sanitizeUrl, sanitizeFileName, sanitizeNumberString, sanitizePhone } from "./utils/sanitize";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import About from "./pages/About";

// ─── Shared primitives ───────────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 mb-1.5">{children}</label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className, id, ...props }) => (
  <div>
    {label && <Label htmlFor={id}>{label}</Label>}
    <input id={id} {...props} className={cn("w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400", className)} />
  </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, className, id, children, ...props }) => (
  <div>
    {label && <Label htmlFor={id}>{label}</Label>}
    <select id={id} {...props} className={cn("w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10", className)}>
      {children}
    </select>
  </div>
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className, id, ...props }) => (
  <div>
    {label && <Label htmlFor={id}>{label}</Label>}
    <textarea id={id} {...props} className={cn("w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 resize-none", className)} />
  </div>
);

const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }> = ({ variant = "primary", className, children, ...props }) => (
  <button {...props} className={cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:pointer-events-none",
    variant === "primary" && "bg-slate-900 text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400",
    variant === "secondary" && "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:text-slate-300",
    variant === "danger" && "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    variant === "ghost" && "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
    className
  )}>{children}</button>
);

const SectionBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
    {children}
  </span>
);

// ─── File helpers ─────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = reject;
    r.readAsArrayBuffer(file);
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ─── Dropzone component ───────────────────────────────────────────────────────

const Dropzone: React.FC<{
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
  icon?: string;
  isDragging?: boolean;
  setIsDragging?: (v: boolean) => void;
}> = ({ onFiles, accept, multiple = true, label = "Drop files here", sublabel = "or click to browse", icon = "📂", isDragging, setIsDragging }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging?.(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging?.(true); }}
      onDragLeave={() => setIsDragging?.(false)}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 group",
        isDragging ? "border-blue-500 bg-blue-50 scale-[1.01]" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/40"
      )}
    >
      <input ref={inputRef} type="file" className="hidden" accept={accept} multiple={multiple} onChange={(e) => { if (e.target.files) onFiles(Array.from(e.target.files)); }} />
      <div className="flex flex-col items-center gap-3">
        <div className={cn("p-4 rounded-2xl text-3xl transition-all", isDragging ? "bg-blue-100" : "bg-slate-100 group-hover:bg-blue-100")}>{icon}</div>
        <div>
          <p className="text-base font-semibold text-slate-800">{label}</p>
          <p className="text-sm text-slate-400 mt-0.5">{sublabel}</p>
        </div>
      </div>
    </div>
  );
};

// ─── QR & Barcode Studio ──────────────────────────────────────────────────────

type QrTemplate = "url" | "text" | "wifi" | "email" | "phone";

const QRBarcodeStudio: React.FC = () => {
  const [mode, setMode] = useState<"qr" | "barcode">("qr");
  const [qrTemplate, setQrTemplate] = useState<QrTemplate>("url");
  const [qrUrl, setQrUrl] = useState("https://gamato-piranti.local");
  const [qrText, setQrText] = useState("");
  const [qrWifiSsid, setQrWifiSsid] = useState("");
  const [qrWifiPass, setQrWifiPass] = useState("");
  const [qrWifiEnc, setQrWifiEnc] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [qrWifiHidden, setQrWifiHidden] = useState(false);
  const [qrEmailTo, setQrEmailTo] = useState("");
  const [qrEmailSubject, setQrEmailSubject] = useState("");
  const [qrEmailBody, setQrEmailBody] = useState("");
  const [qrPhone, setQrPhone] = useState("");
  const [barcodeContent, setBarcodeContent] = useState("123456789012");
  const [barcodeFormat, setBarcodeFormat] = useState<string>("CODE128");
  const [barcodeHeight, setBarcodeHeight] = useState(80);
  const [size, setSize] = useState(280);
  const [fgColor, setFgColor] = useState("#020617");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [qrUrlImage, setQrUrlImage] = useState<string | null>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoPreview = useMemo(() => logoFile ? URL.createObjectURL(logoFile) : null, [logoFile]);

  const buildQrPayload = (): string => {
    switch (qrTemplate) {
      case "url": return sanitizeUrl(qrUrl);
      case "text": return sanitizeText(qrText);
      case "wifi": {
        const ssid = sanitizeText(qrWifiSsid);
        if (!ssid) return "";
        const pass = sanitizeText(qrWifiPass);
        const passPart = qrWifiEnc === "nopass" ? "" : `P:${pass};`;
        return `WIFI:T:${qrWifiEnc};S:${ssid};${passPart}H:${qrWifiHidden ? "true" : "false"};;`;
      }
      case "email": {
        const to = sanitizeText(qrEmailTo).replace(/\s+/g, "");
        if (!to) return "";
        const params: string[] = [];
        const subj = sanitizeText(qrEmailSubject);
        const body = sanitizeText(qrEmailBody);
        if (subj) params.push(`subject=${encodeURIComponent(subj)}`);
        if (body) params.push(`body=${encodeURIComponent(body)}`);
        return `mailto:${to}${params.length ? `?${params.join("&")}` : ""}`;
      }
      case "phone": {
        const phone = qrPhone.replace(/[^\d+]/g, "").replace(/(?!^)[+]/g, "");
        return phone ? `tel:${phone}` : "";
      }
      default: return "";
    }
  };

  const generate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      if (mode === "qr") {
        const payload = buildQrPayload();
        if (!payload.trim()) { setError("Isi QR belum lengkap."); return; }
        const baseCanvas = document.createElement("canvas");
        await QRCode.toCanvas(baseCanvas, payload, { margin: 2, width: size, color: { dark: fgColor, light: bgColor } });
        if (!logoFile) {
          setQrUrlImage(baseCanvas.toDataURL("image/png"));
        } else {
          const ctx = baseCanvas.getContext("2d")!;
          const logoUrl = await fileToDataUrl(logoFile);
          const img = new Image();
          img.src = logoUrl;
          await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); });
          const ls = size * 0.25, x = (size - ls) / 2, y = (size - ls) / 2, r = ls * 0.22;
          ctx.save(); ctx.beginPath();
          ctx.moveTo(x + r, y); ctx.lineTo(x + ls - r, y); ctx.quadraticCurveTo(x + ls, y, x + ls, y + r);
          ctx.lineTo(x + ls, y + ls - r); ctx.quadraticCurveTo(x + ls, y + ls, x + ls - r, y + ls);
          ctx.lineTo(x + r, y + ls); ctx.quadraticCurveTo(x, y + ls, x, y + ls - r);
          ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
          ctx.fillStyle = "rgba(255,255,255,0.98)"; ctx.fill(); ctx.clip();
          ctx.drawImage(img, x, y, ls, ls); ctx.restore();
          setQrUrlImage(baseCanvas.toDataURL("image/png"));
        }
      } else {
        const canvas = barcodeCanvasRef.current;
        if (!canvas) return;
        let value = barcodeContent.trim();
        if (!value) { setError("Isi barcode belum diisi."); return; }
        const numericFormats = ["EAN13", "EAN8", "UPC", "ITF14"];
        if (numericFormats.includes(barcodeFormat)) {
          const digits = value.replace(/\D/g, "");
          if (!digits) { setError("Format ini hanya mendukung angka."); return; }
          const len = digits.length;
          if (barcodeFormat === "EAN13" && len !== 12 && len !== 13) { setError("EAN-13: butuh 12 atau 13 digit."); return; }
          if (barcodeFormat === "EAN8" && len !== 7 && len !== 8) { setError("EAN-8: butuh 7 atau 8 digit."); return; }
          if (barcodeFormat === "UPC" && len !== 11 && len !== 12) { setError("UPC: butuh 11 atau 12 digit."); return; }
          if (barcodeFormat === "ITF14" && len !== 13 && len !== 14) { setError("ITF-14: butuh 13 atau 14 digit."); return; }
          value = digits;
        }
        JsBarcode(canvas, value, { format: barcodeFormat as any, lineColor: fgColor, background: bgColor, width: 2, height: barcodeHeight, displayValue: true, margin: 10 });
      }
    } catch (err: any) {
      setError(err?.message || "Gagal membuat kode");
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate QR on change
  useEffect(() => {
    if (mode !== "qr") return;
    const payload = buildQrPayload();
    if (!payload.trim()) return;
    const timer = setTimeout(() => generate(), 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, qrTemplate, qrUrl, qrText, qrWifiSsid, qrWifiPass, qrWifiEnc, qrWifiHidden, qrEmailTo, qrEmailSubject, qrEmailBody, qrPhone, size, fgColor, bgColor, logoFile]);

  const downloadQR = () => {
    if (!qrUrlImage) return;
    fetch(qrUrlImage).then(r => r.blob()).then(b => downloadBlob(b, "gamato-qr.png"));
  };
  const downloadBarcode = () => {
    const canvas = barcodeCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob(b => { if (b) downloadBlob(b, "gamato-barcode.png"); });
  };

  const TEMPLATES: { id: QrTemplate; label: string; emoji: string }[] = [
    { id: "url", label: "URL", emoji: "🔗" },
    { id: "text", label: "Teks", emoji: "📝" },
    { id: "wifi", label: "WiFi", emoji: "📶" },
    { id: "email", label: "Email", emoji: "✉️" },
    { id: "phone", label: "Telepon", emoji: "📞" },
  ];

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-3">
        {[{ id: "qr", label: "QR Code", sub: "5 template • logo • warna" }, { id: "barcode", label: "Barcode", sub: "6 format • validasi otomatis" }].map(m => (
          <button key={m.id} type="button" onClick={() => setMode(m.id as "qr" | "barcode")}
            className={cn("rounded-2xl border-2 p-4 text-left transition-all", mode === m.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300")}>
            <div className={cn("font-bold text-base", mode === m.id ? "text-blue-700" : "text-slate-900")}>{m.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* LEFT: Controls */}
        <div className="space-y-5">
          {mode === "qr" && (
            <>
              {/* Template selector */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Template QR</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t.id} type="button" onClick={() => setQrTemplate(t.id)}
                      className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                        qrTemplate === t.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50")}>
                      <span>{t.emoji}</span><span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template form */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                {qrTemplate === "url" && <Input label="URL / Link" value={qrUrl} onChange={e => setQrUrl(sanitizeUrl(e.target.value))} placeholder="https://example.com" type="url" />}
                {qrTemplate === "text" && <Textarea label="Teks Bebas" rows={5} value={qrText} onChange={e => setQrText(sanitizeText(e.target.value))} placeholder="Ketik pesan, catatan, atau instruksi…" />}
                {qrTemplate === "wifi" && (
                  <div className="space-y-3">
                    <Input label="Nama Jaringan (SSID)" value={qrWifiSsid} onChange={e => setQrWifiSsid(sanitizeText(e.target.value))} placeholder="Nama WiFi" />
                    <div className="grid grid-cols-2 gap-3">
                      <Select label="Enkripsi" value={qrWifiEnc} onChange={e => setQrWifiEnc(e.target.value as any)}>
                        <option value="WPA">WPA / WPA2</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">Tanpa password</option>
                      </Select>
                      <Input label="Password" type="password" disabled={qrWifiEnc === "nopass"} value={qrWifiPass} onChange={e => setQrWifiPass(sanitizeText(e.target.value))} placeholder={qrWifiEnc === "nopass" ? "—" : "Password WiFi"} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={qrWifiHidden} onChange={e => setQrWifiHidden(e.target.checked)} className="rounded border-slate-300 accent-blue-600" />
                      Jaringan tersembunyi (hidden SSID)
                    </label>
                  </div>
                )}
                {qrTemplate === "email" && (
                  <div className="space-y-3">
                    <Input label="Kepada (email)" type="email" value={qrEmailTo} onChange={e => setQrEmailTo(sanitizeText(e.target.value))} placeholder="nama@domain.com" />
                    <Input label="Subjek" value={qrEmailSubject} onChange={e => setQrEmailSubject(sanitizeText(e.target.value))} placeholder="Subjek email" />
                    <Textarea label="Isi Pesan" rows={3} value={qrEmailBody} onChange={e => setQrEmailBody(sanitizeText(e.target.value))} placeholder="Isi email otomatis…" />
                  </div>
                )}
                {qrTemplate === "phone" && (
                  <Input label="Nomor Telepon" value={qrPhone} onChange={e => setQrPhone(sanitizeText(e.target.value))} placeholder="+62812xxxxxxx" />
                )}
              </div>
            </>
          )}

          {mode === "barcode" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <Textarea label="Konten Barcode" rows={4} value={barcodeContent} onChange={e => setBarcodeContent(sanitizeText(e.target.value))} placeholder="Kode produk, SKU, atau angka…" />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Format" value={barcodeFormat} onChange={e => setBarcodeFormat(e.target.value)}>
                  <option value="CODE128">CODE 128 (umum)</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="EAN8">EAN-8</option>
                  <option value="UPC">UPC</option>
                  <option value="CODE39">CODE 39</option>
                  <option value="ITF14">ITF-14</option>
                </Select>
                <Input label="Tinggi (px)" type="number" min={40} max={200} value={barcodeHeight} onChange={e => setBarcodeHeight(Number(e.target.value) || 80)} />
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">⚠ Format EAN/UPC/ITF hanya mendukung angka dengan panjang tertentu.</p>
            </div>
          )}

          {/* Customization */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Kustomisasi</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Warna Utama</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} className="h-11 w-11 rounded-xl border border-slate-200 cursor-pointer p-0.5 shadow-sm" />
                  <span className="text-sm font-mono text-slate-500">{fgColor}</span>
                </div>
              </div>
              <div>
                <Label>Warna Latar</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-11 w-11 rounded-xl border border-slate-200 cursor-pointer p-0.5 shadow-sm" />
                  <span className="text-sm font-mono text-slate-500">{bgColor}</span>
                </div>
              </div>
            </div>

            {mode === "qr" && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Ukuran QR</Label>
                    <span className="text-sm font-bold text-blue-600">{size}px</span>
                  </div>
                  <input type="range" min={128} max={512} value={size} onChange={e => setSize(Number(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600 bg-slate-200" />
                </div>

                <div>
                  <Label>Logo Tengah (Opsional)</Label>
                  <label className="mt-1 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-5 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all group">
                    {logoPreview ? (
                      <div className="flex items-center gap-4 w-full">
                        <img src={logoPreview} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm" />
                        <span className="flex-1 text-sm text-slate-600 font-medium">Logo terpasang ✓</span>
                        <button type="button" onClick={e => { e.preventDefault(); setLogoFile(null); }} className="text-sm text-red-500 font-semibold hover:text-red-700">Hapus</button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl mb-2">🖼</div>
                        <p className="text-sm font-semibold text-slate-600">Upload Logo <span className="text-blue-600">PNG/JPG</span></p>
                        <p className="text-xs text-slate-400 mt-1">Akan tampil di tengah QR code</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              </>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex gap-2"><span>⚠</span>{error}</div>}

          <Btn onClick={generate} disabled={isGenerating || !(mode === "qr" ? !!buildQrPayload().trim() : !!barcodeContent.trim())} className="w-full py-4 text-base">
            {isGenerating ? "⏳ Memproses…" : mode === "qr" ? "⚡ Generate QR Code" : "⚡ Generate Barcode"}
          </Btn>
        </div>

        {/* RIGHT: Preview */}
        <div className="sticky top-24 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center">Preview Real-time</p>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[380px] shadow-sm">
            {mode === "qr" ? (
              qrUrlImage ? (
                <div className="bg-white p-5 rounded-2xl shadow-2xl shadow-slate-200/80">
                  <img src={qrUrlImage} alt="QR Code" className="rounded-xl" style={{ width: Math.min(size, 260), height: Math.min(size, 260) }} />
                </div>
              ) : (
                <div className="w-56 h-56 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <p className="text-sm text-slate-400 text-center px-6">Isi form di kiri untuk melihat preview QR</p>
                </div>
              )
            ) : (
              <div className="bg-white p-5 rounded-2xl shadow-xl w-full">
                <canvas ref={barcodeCanvasRef} className="max-w-full" />
                {!barcodeContent.trim() && <div className="h-28 flex items-center justify-center"><p className="text-sm text-slate-400">Isi konten barcode</p></div>}
              </div>
            )}
          </div>

          {mode === "qr" ? (
            <Btn onClick={downloadQR} disabled={!qrUrlImage} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white border-0 text-base shadow-lg shadow-blue-600/20">
              ⬇ Unduh QR sebagai PNG
            </Btn>
          ) : (
            <Btn onClick={downloadBarcode} disabled={!barcodeContent.trim()} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white border-0 text-base shadow-lg shadow-blue-600/20">
              ⬇ Unduh Barcode PNG
            </Btn>
          )}

          <div className="text-center"><SectionBadge>100% browser · tanpa upload</SectionBadge></div>
        </div>
      </div>
    </div>
  );
};

// ─── PDF Lab ──────────────────────────────────────────────────────────────────

function parsePageSpec(input: string, totalPages: number): number[] {
  const parts = input.split(/[,;]/).map(p => p.trim()).filter(Boolean);
  const pages = new Set<number>();
  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      let start = parseInt(rangeMatch[1], 10), end = parseInt(rangeMatch[2], 10);
      if (start > end) [start, end] = [end, start];
      for (let p = start; p <= end; p++) if (p >= 1 && p <= totalPages) pages.add(p - 1);
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) pages.add(num - 1);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

type PdfMode = "compress" | "merge" | "split" | "extract" | "delete" | "rotate" | "organize" | "imagesToPdf" | "textToPdf";

const PdfTools: React.FC = () => {
  const [mode, setMode] = useState<PdfMode>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [pageSpec, setPageSpec] = useState("1-3");
  const [compressLevel, setCompressLevel] = useState<"low" | "medium" | "high">("medium");
  const [rotateSpec, setRotateSpec] = useState("semua");
  const [rotateDegrees, setRotateDegrees] = useState(90);
  const [textForPdf, setTextForPdf] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const isPdfMode = ["compress", "merge", "split", "extract", "delete", "rotate", "organize"].includes(mode);

  const addFiles = (incoming: File[]) => {
    const filtered = isPdfMode
      ? incoming.filter(f => f.type === "application/pdf")
      : mode === "imagesToPdf"
      ? incoming.filter(f => ["image/jpeg", "image/png", "image/jpg"].includes(f.type))
      : incoming;
    setFiles(prev => mode === "merge" || mode === "imagesToPdf" ? [...prev, ...filtered] : [filtered[0]]);
    setInfo(null);
  };

  const removeFile = (i: number) => setFiles(files.filter((_, idx) => idx !== i));

  const totalSizeMb = useMemo(() =>
    files.length ? Math.round(files.reduce((a, f) => a + f.size, 0) / 1024 / 1024 * 10) / 10 : 0,
    [files]);

  const handleRun = async () => {
    setInfo(null);
    if (mode === "textToPdf") {
      if (!textForPdf.trim()) return;
      setIsWorking(true);
      try {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12, lineHeight = fontSize + 4, margin = 50;
        const maxCharsPerLine = Math.floor((595.28 - margin * 2) / (fontSize * 0.55));
        const allLines: string[] = [];
        for (const raw of textForPdf.split(/\r?\n/)) {
          if (!raw) { allLines.push(""); continue; }
          for (let s = 0; s < raw.length; s += maxCharsPerLine) allLines.push(raw.slice(s, s + maxCharsPerLine));
        }
        let page = pdfDoc.addPage(), { height } = page.getSize(), y = height - margin;
        const addPage = () => { page = pdfDoc.addPage(); ({ height } = page.getSize()); y = height - margin; };
        for (const line of allLines) {
          if (y < margin + lineHeight) addPage();
          if (line) page.drawText(line, { x: margin, y: y - lineHeight, size: fontSize, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
        }
        const blob = new Blob([await pdfDoc.save()], { type: "application/pdf" });
        downloadBlob(blob, "gamato-text.pdf");
        setInfo("✓ Teks berhasil dikonversi ke PDF.");
      } catch (err: any) { setInfo("✗ " + (err?.message || "Gagal.")); }
      finally { setIsWorking(false); }
      return;
    }
    if (mode === "imagesToPdf") {
      if (!files.length) return;
      setIsWorking(true);
      try {
        const pdfDoc = await PDFDocument.create();
        for (const file of files) {
          const bytes = new Uint8Array(await fileToArrayBuffer(file));
          const image = file.type === "image/png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
          const { width, height } = image.scale(1);
          const pg = pdfDoc.addPage([width, height]);
          pg.drawImage(image, { x: 0, y: 0, width, height });
        }
        downloadBlob(new Blob([await pdfDoc.save()], { type: "application/pdf" }), "gamato-images.pdf");
        setInfo(`✓ ${files.length} gambar digabung menjadi PDF.`);
      } catch (err: any) { setInfo("✗ " + (err?.message || "Gagal.")); }
      finally { setIsWorking(false); }
      return;
    }
    if (!files.length) return;
    setIsWorking(true);
    try {
      if (mode === "merge") {
        const doc = await PDFDocument.create();
        for (const file of files) {
          const src = await PDFDocument.load(await fileToArrayBuffer(file));
          (await doc.copyPages(src, src.getPageIndices())).forEach(p => doc.addPage(p));
        }
        downloadBlob(new Blob([await doc.save()], { type: "application/pdf" }), "gamato-merged.pdf");
        setInfo(`✓ ${files.length} PDF berhasil digabung.`);
      } else if (mode === "split") {
        const src = await PDFDocument.load(await fileToArrayBuffer(files[0]));
        for (let i = 0; i < src.getPageCount(); i++) {
          const doc = await PDFDocument.create();
          doc.addPage((await doc.copyPages(src, [i]))[0]);
          downloadBlob(new Blob([await doc.save()], { type: "application/pdf" }), `gamato-page-${i + 1}.pdf`);
        }
        setInfo(`✓ PDF dipecah menjadi ${src.getPageCount()} file.`);
      } else if (mode === "compress") {
        const doc = await PDFDocument.load(await fileToArrayBuffer(files[0]), { updateMetadata: true });
        doc.setTitle(`Compressed by Gamato Piranti (${compressLevel})`);
        downloadBlob(new Blob([await doc.save({ useObjectStreams: true })], { type: "application/pdf" }), `gamato-compressed-${compressLevel}.pdf`);
        setInfo(`✓ PDF dikompresi (level: ${compressLevel}).`);
      } else if (mode === "extract") {
        const src = await PDFDocument.load(await fileToArrayBuffer(files[0]));
        const indices = parsePageSpec(pageSpec, src.getPageCount());
        if (!indices.length) { setInfo("✗ Rentang halaman tidak valid."); return; }
        const doc = await PDFDocument.create();
        (await doc.copyPages(src, indices)).forEach(p => doc.addPage(p));
        downloadBlob(new Blob([await doc.save()], { type: "application/pdf" }), "gamato-extract.pdf");
        setInfo(`✓ ${indices.length} halaman diekstrak.`);
      } else if (mode === "delete") {
        const src = await PDFDocument.load(await fileToArrayBuffer(files[0]));
        const total = src.getPageCount();
        const toRemove = new Set(parsePageSpec(pageSpec, total));
        const keep = Array.from({ length: total }, (_, i) => i).filter(i => !toRemove.has(i));
        const doc = await PDFDocument.create();
        (await doc.copyPages(src, keep)).forEach(p => doc.addPage(p));
        downloadBlob(new Blob([await doc.save()], { type: "application/pdf" }), "gamato-clean.pdf");
        setInfo(`✓ ${toRemove.size} halaman dihapus. Sisa ${keep.length} halaman.`);
      } else if (mode === "rotate") {
        const src = await PDFDocument.load(await fileToArrayBuffer(files[0]));
        const total = src.getPageCount();
        const target = rotateSpec === "semua" ? Array.from({ length: total }, (_, i) => i) : parsePageSpec(pageSpec, total);
        target.forEach(idx => src.getPage(idx).setRotation(degrees(rotateDegrees)));
        downloadBlob(new Blob([await src.save()], { type: "application/pdf" }), "gamato-rotated.pdf");
        setInfo(`✓ ${target.length} halaman diputar ${rotateDegrees}°.`);
      } else if (mode === "organize") {
        const src = await PDFDocument.load(await fileToArrayBuffer(files[0]));
        const total = src.getPageCount();
        const order: number[] = [];
        for (const token of pageSpec.split(/[,;]/).map(p => p.trim()).filter(Boolean)) {
          const m = token.match(/^(\d+)-(\d+)$/);
          if (m) { let s = parseInt(m[1]), e = parseInt(m[2]); if (s > e) [s, e] = [e, s]; for (let p = s; p <= e; p++) if (p >= 1 && p <= total) order.push(p - 1); }
          else { const n = parseInt(token); if (!isNaN(n) && n >= 1 && n <= total) order.push(n - 1); }
        }
        if (!order.length) { setInfo("✗ Urutan halaman tidak valid."); return; }
        const doc = await PDFDocument.create();
        (await doc.copyPages(src, order)).forEach(p => doc.addPage(p));
        downloadBlob(new Blob([await doc.save()], { type: "application/pdf" }), "gamato-organized.pdf");
        setInfo(`✓ Halaman diatur ulang (${pageSpec}).`);
      }
    } catch (err: any) { setInfo("✗ " + (err?.message || "Gagal memproses PDF.")); }
    finally { setIsWorking(false); }
  };

  const PDF_MODES: { id: PdfMode; label: string; emoji: string; desc: string }[] = [
    { id: "merge", label: "Gabung", emoji: "🔗", desc: "Combine multiple PDFs" },
    { id: "split", label: "Pecah", emoji: "✂️", desc: "Tiap halaman jadi file" },
    { id: "compress", label: "Kompres", emoji: "📦", desc: "Kurangi ukuran file" },
    { id: "extract", label: "Ekstrak", emoji: "📤", desc: "Ambil halaman tertentu" },
    { id: "delete", label: "Hapus Halaman", emoji: "🗑", desc: "Buang halaman" },
    { id: "rotate", label: "Putar", emoji: "🔄", desc: "Rotasi halaman" },
    { id: "organize", label: "Atur Ulang", emoji: "🗂", desc: "Susun urutan halaman" },
    { id: "imagesToPdf", label: "Gambar → PDF", emoji: "🖼", desc: "JPG/PNG ke PDF" },
    { id: "textToPdf", label: "Teks → PDF", emoji: "📄", desc: "Teks polos ke PDF" },
  ];

  return (
    <div className="space-y-6">
      {/* Mode cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {PDF_MODES.map(m => (
          <button key={m.id} type="button" onClick={() => { setMode(m.id); setFiles([]); setInfo(null); }}
            className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-center transition-all",
              mode === m.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")}>
            <span className="text-2xl">{m.emoji}</span>
            <span className={cn("text-xs font-bold", mode === m.id ? "text-blue-700" : "text-slate-700")}>{m.label}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* LEFT */}
        <div className="space-y-5">
          {/* Text-to-PDF special */}
          {mode === "textToPdf" ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <Textarea label="Teks untuk dijadikan PDF" rows={12} value={textForPdf} onChange={e => setTextForPdf(e.target.value)} placeholder="Tulis atau tempel teks di sini…" />
              <Btn onClick={handleRun} disabled={isWorking || !textForPdf.trim()} className="w-full py-3.5">
                {isWorking ? "⏳ Memproses…" : "📄 Jadikan PDF"}
              </Btn>
            </div>
          ) : (
            <>
              {/* Dropzone */}
              <Dropzone
                onFiles={addFiles}
                accept={mode === "imagesToPdf" ? "image/jpeg,image/png" : "application/pdf"}
                multiple={mode === "merge" || mode === "imagesToPdf"}
                label={mode === "imagesToPdf" ? "Drop gambar JPG/PNG di sini" : "Drop file PDF di sini"}
                sublabel={mode === "merge" ? "Bisa pilih beberapa file — urutannya bisa diatur" : "atau klik untuk browse"}
                icon={mode === "imagesToPdf" ? "🖼" : "📄"}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              />

              {/* File list */}
              {files.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-sm font-bold text-slate-700">{files.length} file dipilih</p>
                    <span className="text-xs text-slate-400">Total: {totalSizeMb} MB</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {files.map((file, i) => (
                      <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                        <span className="text-xl">{mode === "imagesToPdf" ? "🖼" : "📄"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                          <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button type="button" onClick={() => removeFile(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Options for specific modes */}
              {mode === "compress" && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <p className="text-sm font-bold text-slate-700">Tingkat Kompresi</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map(l => (
                      <button key={l} type="button" onClick={() => setCompressLevel(l)}
                        className={cn("py-2.5 rounded-xl text-sm font-semibold border-2 transition-all capitalize",
                          compressLevel === l ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
                        {l === "low" ? "Ringan" : l === "medium" ? "Sedang" : "Tinggi"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(mode === "extract" || mode === "delete" || mode === "organize") && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <Input label={mode === "organize" ? "Urutan Halaman Baru" : "Rentang Halaman"}
                    value={pageSpec} onChange={e => setPageSpec(e.target.value)}
                    placeholder={mode === "organize" ? "contoh: 3,1,2,5-7" : "contoh: 1-3,5,8-9"} />
                  <p className="text-xs text-slate-400">Gunakan koma untuk memisah, tanda minus untuk rentang. Halaman mulai dari 1.</p>
                </div>
              )}

              {mode === "rotate" && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Target Halaman" value={rotateSpec} onChange={e => setRotateSpec(e.target.value)}>
                      <option value="semua">Semua halaman</option>
                      <option value="pilih">Halaman tertentu</option>
                    </Select>
                    <Select label="Derajat Putar" value={rotateDegrees} onChange={e => setRotateDegrees(parseInt(e.target.value))}>
                      <option value={90}>90°</option>
                      <option value={180}>180°</option>
                      <option value={270}>270°</option>
                    </Select>
                  </div>
                  {rotateSpec === "pilih" && <Input label="Rentang Halaman" value={pageSpec} onChange={e => setPageSpec(e.target.value)} placeholder="contoh: 1-3,5" />}
                </div>
              )}

              <Btn onClick={handleRun} disabled={isWorking || !files.length} className="w-full py-4 text-base">
                {isWorking ? "⏳ Memproses…" : "⚡ Proses PDF"}
              </Btn>
            </>
          )}
        </div>

        {/* RIGHT: Info panel */}
        <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-4 sticky top-24">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Mode Aktif</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{PDF_MODES.find(m2 => m2.id === mode)?.emoji}</span>
            <div>
              <p className="font-bold text-white">{PDF_MODES.find(m2 => m2.id === mode)?.label}</p>
              <p className="text-xs text-slate-400">{PDF_MODES.find(m2 => m2.id === mode)?.desc}</p>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4 space-y-2 text-sm text-slate-300">
            {mode === "merge" && <><p>• Gabungkan beberapa PDF jadi satu.</p><p>• Urutan mengikuti daftar file.</p></>}
            {mode === "split" && <><p>• Setiap halaman jadi file terpisah.</p><p>• File diunduh satu per satu.</p></>}
            {mode === "compress" && <><p>• Optimasi struktur PDF tanpa mengubah isi.</p><p>• Tiga level kompresi tersedia.</p></>}
            {mode === "extract" && <><p>• Ambil halaman tertentu saja.</p><p>• Contoh: 1-3,5,10</p></>}
            {mode === "delete" && <><p>• Hapus halaman yang tidak dibutuhkan.</p><p>• Sisa halaman tetap utuh.</p></>}
            {mode === "rotate" && <><p>• Putar halaman yang miring.</p><p>• Bisa semua atau halaman tertentu.</p></>}
            {mode === "organize" && <><p>• Susun ulang urutan halaman.</p><p>• Contoh: 3,1,2 untuk urutkan ulang.</p></>}
            {mode === "imagesToPdf" && <><p>• JPG/PNG jadi halaman PDF.</p><p>• Tiap gambar = 1 halaman.</p></>}
            {mode === "textToPdf" && <><p>• Teks polos jadi PDF rapi.</p><p>• Layout sederhana, bisa dibuka di mana saja.</p></>}
          </div>
          {info && (
            <div className={cn("rounded-xl px-4 py-3 text-sm font-medium border", info.startsWith("✓") ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
              {info}
            </div>
          )}
          <div className="pt-2"><SectionBadge>Offline — tanpa upload</SectionBadge></div>
        </div>
      </div>
    </div>
  );
};

// ─── Doc Studio ───────────────────────────────────────────────────────────────

const DocTools: React.FC = () => {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("Gamato Piranti Dokumen");
  const [docInfo, setDocInfo] = useState<string | null>(null);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState<string | null>(null);

  const stats = useMemo(() => ({
    chars: text.length,
    words: (text.match(/\S+/g) || []).length,
    lines: text.split(/\r?\n/).length,
  }), [text]);

  const outline = useMemo(() => {
    return text.split(/\r?\n/).reduce<{ line: string; index: number }[]>((acc, line, idx) => {
      const t = line.trim();
      if (!t) return acc;
      if (t.startsWith("#") || (t.length <= 80 && t === t.toUpperCase() && /[A-ZÀ-ÖØ-Ý]/.test(t)))
        acc.push({ line: t.replace(/^#+\s*/, ""), index: idx });
      return acc;
    }, []);
  }, [text]);

  const exportDocx = async () => {
    if (!text.trim()) return;
    const doc = new Document({ sections: [{ properties: {}, children: text.split("\n").map(line => new Paragraph({ children: [new TextRun({ text: line || " ", size: 22 })] })) }] });
    downloadBlob(await Packer.toBlob(doc), `${sanitizeFileName(fileName || "gamato-dokumen")}.docx`);
    setDocInfo("✓ Dokumen .docx berhasil disiapkan.");
  };

  const exportPdf = async () => {
    if (!text.trim()) return;
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12, lineHeight = fontSize + 4, margin = 50;
      const maxChars = Math.floor((595.28 - margin * 2) / (fontSize * 0.55));
      const allLines: string[] = [];
      for (const raw of text.split(/\r?\n/)) {
        if (!raw) { allLines.push(""); continue; }
        for (let s = 0; s < raw.length; s += maxChars) allLines.push(raw.slice(s, s + maxChars));
      }
      let page = pdfDoc.addPage(), { height } = page.getSize(), y = height - margin;
      const addPage = () => { page = pdfDoc.addPage(); ({ height } = page.getSize()); y = height - margin; };
      for (const line of allLines) {
        if (y < margin + lineHeight) addPage();
        if (line) page.drawText(line, { x: margin, y: y - lineHeight, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
      }
      downloadBlob(new Blob([await pdfDoc.save()], { type: "application/pdf" }), `${sanitizeFileName(fileName || "gamato-dokumen")}.pdf`);
      setDocInfo("✓ Disimpan sebagai PDF.");
    } catch { setDocInfo("✗ Gagal menyusun PDF."); }
  };

  const downloadTxt = () => {
    if (!text) return;
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${sanitizeFileName(fileName || "gamato-dokumen")}.txt`);
    setDocInfo("✓ Diekspor sebagai .txt.");
  };

  const importTxt = (files: FileList | null) => {
    if (!files?.[0]) return;
    const r = new FileReader();
    r.onload = () => { setText((r.result as string) || ""); setDocInfo("✓ File .txt berhasil diimpor."); };
    r.readAsText(files[0]);
  };

  const generateTemplate = (kind: "notulen" | "surat" | "catatan") => {
    if (kind === "notulen") { setText("NOTULEN RAPAT\nGamato Piranti\n\nAgenda:\n- \n\nPeserta:\n- \n\nRingkasan:\n- \n\nKeputusan:\n- \n\nTindak Lanjut:\n- "); setFileName("Notulen Gamato"); }
    else if (kind === "surat") { setText("Surabaya, .................................... 20..\n\nKepada Yth.\n...........................................\nDi Tempat\n\nPerihal: ...........................................\n\nDengan hormat,\n\n...\n\nHormat kami,\nGamato Piranti\n"); setFileName("Surat Gamato"); }
    else { setText("Catatan kerja Gamato Piranti\n\n- "); setFileName("Catatan Gamato"); }
    setDocInfo("✓ Template dimuat.");
  };

  const quickClean = (kind: "trim" | "noBlank") => {
    if (!text) return;
    if (kind === "trim") { setText(text.replace(/[ \t]+/g, " ")); setDocInfo("✓ Spasi ganda dirapikan."); }
    else { setText(text.split(/\r?\n/).filter(l => l.trim() !== "").join("\n")); setDocInfo("✓ Baris kosong dihapus."); }
  };

  const runFindReplace = () => {
    if (!findText || !text.includes(findText)) { setDocInfo("Teks tidak ditemukan."); return; }
    setText(text.split(findText).join(replaceText));
    setDocInfo("✓ Cari & ganti selesai.");
  };

  const changeCase = (kind: "upper" | "lower" | "title") => {
    if (!text) return;
    if (kind === "upper") setText(text.toUpperCase());
    else if (kind === "lower") setText(text.toLowerCase());
    else setText(text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));
    setDocInfo("✓ Huruf diubah.");
  };

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
      {/* Editor */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">📝</span>
              <Input value={fileName} onChange={e => setFileName(sanitizeFileName(e.target.value))} className="border-0 bg-transparent p-0 font-bold text-slate-800 text-base focus:ring-0 shadow-none" placeholder="Nama dokumen" />
            </div>
            <label className="text-sm text-blue-600 font-semibold cursor-pointer hover:text-blue-700">
              Import .txt <input type="file" accept="text/plain" className="hidden" onChange={e => importTxt(e.target.files)} />
            </label>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-slate-100 bg-white">
            <span className="text-xs font-bold text-slate-400 self-center mr-1">Template:</span>
            {[["notulen", "📋 Notulen"], ["surat", "📮 Surat"], ["catatan", "🗒 Catatan"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => generateTemplate(k as any)} className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">{l}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-slate-100 bg-white">
            <span className="text-xs font-bold text-slate-400 self-center mr-1">Ubah:</span>
            {[["trim", "Rapikan spasi"], ["noBlank", "Hapus baris kosong"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => quickClean(k as any)} className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">{l}</button>
            ))}
            {[["upper", "AA"], ["lower", "aa"], ["title", "Aa"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => changeCase(k as any)} className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">{l}</button>
            ))}
          </div>

          {/* Find & Replace */}
          <div className="flex gap-3 px-5 py-3 border-b border-slate-100 bg-white items-end">
            <div className="flex-1">
              <Input label="Cari" value={findText} onChange={e => setFindText(e.target.value)} placeholder="Teks yang dicari…" className="py-2" />
            </div>
            <div className="flex-1">
              <Input label="Ganti dengan" value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Teks pengganti…" className="py-2" />
            </div>
            <Btn onClick={runFindReplace} disabled={!findText} variant="secondary" className="py-2 shrink-0">Ganti</Btn>
            <button type="button" onClick={() => { setFindText(""); setReplaceText(""); }} className="text-xs text-slate-400 hover:text-slate-600 shrink-0 pb-0.5">Reset</button>
          </div>

          {/* Text area */}
          <textarea
            className="w-full h-80 px-5 py-4 text-sm text-slate-800 leading-relaxed font-mono focus:outline-none resize-none"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Mulai menulis di sini, atau gunakan template di atas…"
          />
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-3">
          <Btn onClick={exportDocx} disabled={!text.trim()} className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md shadow-blue-600/20">
            ⬇ Unduh .docx
          </Btn>
          <Btn onClick={exportPdf} disabled={!text.trim()} variant="secondary">⬇ Unduh .pdf</Btn>
          <Btn onClick={downloadTxt} disabled={!text} variant="secondary">⬇ Unduh .txt</Btn>
          <Btn onClick={() => { setSnapshot(text); setSnapshotLabel(fileName); setDocInfo("✓ Snapshot disimpan."); }} disabled={!text} variant="ghost">📸 Snapshot</Btn>
          <Btn onClick={() => { if (snapshot) { setText(snapshot); setDocInfo("✓ Snapshot dipulihkan."); } }} disabled={!snapshot} variant="ghost">↩ Pulihkan{snapshotLabel ? ` "${snapshotLabel}"` : ""}</Btn>
        </div>

        {docInfo && <div className={cn("text-sm rounded-xl px-4 py-2.5 border font-medium", docInfo.startsWith("✓") ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200")}>{docInfo}</div>}
      </div>

      {/* Stats sidebar */}
      <div className="space-y-4 sticky top-24">
        <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Statistik</p>
          <div className="grid grid-cols-3 gap-3">
            {[["Kata", stats.words], ["Karakter", stats.chars], ["Baris", stats.lines]].map(([l, v]) => (
              <div key={l as string} className="text-center bg-slate-800 rounded-xl p-3">
                <div className="text-2xl font-bold text-white">{v}</div>
                <div className="text-xs text-slate-400 mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Preview</p>
            <div className="bg-slate-800 rounded-xl p-3 max-h-40 overflow-hidden text-xs text-slate-300 leading-relaxed font-mono">
              {text ? text.split("\n").slice(0, 10).map((l, i) => <p key={i} className="truncate">{l || "​"}</p>) : <p className="text-slate-500">Mulai menulis…</p>}
            </div>
          </div>

          {/* Outline */}
          {outline.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Outline</p>
              <ul className="space-y-1">
                {outline.slice(0, 8).map(item => (
                  <li key={item.index} className="text-xs text-slate-300 truncate flex gap-1.5">
                    <span className="text-slate-500">›</span>{item.line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <SectionBadge>Offline — data tidak dikirim</SectionBadge>
        </div>
      </div>
    </div>
  );
};

// ─── Image Lab ────────────────────────────────────────────────────────────────

type ImageMode = "compress" | "resize" | "convert" | "rotate";

const ImageTools: React.FC = () => {
  const [mode, setMode] = useState<ImageMode>("compress");
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(75);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [maxHeight, setMaxHeight] = useState(1600);
  const [targetFormat, setTargetFormat] = useState<"original" | "jpeg" | "png" | "webp">("jpeg");
  const [rotateDeg, setRotateDeg] = useState(90);
  const [isWorking, setIsWorking] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const totalSizeMb = useMemo(() =>
    files.length ? Math.round(files.reduce((a, f) => a + f.size, 0) / 1024 / 1024 * 10) / 10 : 0,
    [files]);

  const addFiles = (incoming: File[]) => {
    const imgs = incoming.filter(f => f.type.startsWith("image/"));
    setFiles(imgs);
    setPreviewUrls(imgs.map(f => URL.createObjectURL(f)));
    setInfo(null);
  };

  const processImages = async () => {
    if (!files.length) return;
    setIsWorking(true); setInfo(null);
    try {
      for (const file of files) {
        const dataUrl = await fileToDataUrl(file);
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
        let drawW = img.width, drawH = img.height;
        if (mode === "resize") {
          const lw = maxWidth > 0 ? maxWidth : img.width, lh = maxHeight > 0 ? maxHeight : img.height;
          const scale = Math.min(lw / img.width, lh / img.height, 1);
          drawW = Math.round(img.width * scale); drawH = Math.round(img.height * scale);
        }
        const angle = mode === "rotate" ? rotateDeg : 0;
        const radians = angle * Math.PI / 180;
        const cw = (angle === 90 || angle === 270) ? drawH : drawW;
        const ch = (angle === 90 || angle === 270) ? drawW : drawH;
        const canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext("2d")!;
        ctx.save(); ctx.translate(cw / 2, ch / 2);
        if (angle !== 0) ctx.rotate(radians);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        const origType = file.type?.startsWith("image/") ? file.type : "image/png";
        const mime = targetFormat === "original" ? origType : targetFormat === "jpeg" ? "image/jpeg" : targetFormat === "png" ? "image/png" : "image/webp";
        const q = Math.min(Math.max(quality, 10), 100) / 100;
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), mime, (mime === "image/jpeg" || mime === "image/webp") ? q : undefined));
        if (!blob) continue;
        const base = file.name.replace(/\.[^.]+$/, "");
        const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "img";
        const suffix = mode === "compress" ? "compressed" : mode === "resize" ? "resized" : mode === "convert" ? "converted" : "rotated";
        downloadBlob(blob, `${base}-gp-${suffix}.${ext}`);
      }
      setInfo(`✓ ${files.length} gambar berhasil diproses.`);
    } catch (err: any) { setInfo("✗ " + (err?.message || "Gagal.")); }
    finally { setIsWorking(false); }
  };

  const IMG_MODES: { id: ImageMode; label: string; emoji: string }[] = [
    { id: "compress", label: "Kompres", emoji: "📦" },
    { id: "resize", label: "Ubah Ukuran", emoji: "📐" },
    { id: "convert", label: "Konversi Format", emoji: "🔄" },
    { id: "rotate", label: "Putar", emoji: "↩" },
  ];

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {IMG_MODES.map(m => (
          <button key={m.id} type="button" onClick={() => { setMode(m.id); setFiles([]); setPreviewUrls([]); setInfo(null); }}
            className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              mode === m.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300")}>
            <span className="text-2xl">{m.emoji}</span>
            <span className={cn("text-sm font-bold", mode === m.id ? "text-blue-700" : "text-slate-700")}>{m.label}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* LEFT */}
        <div className="space-y-5">
          {files.length === 0 ? (
            <Dropzone onFiles={addFiles} accept="image/*" multiple label="Drop gambar di sini" sublabel="JPG, PNG, WEBP — bisa beberapa file" icon="🖼" isDragging={isDragging} setIsDragging={setIsDragging} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-700">{files.length} gambar · {totalSizeMb} MB</p>
                <button type="button" onClick={() => { setFiles([]); setPreviewUrls([]); setInfo(null); }} className="text-sm text-red-500 font-semibold hover:text-red-700">Ganti File</button>
              </div>
              <div className="p-4 flex flex-wrap gap-3">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm" />
                    <button type="button" onClick={() => { setFiles(f => f.filter((_, j) => j !== i)); setPreviewUrls(u => u.filter((_, j) => j !== i)); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode-specific options */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Opsi</p>

            {mode === "resize" && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Lebar Maks (px)" type="number" min={0} value={maxWidth} onChange={e => setMaxWidth(parseInt(e.target.value) || 0)} />
                <Input label="Tinggi Maks (px)" type="number" min={0} value={maxHeight} onChange={e => setMaxHeight(parseInt(e.target.value) || 0)} />
                <p className="col-span-2 text-xs text-slate-400">Rasio gambar tetap terjaga. Nilai 0 = mengikuti asli.</p>
              </div>
            )}

            {mode === "rotate" && (
              <Select label="Derajat Putar" value={rotateDeg} onChange={e => setRotateDeg(parseInt(e.target.value))}>
                <option value={90}>90° searah jarum jam</option>
                <option value={180}>180°</option>
                <option value={270}>270° (90° berlawanan)</option>
              </Select>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Select label="Format Output" value={targetFormat} onChange={e => setTargetFormat(e.target.value as any)}>
                <option value="original">Sesuai asli</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
              </Select>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <Label>Kualitas (JPEG/WEBP)</Label>
                  <span className="text-sm font-bold text-blue-600">{quality}%</span>
                </div>
                <input type="range" min={10} max={100} value={quality} onChange={e => setQuality(parseInt(e.target.value))} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600 bg-slate-200" />
              </div>
            </div>
          </div>

          {info && <div className={cn("text-sm rounded-xl px-4 py-3 border font-medium", info.startsWith("✓") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>{info}</div>}

          <Btn onClick={processImages} disabled={isWorking || !files.length} className="w-full py-4 text-base">
            {isWorking ? "⏳ Memproses…" : `⚡ Proses ${files.length > 0 ? files.length : ""} Gambar`}
          </Btn>
        </div>

        {/* RIGHT: info */}
        <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-4 sticky top-24">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Info Mode</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{IMG_MODES.find(m2 => m2.id === mode)?.emoji}</span>
            <p className="font-bold text-white">{IMG_MODES.find(m2 => m2.id === mode)?.label}</p>
          </div>
          <div className="border-t border-slate-800 pt-4 space-y-2 text-sm text-slate-300">
            {mode === "compress" && <><p>• Kurangi ukuran file tanpa mengubah dimensi.</p><p>• Atur kualitas dengan slider.</p></>}
            {mode === "resize" && <><p>• Ubah dimensi gambar dengan rasio tetap.</p><p>• Ideal untuk thumbnail dan upload.</p></>}
            {mode === "convert" && <><p>• Konversi antar format JPEG, PNG, WEBP.</p><p>• WEBP biasanya paling kecil ukurannya.</p></>}
            {mode === "rotate" && <><p>• Putar foto yang miring atau terbalik.</p><p>• Diterapkan ke semua file yang dipilih.</p></>}
          </div>
          <SectionBadge>Offline — tanpa upload</SectionBadge>
        </div>
      </div>
    </div>
  );
};

// ─── Utility Shelf ────────────────────────────────────────────────────────────

const UtilityShelf: React.FC = () => {
  type Tab = "json" | "bulk" | "media" | "alias" | "tax" | "interest" | "stats" | "wa" | "pass" | "meta";
  const [tab, setTab] = useState<Tab>("json");
  const [textInput, setTextInput] = useState("");
  const [jsonPretty, setJsonPretty] = useState("");
  const [base64, setBase64] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [bulkOutput, setBulkOutput] = useState("");
  const [bulkInfo, setBulkInfo] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaInfo, setMediaInfo] = useState<string | null>(null);
  const [directDownload, setDirectDownload] = useState<string | null>(null);
  const [baseEmail, setBaseEmail] = useState("");
  const [aliasDomain, setAliasDomain] = useState("example.com");
  const [aliasEmail, setAliasEmail] = useState<string | null>(null);
  const [aliasInfo, setAliasInfo] = useState<string | null>(null);
  const [taxBase, setTaxBase] = useState("");
  const [taxRate, setTaxRate] = useState("11");
  const [taxMode, setTaxMode] = useState<"exclusive" | "inclusive">("exclusive");
  const [taxOutput, setTaxOutput] = useState("");
  const [princ, setPrinc] = useState("");
  const [rate, setRate] = useState("10");
  const [years, setYears] = useState("1");
  const [compoundPerYear, setCompoundPerYear] = useState(12);
  const [interestOutput, setInterestOutput] = useState("");
  const [statsInput, setStatsInput] = useState("");
  const [statsOutput, setStatsOutput] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waLink, setWaLink] = useState("");
  const [pwLength, setPwLength] = useState(16);
  const [pwUpper, setPwUpper] = useState(true);
  const [pwLower, setPwLower] = useState(true);
  const [pwNumber, setPwNumber] = useState(true);
  const [pwSymbol, setPwSymbol] = useState(false);
  const [pwOutput, setPwOutput] = useState("");
  const [tokenBytes, setTokenBytes] = useState(32);
  const [tokenFormat, setTokenFormat] = useState<"hex" | "base64" | "urlsafe">("hex");
  const [tokenOutput, setTokenOutput] = useState("");
  const [metaFiles, setMetaFiles] = useState<File[]>([]);
  const [metaInfo, setMetaInfo] = useState<string | null>(null);

  const cryptoRandom = (max: number) => {
    const buf = new Uint32Array(1);
    let rand = 0;
    do { window.crypto.getRandomValues(buf); rand = buf[0] / 2 ** 32; } while (rand === 1);
    return Math.floor(rand * max);
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

  const toJsonPretty = () => {
    try { setJsonPretty(JSON.stringify(JSON.parse(textInput), null, 2)); }
    catch { setJsonPretty("⚠ Bukan JSON yang valid."); }
  };
  const toBase64 = () => setBase64(btoa(unescape(encodeURIComponent(sanitizeText(textInput)))));
  const fromBase64 = () => { try { setTextInput(sanitizeText(decodeURIComponent(escape(atob(base64))))); } catch {} };

  const runBulkOp = (kind: "unique" | "sortAsc" | "sortDesc" | "shuffle" | "number" | "prefix" | "suffix") => {
    if (!bulkInput.trim()) return;
    let lines = bulkInput.split(/\r?\n/), result = [...lines], info = "";
    if (kind === "unique") { const s = new Set<string>(); result = []; lines.forEach(l => { if (!s.has(l)) { s.add(l); result.push(l); } }); info = "Duplikat dihapus."; }
    else if (kind === "sortAsc") { result = [...lines].sort((a, b) => a.localeCompare(b)); info = "Diurutkan A→Z."; }
    else if (kind === "sortDesc") { result = [...lines].sort((a, b) => b.localeCompare(a)); info = "Diurutkan Z→A."; }
    else if (kind === "shuffle") { for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } info = "Urutan diacak."; }
    else if (kind === "number") { result = lines.map((l, i) => `${i + 1}. ${l}`); info = "Baris dinomori."; }
    else if (kind === "prefix") { result = lines.map(l => `[x] ${l}`); info = "Prefix ditambahkan."; }
    else if (kind === "suffix") { result = lines.map(l => `${l} #`); info = "Suffix ditambahkan."; }
    setBulkOutput(result.join("\n")); setBulkInfo(info);
  };

  const analyzeMedia = () => {
    setMediaInfo(null); setDirectDownload(null);
    const safe = sanitizeUrl(mediaUrl);
    if (!safe) { setMediaInfo("⚠ URL tidak valid."); return; }
    try {
      const u = new URL(safe);
      if (/\.(mp4|webm|mov|m4a|mp3|wav)$/i.test(u.pathname)) { setDirectDownload(safe); setMediaInfo("✓ Terlihat seperti berkas langsung. Klik unduh."); return; }
      const host = u.hostname.replace(/^www\./, "");
      if (["youtube.com", "youtu.be", "tiktok.com", "instagram.com", "twitter.com", "x.com"].includes(host))
        setMediaInfo("ℹ Platform streaming besar tidak bisa diunduh langsung. Gunakan yt-dlp di terminal.");
      else setMediaInfo("ℹ Link ini bukan berkas video langsung.");
    } catch { setMediaInfo("⚠ URL tidak valid."); }
  };

  const generateAlias = () => {
    const now = new Date(), pad = (n: number) => n.toString().padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const trimmed = baseEmail.trim();
    if (trimmed && trimmed.includes("@")) {
      const [local, domain] = trimmed.split("@");
      setAliasEmail(`${local}+gp-${stamp}@${domain}`); setAliasInfo("Plus-address dari email utama.");
    } else {
      const rand = Math.random().toString(36).slice(2, 8);
      setAliasEmail(`gp-${rand}-${stamp}@${aliasDomain}`); setAliasInfo("Alamat acak disiapkan.");
    }
  };

  const runTaxCalc = () => {
    const base = parseFloat(sanitizeNumberString(taxBase || "")), r = parseFloat(sanitizeNumberString(taxRate || ""));
    if (isNaN(base) || isNaN(r)) { setTaxOutput("⚠ Masukkan nilai yang valid."); return; }
    const rp = r / 100;
    if (taxMode === "exclusive") {
      const pajak = base * rp, total = base + pajak;
      setTaxOutput(`Dasar: ${formatCurrency(base)}\nPajak (${r}%): ${formatCurrency(pajak)}\nTotal: ${formatCurrency(total)}`);
    } else {
      const pajak = base - base / (1 + rp), dasar = base - pajak;
      setTaxOutput(`Total (inklusif): ${formatCurrency(base)}\nTermasuk Pajak (${r}%): ${formatCurrency(pajak)}\nDasar sebelum pajak: ${formatCurrency(dasar)}`);
    }
  };

  const runInterestCalc = () => {
    const P = parseFloat(sanitizeNumberString(princ || "")), r = parseFloat(sanitizeNumberString(rate || "")) / 100, t = parseFloat(sanitizeNumberString(years || ""));
    if (isNaN(P) || isNaN(r) || isNaN(t)) { setInterestOutput("⚠ Isi semua field dengan benar."); return; }
    const simple = P * r * t, n = compoundPerYear > 0 ? compoundPerYear : 1;
    const comp = P * Math.pow(1 + r / n, n * t) - P;
    setInterestOutput(`Bunga sederhana: ${formatCurrency(simple)} | Akhir: ${formatCurrency(P + simple)}\nBunga majemuk (${n}x/tahun): ${formatCurrency(comp)} | Akhir: ${formatCurrency(P + comp)}`);
  };

  const runStats = () => {
    const nums = (statsInput || "").split(/[^0-9.+\-eE]+/).map(s => s.trim()).filter(s => s !== "").map(s => Number(s)).filter(n => Number.isFinite(n));
    if (!nums.length) { setStatsOutput("⚠ Tidak ada angka valid."); return; }
    const sorted = [...nums].sort((a, b) => a - b), count = nums.length, sum = nums.reduce((a, b) => a + b, 0), mean = sum / count;
    const median = count % 2 === 1 ? sorted[(count - 1) / 2] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
    const stdev = Math.sqrt(nums.reduce((a, x) => a + Math.pow(x - mean, 2), 0) / count);
    setStatsOutput(`n = ${count}\nΣ = ${sum}\nMean = ${mean}\nMedian = ${median}\nMin = ${sorted[0]}\nMax = ${sorted[sorted.length - 1]}\nStdev = ${stdev.toFixed(4)}`);
  };

  const buildWa = () => {
    const phone = sanitizePhone(waPhone), msg = sanitizeText(waMessage);
    if (!phone) { setWaLink(""); return; }
    setWaLink(`https://wa.me/${phone.replace(/^\+/, "")}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`);
  };

  const generatePassword = () => {
    const length = Math.min(Math.max(pwLength, 6), 128);
    const U = "ABCDEFGHJKLMNPQRSTUVWXYZ", L = "abcdefghijkmnopqrstuvwxyz", N = "23456789", S = "!@#$%^&*()-_=+[]{};:,.?";
    let pool = "", must: string[] = [];
    if (pwUpper) { pool += U; must.push(U[cryptoRandom(U.length)]); }
    if (pwLower) { pool += L; must.push(L[cryptoRandom(L.length)]); }
    if (pwNumber) { pool += N; must.push(N[cryptoRandom(N.length)]); }
    if (pwSymbol) { pool += S; must.push(S[cryptoRandom(S.length)]); }
    if (!pool) { setPwOutput(""); return; }
    const out = [...must];
    while (out.length < length) out.push(pool[cryptoRandom(pool.length)]);
    for (let i = out.length - 1; i > 0; i--) { const j = cryptoRandom(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
    setPwOutput(out.join(""));
  };

  const bytesToBase64 = (bytes: Uint8Array) => { let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin); };
  const generateToken = () => {
    const n = Math.min(Math.max(tokenBytes, 4), 128), bytes = new Uint8Array(n);
    window.crypto.getRandomValues(bytes);
    if (tokenFormat === "hex") setTokenOutput(Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(""));
    else if (tokenFormat === "base64") setTokenOutput(bytesToBase64(bytes));
    else setTokenOutput(bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
  };

  const copyToClipboard = async (text: string, setCb?: (m: string) => void) => {
    try { await navigator.clipboard.writeText(text); setCb?.("✓ Disalin!"); }
    catch { setCb?.("⚠ Gagal menyalin."); }
  };

  const runMetaClean = async () => {
    if (!metaFiles.length) return;
    setMetaInfo(null);
    try {
      for (const file of metaFiles) {
        const dataUrl = await fileToDataUrl(file);
        const img = new Image(); img.src = dataUrl;
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
        const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        let mime = file.type?.startsWith("image/") ? file.type : "image/png";
        if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) mime = "image/png";
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), mime, mime === "image/jpeg" ? 0.92 : undefined));
        if (!blob) continue;
        const base = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
        const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
        downloadBlob(blob, `${base}-clean.${ext}`);
      }
      setMetaInfo(`✓ ${metaFiles.length} gambar dibersihkan dari metadata.`);
    } catch (err: any) { setMetaInfo("✗ " + (err?.message || "Gagal.")); }
  };

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "json", label: "JSON & Base64", emoji: "{ }" },
    { id: "bulk", label: "Bulk Teks", emoji: "📋" },
    { id: "media", label: "Link Media", emoji: "🎬" },
    { id: "alias", label: "Alias Email", emoji: "✉️" },
    { id: "tax", label: "Kalk. Pajak", emoji: "🧾" },
    { id: "interest", label: "Kalk. Bunga", emoji: "💰" },
    { id: "stats", label: "Statistik", emoji: "📊" },
    { id: "wa", label: "WA Link", emoji: "💬" },
    { id: "pass", label: "Password & Token", emoji: "🔐" },
    { id: "meta", label: "Hapus Metadata", emoji: "🧹" },
  ];

  const PanelCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div>
        <h3 className="font-bold text-slate-900 text-base">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Tab selector */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all",
              tab === t.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>
            <span>{t.emoji}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* JSON & Base64 */}
      {tab === "json" && (
        <PanelCard title="JSON Formatter & Base64 Encoder" subtitle="Format JSON, encode/decode Base64">
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <Textarea label="Input Teks / JSON" rows={8} value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Tempel JSON atau teks di sini…" />
              <div className="flex gap-2">
                <Btn onClick={toJsonPretty} variant="secondary" className="flex-1 text-xs">Format JSON</Btn>
                <Btn onClick={toBase64} variant="secondary" className="flex-1 text-xs">→ Base64</Btn>
              </div>
            </div>
            <div className="space-y-3">
              <Textarea label="JSON Terformat" rows={8} value={jsonPretty} onChange={e => setJsonPretty(e.target.value)} placeholder="Hasil JSON rapi…" />
              <Btn onClick={() => copyToClipboard(jsonPretty)} variant="secondary" className="w-full text-xs">📋 Salin JSON</Btn>
            </div>
            <div className="space-y-3">
              <Textarea label="Base64" rows={5} value={base64} onChange={e => setBase64(e.target.value)} placeholder="Base64 encode/decode…" />
              <div className="flex gap-2">
                <Btn onClick={fromBase64} variant="secondary" className="flex-1 text-xs">← Dari Base64</Btn>
                <Btn onClick={() => copyToClipboard(base64)} variant="secondary" className="flex-1 text-xs">📋 Salin</Btn>
              </div>
            </div>
          </div>
        </PanelCard>
      )}

      {/* Bulk */}
      {tab === "bulk" && (
        <PanelCard title="Bulk Teks & Data Lab" subtitle="Manipulasi daftar teks — email, ID, nama, dll.">
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <Textarea label="Input (satu item per baris)" rows={10} value={bulkInput} onChange={e => setBulkInput(e.target.value)} placeholder="item1&#10;item2&#10;item3" />
              <div className="flex flex-wrap gap-2">
                {[["unique", "Hapus Duplikat"], ["sortAsc", "Sort A→Z"], ["sortDesc", "Sort Z→A"], ["shuffle", "Acak"], ["number", "Nomori"], ["prefix", "Tambah Prefix"], ["suffix", "Tambah Suffix"]].map(([k, l]) => (
                  <Btn key={k} onClick={() => runBulkOp(k as any)} variant="secondary" className="text-xs py-1.5">{l}</Btn>
                ))}
              </div>
              {bulkInfo && <p className="text-xs text-green-600 font-medium">✓ {bulkInfo}</p>}
            </div>
            <div className="space-y-3">
              <Textarea label="Hasil" rows={10} value={bulkOutput} onChange={e => setBulkOutput(e.target.value)} placeholder="Hasil akan tampil di sini…" />
              <Btn onClick={() => copyToClipboard(bulkOutput)} variant="secondary" className="w-full text-xs">📋 Salin Hasil</Btn>
            </div>
          </div>
        </PanelCard>
      )}

      {/* Media */}
      {tab === "media" && (
        <PanelCard title="Helper Link & Media" subtitle="Analisis link video/file untuk unduhan langsung">
          <div className="space-y-4 max-w-xl">
            <Input label="URL Video / File" type="url" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://example.com/video.mp4" />
            <Btn onClick={analyzeMedia} variant="secondary">🔍 Analisis Link</Btn>
            {mediaInfo && <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700">{mediaInfo}</div>}
            {directDownload && (
              <a href={directDownload} download className="flex items-center justify-between gap-3 bg-slate-900 text-white rounded-xl px-5 py-3 font-semibold hover:bg-slate-800 transition-colors">
                <span>⬇ Unduh Langsung</span>
                <span className="text-xs text-slate-400">Buka tab baru jika gagal</span>
              </a>
            )}
            <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3">Untuk YouTube/TikTok/Instagram, gunakan: <code className="bg-slate-200 rounded px-1">yt-dlp "URL"</code> di terminal.</p>
          </div>
        </PanelCard>
      )}

      {/* Alias */}
      {tab === "alias" && (
        <PanelCard title="Alias & Temp Email Planner" subtitle="Buat alamat email alternatif untuk pendaftaran">
          <div className="space-y-4 max-w-lg">
            <Input label="Email Utama (opsional — untuk plus-address)" type="email" value={baseEmail} onChange={e => setBaseEmail(sanitizeText(e.target.value))} placeholder="nama@gmail.com" />
            <Input label="Domain Alternatif" value={aliasDomain} onChange={e => setAliasDomain(sanitizeText(e.target.value))} placeholder="tempmail.com" />
            <div className="flex gap-3">
              <Btn onClick={generateAlias} className="flex-1">🎲 Buat Alamat</Btn>
              <Btn onClick={() => copyToClipboard(aliasEmail || "", setAliasInfo)} disabled={!aliasEmail} variant="secondary" className="flex-1">📋 Salin</Btn>
            </div>
            {aliasEmail && <div className="bg-slate-900 rounded-xl px-4 py-3 font-mono text-sm text-emerald-400 break-all">{aliasEmail}</div>}
            {aliasInfo && <p className="text-xs text-slate-500">{aliasInfo}</p>}
            <p className="text-xs text-slate-400">Gamato Piranti tidak membuat inbox. Gunakan bersama layanan temp-mail atau forwarder pilihan Anda.</p>
          </div>
        </PanelCard>
      )}

      {/* Tax */}
      {tab === "tax" && (
        <PanelCard title="Kalkulator Pajak" subtitle="Hitung PPN eksklusif atau inklusif">
          <div className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nilai Dasar (Rp)" value={taxBase} onChange={e => setTaxBase(e.target.value)} placeholder="1000000" />
              <Input label="Tarif Pajak (%)" value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="11" />
            </div>
            <div>
              <Label>Mode Perhitungan</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[["exclusive", "Eksklusif (belum termasuk pajak)"], ["inclusive", "Inklusif (sudah termasuk pajak)"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setTaxMode(v as any)}
                    className={cn("py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
                      taxMode === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300")}>{l}</button>
                ))}
              </div>
            </div>
            <Btn onClick={runTaxCalc} className="w-full">🧾 Hitung Pajak</Btn>
            {taxOutput && <pre className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap">{taxOutput}</pre>}
          </div>
        </PanelCard>
      )}

      {/* Interest */}
      {tab === "interest" && (
        <PanelCard title="Kalkulator Bunga" subtitle="Hitung bunga sederhana & majemuk">
          <div className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Pokok (Rp)" value={princ} onChange={e => setPrinc(e.target.value)} placeholder="5000000" />
              <Input label="Bunga Tahunan (%)" value={rate} onChange={e => setRate(e.target.value)} placeholder="10" />
              <Input label="Durasi (tahun)" value={years} onChange={e => setYears(e.target.value)} placeholder="3" />
              <Select label="Frekuensi Majemuk" value={compoundPerYear} onChange={e => setCompoundPerYear(parseInt(e.target.value))}>
                <option value={1}>Tahunan (1x)</option>
                <option value={2}>Semesteran (2x)</option>
                <option value={4}>Kuartalan (4x)</option>
                <option value={12}>Bulanan (12x)</option>
              </Select>
            </div>
            <Btn onClick={runInterestCalc} className="w-full">💰 Hitung Bunga</Btn>
            {interestOutput && <pre className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap">{interestOutput}</pre>}
          </div>
        </PanelCard>
      )}

      {/* Stats */}
      {tab === "stats" && (
        <PanelCard title="Statistik Sederhana" subtitle="Mean, median, min, max, standar deviasi">
          <div className="space-y-4 max-w-lg">
            <Textarea label="Angka (pisahkan dengan spasi, koma, atau baris baru)" rows={5} value={statsInput} onChange={e => setStatsInput(e.target.value)} placeholder="10 20 30 40 50&#10;atau&#10;1, 2, 3, 4, 5" />
            <Btn onClick={runStats} className="w-full">📊 Analisis</Btn>
            {statsOutput && <pre className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap font-mono">{statsOutput}</pre>}
          </div>
        </PanelCard>
      )}

      {/* WA */}
      {tab === "wa" && (
        <PanelCard title="WhatsApp Direct Link" subtitle="Buka chat WA tanpa menyimpan kontak">
          <div className="space-y-4 max-w-lg">
            <Input label="Nomor Telepon (dengan kode negara)" value={waPhone} onChange={e => setWaPhone(sanitizePhone(e.target.value))} placeholder="+62812xxxxxxx" />
            <Textarea label="Pesan (opsional)" rows={4} value={waMessage} onChange={e => setWaMessage(sanitizeText(e.target.value))} placeholder="Pesan yang akan muncul otomatis di chat…" />
            <div className="flex gap-3">
              <Btn onClick={buildWa} className="flex-1">🔗 Buat Link WA</Btn>
              {waLink && <Btn onClick={() => copyToClipboard(waLink, setAliasInfo)} variant="secondary" className="flex-1">📋 Salin Link</Btn>}
            </div>
            {waLink && (
              <div className="space-y-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-xs text-slate-700 break-all">{waLink}</div>
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-green-500 text-white rounded-xl py-3 font-semibold hover:bg-green-600 transition-colors">
                  💬 Buka di WhatsApp
                </a>
              </div>
            )}
          </div>
        </PanelCard>
      )}

      {/* Password & Token */}
      {tab === "pass" && (
        <PanelCard title="Password & Token Generator" subtitle="Berbasis Web Crypto API — aman dan acak">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-700">🔐 Password Generator</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Panjang Password" type="number" min={6} max={128} value={pwLength} onChange={e => setPwLength(parseInt(e.target.value) || 16)} />
                <div>
                  <Label>Karakter</Label>
                  <div className="mt-2 space-y-1.5">
                    {[["pwUpper", "Huruf Besar", pwUpper, setPwUpper], ["pwLower", "Huruf Kecil", pwLower, setPwLower], ["pwNumber", "Angka", pwNumber, setPwNumber], ["pwSymbol", "Simbol", pwSymbol, setPwSymbol]].map(([id, l, v, s]: any) => (
                      <label key={id} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={v} onChange={e => s(e.target.checked)} className="rounded accent-blue-600" />{l}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <Btn onClick={generatePassword} className="w-full">🎲 Buat Password</Btn>
              {pwOutput && (
                <div className="space-y-2">
                  <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl px-4 py-3 break-all">{pwOutput}</div>
                  <Btn onClick={() => copyToClipboard(pwOutput)} variant="secondary" className="w-full">📋 Salin Password</Btn>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-700">🔑 Token Generator</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Panjang (byte)" type="number" min={4} max={128} value={tokenBytes} onChange={e => setTokenBytes(parseInt(e.target.value) || 32)} />
                <Select label="Format" value={tokenFormat} onChange={e => setTokenFormat(e.target.value as any)}>
                  <option value="hex">Hex</option>
                  <option value="base64">Base64</option>
                  <option value="urlsafe">URL-safe Base64</option>
                </Select>
              </div>
              <Btn onClick={generateToken} className="w-full">🎲 Buat Token</Btn>
              {tokenOutput && (
                <div className="space-y-2">
                  <div className="bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl px-4 py-3 break-all">{tokenOutput}</div>
                  <Btn onClick={() => copyToClipboard(tokenOutput)} variant="secondary" className="w-full">📋 Salin Token</Btn>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">Gamato Piranti tidak mengirim password/token ke server mana pun. Simpan dengan aman di password manager.</p>
        </PanelCard>
      )}

      {/* Meta */}
      {tab === "meta" && (
        <PanelCard title="Hapus Metadata Gambar" subtitle="EXIF, GPS, dan data sensitif lainnya dihapus via re-encode canvas">
          <div className="space-y-4 max-w-lg">
            <Dropzone onFiles={f => setMetaFiles(f.filter(f2 => f2.type.startsWith("image/")))} accept="image/*" label="Drop gambar di sini" sublabel="Bisa pilih beberapa sekaligus" icon="🖼" />
            {metaFiles.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">{metaFiles.length} gambar dipilih</p>
                <ul className="mt-2 space-y-1">
                  {metaFiles.map((f, i) => <li key={i} className="text-xs text-slate-500 truncate">• {f.name} ({(f.size / 1024).toFixed(0)} KB)</li>)}
                </ul>
              </div>
            )}
            <Btn onClick={runMetaClean} disabled={!metaFiles.length} className="w-full">🧹 Bersihkan Metadata</Btn>
            {metaInfo && <div className={cn("text-sm rounded-xl px-4 py-3 border", metaInfo.startsWith("✓") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>{metaInfo}</div>}
            <p className="text-xs text-slate-400">File diunduh ulang — tanpa metadata EXIF. Tidak ada yang dikirim ke server.</p>
          </div>
        </PanelCard>
      )}
    </div>
  );
};

// ─── Static Pages ─────────────────────────────────────────────────────────────

const PolicySection: React.FC<{ num: string; title: string; children: React.ReactNode }> = ({ num, title, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
    <div className="flex items-center gap-3">
      <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center">{num}</span>
      <h3 className="font-bold text-slate-900 text-base">{title}</h3>
    </div>
    <div className="text-sm leading-relaxed text-slate-600 pl-11">{children}</div>
  </div>
);

const PrivacyPage: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-5">
    <div className="text-center space-y-3 pb-2">
      <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Kebijakan</span>
      <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="text-slate-400 text-sm">Gamato Piranti · Terakhir diperbarui: 2 Maret 2026</p>
    </div>
    <PolicySection num="1" title="Informasi yang Kami Kumpulkan">
      <p>Sebagai Digital Tool Studio, sebagian besar alat kami bekerja di sisi klien (browser). Kami tidak mengumpulkan data pribadi sensitif kecuali Anda memberikannya secara sukarela.</p>
    </PolicySection>
    <PolicySection num="2" title="Log Files & Analytics">
      <p>Kami menggunakan log standar melalui infrastruktur Vercel yang mencakup alamat IP, jenis browser, ISP, dan stempel waktu untuk analisis performa web.</p>
    </PolicySection>
    <PolicySection num="3" title="Keamanan Data (WUG Secure Standard)">
      <p>Kami menerapkan sistem WUG Secure System untuk memastikan setiap input data diproses dengan enkripsi standar dan tidak disalahgunakan pihak ketiga.</p>
    </PolicySection>
    <PolicySection num="4" title="Kebijakan Pihak Ketiga">
      <p>Kebijakan Privasi ini tidak berlaku untuk situs atau layanan pihak ketiga. Kami menyarankan Anda membaca kebijakan masing-masing layanan yang Anda gunakan.</p>
    </PolicySection>
  </div>
);

const TermsPage: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-5">
    <div className="text-center space-y-3 pb-2">
      <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Kebijakan</span>
      <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
      <p className="text-slate-400 text-sm">Gamato Piranti · Terakhir diperbarui: 2 Maret 2026</p>
    </div>
    <PolicySection num="1" title="Penerimaan Ketentuan">
      <p>Dengan mengakses situs ini, Anda menerima syarat dan ketentuan ini secara penuh. Hentikan penggunaan jika Anda tidak setuju dengan ketentuan yang berlaku.</p>
    </PolicySection>
    <PolicySection num="2" title="Lisensi Penggunaan">
      <p className="mb-3">Anda diizinkan menggunakan alat untuk keperluan pribadi maupun komersial ringan. Namun, Anda dilarang:</p>
      <ul className="space-y-1.5">
        {["Menyalin atau memodifikasi materi tanpa izin.", "Menggunakan tools untuk tujuan ilegal.", "Merusak integritas infrastruktur layanan kami."].map(item => (
          <li key={item} className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" /><span>{item}</span></li>
        ))}
      </ul>
    </PolicySection>
    <PolicySection num="3" title="Batasan Tanggung Jawab">
      <p>Semua alat disediakan "sebagaimana adanya". Gamato Piranti tidak bertanggung jawab atas kerugian yang timbul dari penggunaan layanan kami.</p>
    </PolicySection>
    <PolicySection num="4" title="Perubahan Layanan">
      <p>Kami berhak menambah atau menghapus fitur tanpa pemberitahuan sebelumnya demi peningkatan kualitas layanan.</p>
    </PolicySection>
  </div>
);

// ─── Page wrappers ────────────────────────────────────────────────────────────

const PageShell: React.FC<{ badge: string; title: string; subtitle: string; children: React.ReactNode }> = ({ badge, title, subtitle, children }) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <div className="space-y-1.5">
      <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{badge}</span>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-500 text-sm max-w-2xl">{subtitle}</p>
    </div>
    {children}
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────

export const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="qr" element={<PageShell badge="Kode" title="QR & Barcode Studio" subtitle="Buat QR code multi-template dengan logo & warna kustom, atau barcode berbagai format — real-time, offline, di browser."><QRBarcodeStudio /></PageShell>} />
        <Route path="pdf" element={<PageShell badge="Dokumen" title="PDF Lab – Suite" subtitle="9 mode pemrosesan PDF: gabung, pecah, kompres, ekstrak, hapus, putar, atur halaman, gambar→PDF, dan teks→PDF."><PdfTools /></PageShell>} />
        <Route path="docs" element={<PageShell badge="Dokumen" title="Doc Studio" subtitle="Editor dokumen ringan dengan ekspor .docx, .pdf, .txt — dilengkapi Find & Replace, template cepat, dan snapshot sesi."><DocTools /></PageShell>} />
        <Route path="image" element={<PageShell badge="Gambar" title="Image Lab" subtitle="Kompres, ubah ukuran, konversi format (JPG/PNG/WEBP), dan putar gambar — batch processing langsung di browser."><ImageTools /></PageShell>} />
        <Route path="utility" element={<PageShell badge="Utilitas" title="Rak Utilitas" subtitle="10+ alat kecil: JSON formatter, Base64, bulk teks, kalkulator pajak & bunga, WA link, password & token generator, hapus metadata."><UtilityShelf /></PageShell>} />
        <Route path="about" element={<About />} />
        <Route path="privacy" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><PrivacyPage /></div>} />
        <Route path="terms" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><TermsPage /></div>} />
      </Route>
    </Routes>
  </BrowserRouter>
);

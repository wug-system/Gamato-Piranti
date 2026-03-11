import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { cn } from "./utils/cn";
import { sanitizeText, sanitizeUrl, sanitizeFileName, sanitizeNumberString, sanitizePhone } from "./utils/sanitize";

// ---------- Shared UI primitives ----------

const Card: React.FC<{
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ title, description, className, children }) => (
  <section
    className={cn(
      "rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm",
      "transition-all hover:border-slate-300 hover:shadow-md",
      className
    )}
  >
    <header className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>
    </header>
    <div>{children}</div>
  </section>
);

const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({
  htmlFor,
  children,
}) => (
  <label
    htmlFor={htmlFor}
    className="text-xs font-medium tracking-wide text-slate-600"
  >
    {children}
  </label>
);

const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
> = ({ label, className, ...props }) => (
  <div className="space-y-1.5">
    {label && <Label htmlFor={props.id}>{label}</Label>}
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
        "focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5",
        "disabled:cursor-not-allowed disabled:bg-slate-50",
        className
      )}
    />
  </div>
);

const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
> = ({ label, className, children, ...props }) => (
  <div className="space-y-1.5">
    {label && <Label htmlFor={props.id}>{label}</Label>}
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm",
        "focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5",
        className
      )}
    >
      {children}
    </select>
  </div>
);

const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }
> = ({ label, className, ...props }) => (
  <div className="space-y-1.5">
    {label && <Label htmlFor={props.id}>{label}</Label>}
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm",
        "focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5",
        "disabled:cursor-not-allowed disabled:bg-slate-50",
        className
      )}
    />
  </div>
);

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" }
> = ({ variant = "solid", className, children, ...props }) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium tracking-wide",
      "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/5",
      variant === "solid"
        ? "bg-slate-900 text-slate-50 shadow-sm hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-100"
        : "bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-300",
      className
    )}
  >
    {children}
  </button>
);

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-600">
    {children}
  </span>
);

// ---------- File helpers ----------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- QR & Barcode Studio ----------

type QrTemplate = "url" | "text" | "wifi" | "email" | "phone";

const QRBarcodeStudio: React.FC = () => {
  const [mode, setMode] = useState<"qr" | "barcode">("qr");

  // QR template states
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

  // Barcode states
  const [barcodeContent, setBarcodeContent] = useState("123456789012");
  const [barcodeFormat, setBarcodeFormat] = useState<string>("CODE128");
  const [barcodeHeight, setBarcodeHeight] = useState(80);

  // Shared visuals
  const [size, setSize] = useState(280);
  const [fgColor, setFgColor] = useState("#020617");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [qrUrlImage, setQrUrlImage] = useState<string | null>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoPreview = useMemo(() => {
    if (!logoFile) return null;
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  const buildQrPayload = (): string => {
    switch (qrTemplate) {
      case "url": {
        const s = sanitizeUrl(qrUrl);
        return s;
      }
      case "text": {
        return sanitizeText(qrText);
      }
      case "wifi": {
        const ssid = sanitizeText(qrWifiSsid);
        if (!ssid) return "";
        const enc = qrWifiEnc === "nopass" ? "nopass" : qrWifiEnc;
        const hidden = qrWifiHidden ? "true" : "false";
        const pass = sanitizeText(qrWifiPass);
        const passPart = enc === "nopass" ? "" : `P:${pass};`;
        return `WIFI:T:${enc};S:${ssid};${passPart}H:${hidden};;`;
      }
      case "email": {
        const to = sanitizeText(qrEmailTo).replace(/\s+/g, "");
        if (!to) return "";
        const params: string[] = [];
        const subj = sanitizeText(qrEmailSubject);
        const body = sanitizeText(qrEmailBody);
        if (subj) params.push(`subject=${encodeURIComponent(subj)}`);
        if (body) params.push(`body=${encodeURIComponent(body)}`);
        const query = params.length ? `?${params.join("&")}` : "";
        return `mailto:${to}${query}`;
      }
      case "phone": {
        const phone = qrPhone.replace(/[^\d+]/g, "").replace(/(?!^)[+]/g, "");
        if (!phone) return "";
        return `tel:${phone}`;
      }
      default:
        return "";
    }
  };

  const generate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      if (mode === "qr") {
        const payload = buildQrPayload();
        if (!payload.trim()) {
          setError("Isi QR belum lengkap.");
          return;
        }

        const baseCanvas = document.createElement("canvas");
        await QRCode.toCanvas(baseCanvas, payload, {
          margin: 2,
          width: size,
          color: {
            dark: fgColor,
            light: bgColor,
          },
        });

        if (!logoFile) {
          setQrUrlImage(baseCanvas.toDataURL("image/png"));
        } else {
          const ctx = baseCanvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context not available");
          const logoUrl = await fileToDataUrl(logoFile);
          const img = new Image();
          img.src = logoUrl;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Logo load failed"));
          });
          const logoSize = size * 0.25;
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          ctx.save();
          ctx.beginPath();
          const radius = logoSize * 0.22;
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + logoSize - radius, y);
          ctx.quadraticCurveTo(x + logoSize, y, x + logoSize, y + radius);
          ctx.lineTo(x + logoSize, y + logoSize - radius);
          ctx.quadraticCurveTo(
            x + logoSize,
            y + logoSize,
            x + logoSize - radius,
            y + logoSize
          );
          ctx.lineTo(x + radius, y + logoSize);
          ctx.quadraticCurveTo(x, y + logoSize, x, y + logoSize - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.fillStyle = "rgba(255,255,255,0.98)";
          ctx.fill();
          ctx.clip();
          ctx.drawImage(img, x, y, logoSize, logoSize);
          ctx.restore();
          setQrUrlImage(baseCanvas.toDataURL("image/png"));
        }
      } else {
        const canvas = barcodeCanvasRef.current;
        if (!canvas) return;
        let value = barcodeContent.trim();
        if (!value) {
          setError("Isi barcode belum diisi.");
          return;
        }

        const numericFormats = ["EAN13", "EAN8", "UPC", "ITF14"];
        if (numericFormats.includes(barcodeFormat)) {
          const digits = value.replace(/\D/g, "");
          if (!digits) {
            setError("Format barcode ini hanya mendukung angka.");
            return;
          }
          const len = digits.length;
          if (barcodeFormat === "EAN13" && len !== 12 && len !== 13) {
            setError("EAN-13 memerlukan 12 atau 13 digit angka.");
            return;
          }
          if (barcodeFormat === "EAN8" && len !== 7 && len !== 8) {
            setError("EAN-8 memerlukan 7 atau 8 digit angka.");
            return;
          }
          if (barcodeFormat === "UPC" && len !== 11 && len !== 12) {
            setError("UPC memerlukan 11 atau 12 digit angka.");
            return;
          }
          if (barcodeFormat === "ITF14" && len !== 13 && len !== 14) {
            setError("ITF-14 memerlukan 13 atau 14 digit angka.");
            return;
          }
          value = digits;
        }

        JsBarcode(canvas, value, {
          format: barcodeFormat as any,
          lineColor: fgColor,
          background: bgColor,
          width: 2,
          height: barcodeHeight,
          displayValue: true,
          margin: 10,
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Gagal membuat kode");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrUrlImage) return;
    fetch(qrUrlImage)
      .then((r) => r.blob())
      .then((blob) => downloadBlob(blob, "gamato-qr.png"));
  };

  const downloadBarcode = () => {
    const canvas = barcodeCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, "gamato-barcode.png");
    });
  };

  const canGenerate = mode === "qr" ? !!buildQrPayload().trim() : !!barcodeContent.trim();

  return (
    <Card
      title="Kode Studio: QR & Barcode"
      description="Buat kode yang rapi untuk apa saja – link, WiFi, produk, tiket, dan lainnya."
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Badge>Realtime</Badge>
            <span>Tanpa upload ke server, semua diproses di browser.</span>
          </div>

          <div className="flex gap-2 rounded-xl bg-slate-50 p-1 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setMode("qr")}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 transition",
                mode === "qr" ? "bg-white shadow-sm" : "hover:bg-slate-100"
              )}
            >
              QR Code
            </button>
            <button
              type="button"
              onClick={() => setMode("barcode")}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 transition",
                mode === "barcode" ? "bg-white shadow-sm" : "hover:bg-slate-100"
              )}
            >
              Barcode
            </button>
          </div>

          {mode === "qr" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50/80 p-2 text-[11px] font-medium text-slate-600">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Template QR
                </span>
                {(
                  [
                    ["url", "Link"],
                    ["text", "Teks bebas"],
                    ["wifi", "WiFi"],
                    ["email", "Email"],
                    ["phone", "Telepon"],
                  ] as [QrTemplate, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setQrTemplate(id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 transition",
                      qrTemplate === id
                        ? "bg-slate-900 text-slate-50 shadow-sm"
                        : "bg-white text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {qrTemplate === "url" && (
                <Input
                  label="Link / URL"
                  type="url"
                  value={qrUrl}
                  onChange={(e) => setQrUrl(e.target.value)}
                  placeholder="https://contoh.com/halaman-anda"
                />
              )}

              {qrTemplate === "text" && (
                <Textarea
                  label="Teks bebas"
                  rows={4}
                  value={qrText}
                  onChange={(e) => setQrText(sanitizeText(e.target.value))}
                  placeholder="Tulis pesan, catatan, atau instruksi yang akan muncul saat discan."
                />
              )}

              {qrTemplate === "wifi" && (
                <div className="grid gap-3 rounded-xl bg-slate-50/70 p-3 text-xs md:grid-cols-2">
                  <div className="space-y-2">
                    <Input
                      label="Nama WiFi (SSID)"
                      value={qrWifiSsid}
                      onChange={(e) => setQrWifiSsid(sanitizeText(e.target.value))}
                      placeholder="Nama jaringan WiFi"
                    />
                    <Select
                      label="Keamanan"
                      value={qrWifiEnc}
                      onChange={(e) =>
                        setQrWifiEnc((e.target.value as "WPA" | "WEP" | "nopass") || "WPA")
                      }
                    >
                      <option value="WPA">WPA / WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">Tanpa password</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Input
                      label="Password WiFi"
                      type="text"
                      disabled={qrWifiEnc === "nopass"}
                      value={qrWifiPass}
                      onChange={(e) => setQrWifiPass(sanitizeText(e.target.value))}
                      placeholder={
                        qrWifiEnc === "nopass"
                          ? "Tidak diperlukan"
                          : "Masukkan password"
                      }
                    />
                    <div className="mt-2 flex items-center gap-2 pt-1">
                      <input
                        id="wifi-hidden"
                        type="checkbox"
                        checked={qrWifiHidden}
                        onChange={(e) => setQrWifiHidden(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900/30"
                      />
                      <label
                        htmlFor="wifi-hidden"
                        className="text-[11px] text-slate-600"
                      >
                        Jaringan disembunyikan (hidden SSID)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {qrTemplate === "email" && (
                <div className="space-y-2 text-xs">
                  <Input
                    label="Kepada (email)"
                    type="email"
                    value={qrEmailTo}
                    onChange={(e) => setQrEmailTo(sanitizeText(e.target.value))}
                    placeholder="nama@perusahaan.com"
                  />
                  <Input
                    label="Subjek"
                    value={qrEmailSubject}
                    onChange={(e) => setQrEmailSubject(sanitizeText(e.target.value))}
                    placeholder="Subjek email"
                  />
                  <Textarea
                    label="Isi email"
                    rows={3}
                    value={qrEmailBody}
                    onChange={(e) => setQrEmailBody(sanitizeText(e.target.value))}
                    placeholder="Teks email yang akan diisi otomatis."
                  />
                </div>
              )}

              {qrTemplate === "phone" && (
                <Input
                  label="Nomor telepon"
                  value={qrPhone}
                  onChange={(e) => setQrPhone(sanitizeText(e.target.value))}
                  placeholder="Contoh: +62812..."
                />
              )}
            </div>
          ) : (
            <Textarea
              label="Isi Barcode"
              rows={4}
              value={barcodeContent}
              onChange={(e) => setBarcodeContent(sanitizeText(e.target.value))}
              placeholder="Kode produk, SKU, atau nomor lain yang akan dijadikan barcode."
            />
          )}

          <div className="grid grid-cols-2 gap-4 text-xs">
            <Input
              label="Ukuran QR"
              type="number"
              min={128}
              max={640}
              value={size}
              onChange={(e) => setSize(Number(e.target.value) || 0)}
            />
            <Input
              label="Tinggi barcode"
              type="number"
              min={40}
              max={200}
              value={barcodeHeight}
              onChange={(e) => setBarcodeHeight(Number(e.target.value) || 0)}
            />
            <Input
              label="Warna utama"
              type="color"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
            />
            <Input
              label="Warna latar"
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            />
          </div>

          {mode === "qr" && (
            <div className="grid gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="space-y-2">
                <Label>Logo tengah (opsional)</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setLogoFile(e.target.files ? e.target.files[0] : null)
                  }
                  className="block w-full text-[11px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-50 hover:file:bg-slate-800"
                />
                <p className="text-[11px] text-slate-500">
                  PNG/JPG, akan otomatis dipotong dengan sudut membulat.
                </p>
              </div>
              {logoPreview && (
                <div className="flex items-center justify-center">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "barcode" && (
            <div className="grid grid-cols-2 gap-4 text-xs">
              <Select
                label="Format barcode"
                value={barcodeFormat}
                onChange={(e) => setBarcodeFormat(e.target.value)}
              >
                <option value="CODE128">CODE 128 (umum)</option>
                <option value="EAN13">EAN-13</option>
                <option value="EAN8">EAN-8</option>
                <option value="UPC">UPC</option>
                <option value="CODE39">CODE 39</option>
                <option value="ITF14">ITF-14</option>
              </Select>
              <div className="flex items-end">
                <p className="text-[11px] text-slate-500">
                  Gunakan hanya angka untuk EAN/UPC/ITF agar hasil valid.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={generate} disabled={isGenerating || !canGenerate}>
              {isGenerating ? "Memproses…" : "Bangun kode"}
            </Button>
            {error && <span className="text-[11px] text-rose-500">{error}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-slate-950/95 p-4 text-slate-100 shadow-lg shadow-slate-900/40">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              Pratinjau langsung
            </p>
            <div className="flex items-center justify-center rounded-xl bg-slate-900/60 p-4 overflow-x-auto">
              {mode === "qr" ? (
                qrUrlImage ? (
                  <img
                    src={qrUrlImage}
                    alt="QR preview"
                    className="h-[220px] w-[220px] max-w-full rounded-2xl bg-white p-3 shadow-md"
                  />
                ) : (
                  <div className="h-[220px] w-[220px] rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/40" />
                )
              ) : (
                <canvas
                  ref={barcodeCanvasRef}
                  className="max-h-[220px] max-w-full rounded-xl bg-slate-900/40 p-2"
                />
              )}
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-slate-400">
              <span>{mode === "qr" ? "PNG 300dpi" : barcodeFormat}</span>
              <span>◈ Tanpa Tracking</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {mode === "qr" ? (
              <Button
                variant="ghost"
                onClick={downloadQR}
                disabled={!qrUrlImage}
                className="w-full justify-between border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              >
                <span>Unduh QR sebagai PNG</span>
                <span className="text-[10px] text-slate-500">Siap cetak</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={downloadBarcode}
                disabled={!barcodeContent.trim()}
                className="w-full justify-between border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              >
                <span>Unduh barcode</span>
                <span className="text-[10px] text-slate-500">PNG high-res</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ---------- Helper untuk spesifikasi halaman PDF ----------

function parsePageSpec(input: string, totalPages: number): number[] {
  const parts = input
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const pages = new Set<number>();

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      let start = parseInt(rangeMatch[1], 10);
      let end = parseInt(rangeMatch[2], 10);
      if (isNaN(start) || isNaN(end)) continue;
      if (start > end) [start, end] = [end, start];
      for (let p = start; p <= end; p++) {
        if (p >= 1 && p <= totalPages) pages.add(p - 1);
      }
      continue;
    }

    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      pages.add(num - 1);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

// ---------- PDF Tools ----------

type PdfMode =
  | "compress"
  | "merge"
  | "split"
  | "extract"
  | "delete"
  | "rotate"
  | "organize"
  | "imagesToPdf"
  | "textToPdf";

const PdfTools: React.FC = () => {
  const [mode, setMode] = useState<PdfMode>("compress");
  const [files, setFiles] = useState<File[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const [pageSpec, setPageSpec] = useState("1-3");
  const [compressLevel, setCompressLevel] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [rotateSpec, setRotateSpec] = useState("semua");
  const [rotateDegrees, setRotateDegrees] = useState(90);
  const [textForPdf, setTextForPdf] = useState("");

  const isPdfMode = useMemo(
    () =>
      [
        "compress",
        "merge",
        "split",
        "extract",
        "delete",
        "rotate",
        "organize",
      ].includes(mode),
    [mode]
  );

  const onFilesChange = (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList);
    if (isPdfMode) {
      setFiles(arr.filter((f) => f.type === "application/pdf"));
    } else if (mode === "imagesToPdf") {
      setFiles(
        arr.filter((f) =>
          ["image/jpeg", "image/png", "image/jpg"].includes(f.type)
        )
      );
    }
  };

  const handleRun = async () => {
    setInfo(null);

    if (mode === "textToPdf") {
      if (!textForPdf.trim()) return;
      setIsWorking(true);
      try {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const lineHeight = fontSize + 4;
        const margin = 50;

        const rawLines = textForPdf.split(/\r?\n/);
        const allLines: string[] = [];
        const approxCharWidth = fontSize * 0.55;

        const maxCharsPerLine = Math.floor(
          (595.28 - margin * 2) / approxCharWidth
        ); // lebar A4

        for (const raw of rawLines) {
          if (!raw) {
            allLines.push("");
            continue;
          }
          let start = 0;
          while (start < raw.length) {
            allLines.push(raw.slice(start, start + maxCharsPerLine));
            start += maxCharsPerLine;
          }
        }

        let page = pdfDoc.addPage();
        let { height } = page.getSize();
        let y = height - margin;

        const addPage = () => {
          page = pdfDoc.addPage();
          const size = page.getSize();
          height = size.height;
          y = height - margin;
        };

        for (const line of allLines) {
          if (y < margin + lineHeight) addPage();
          if (line) {
            page.drawText(line, {
              x: margin,
              y: y - lineHeight,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
          }
          y -= lineHeight;
        }

        const bytes = await pdfDoc.save();
        const blob = new Blob([bytes.buffer as ArrayBuffer], {
          type: "application/pdf",
        });
        downloadBlob(blob, "gamato-text.pdf");
        setInfo("Teks diubah menjadi PDF, siap dibagikan.");
      } catch (err: any) {
        console.error(err);
        setInfo(err?.message || "Gagal membuat PDF dari teks.");
      } finally {
        setIsWorking(false);
      }
      return;
    }

    if (mode === "imagesToPdf") {
      if (!files.length) return;
      setIsWorking(true);
      try {
        const pdfDoc = await PDFDocument.create();
        for (const file of files) {
          const bytes = new Uint8Array(await fileToArrayBuffer(file));
          const isPng = file.type === "image/png";
          const image = isPng
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes);
          const { width, height } = image.scale(1);
          const page = pdfDoc.addPage([width, height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width,
            height,
          });
        }
        const out = await pdfDoc.save();
        const blob = new Blob([out.buffer as ArrayBuffer], {
          type: "application/pdf",
        });
        downloadBlob(blob, "gamato-images.pdf");
        setInfo("Gambar digabung menjadi satu PDF.");
      } catch (err: any) {
        console.error(err);
        setInfo(err?.message || "Gagal membuat PDF dari gambar.");
      } finally {
        setIsWorking(false);
      }
      return;
    }

    // Mode-mode berbasis PDF
    if (!files.length) return;
    setIsWorking(true);

    try {
      if (mode === "merge") {
        const doc = await PDFDocument.create();
        for (const file of files) {
          const bytes = await fileToArrayBuffer(file);
          const src = await PDFDocument.load(bytes);
          const pages = await doc.copyPages(src, src.getPageIndices());
          pages.forEach((p) => doc.addPage(p));
        }
        const mergedBytes = await doc.save();
        const mergedBuffer = new Uint8Array(mergedBytes).buffer as ArrayBuffer;
        const blob = new Blob([mergedBuffer], { type: "application/pdf" });
        downloadBlob(blob, "gamato-merged.pdf");
        setInfo("PDF digabung menjadi satu berkas.");
      } else if (mode === "split") {
        const [file] = files;
        const bytes = await fileToArrayBuffer(file);
        const src = await PDFDocument.load(bytes);
        const total = src.getPageCount();
        for (let i = 0; i < total; i++) {
          const doc = await PDFDocument.create();
          const [page] = await doc.copyPages(src, [i]);
          doc.addPage(page);
          const out = await doc.save();
          const blob = new Blob([out.buffer as ArrayBuffer], {
            type: "application/pdf",
          });
          downloadBlob(blob, `gamato-page-${i + 1}.pdf`);
        }
        setInfo("Setiap halaman diekspor menjadi file terpisah.");
      } else if (mode === "compress") {
        const [file] = files;
        const bytes = await fileToArrayBuffer(file);

        const doc = await PDFDocument.load(bytes, { updateMetadata: true });

        if (compressLevel === "low") {
          doc.setTitle("Compressed by Gamato Piranti (ringan)");
        } else if (compressLevel === "medium") {
          doc.setTitle("Compressed by Gamato Piranti (sedang)");
        } else {
          doc.setTitle("Compressed by Gamato Piranti (tinggi)");
        }

        const compressed = await doc.save({ useObjectStreams: true });
        const blob = new Blob([compressed.buffer as ArrayBuffer], {
          type: "application/pdf",
        });
        const filename =
          compressLevel === "low"
            ? "gamato-compressed-light.pdf"
            : compressLevel === "medium"
            ? "gamato-compressed-medium.pdf"
            : "gamato-compressed-strong.pdf";
        downloadBlob(blob, filename);

        if (compressLevel === "low") {
          setInfo(
            "Kompresi ringan: struktur PDF dioptimalkan ulang tanpa mengubah kualitas halaman."
          );
        } else if (compressLevel === "medium") {
          setInfo(
            "Kompresi sedang: penyimpanan ulang objek dan stream dilakukan sedikit lebih agresif. Efek bergantung pada isi PDF."
          );
        } else {
          setInfo(
            "Kompresi tinggi: cocok sebagai tahap awal sebelum kompresi lanjutan di sisi server. Efek di browser bergantung pada struktur file awal."
          );
        }
      } else if (mode === "extract") {
        const [file] = files;
        const bytes = await fileToArrayBuffer(file);
        const src = await PDFDocument.load(bytes);
        const total = src.getPageCount();
        const indices = parsePageSpec(pageSpec, total);
        if (!indices.length) {
          setInfo("Rentang halaman tidak valid.");
        } else {
          const doc = await PDFDocument.create();
          const pages = await doc.copyPages(src, indices);
          pages.forEach((p) => doc.addPage(p));
          const out = await doc.save();
          const blob = new Blob([out.buffer as ArrayBuffer], {
            type: "application/pdf",
          });
          downloadBlob(blob, "gamato-extract.pdf");
          setInfo(
            `Halaman ${pageSpec} diekstrak menjadi PDF baru (total ${pages.length} halaman).`
          );
        }
      } else if (mode === "delete") {
        const [file] = files;
        const bytes = await fileToArrayBuffer(file);
        const src = await PDFDocument.load(bytes);
        const total = src.getPageCount();
        const toRemove = new Set(parsePageSpec(pageSpec, total));
        const keep: number[] = [];
        for (let i = 0; i < total; i++) {
          if (!toRemove.has(i)) keep.push(i);
        }
        const doc = await PDFDocument.create();
        const pages = await doc.copyPages(src, keep);
        pages.forEach((p) => doc.addPage(p));
        const out = await doc.save();
        const blob = new Blob([out.buffer as ArrayBuffer], {
          type: "application/pdf",
        });
        downloadBlob(blob, "gamato-clean.pdf");
        setInfo(
          `Halaman ${pageSpec} dihapus. Dokumen baru memiliki ${keep.length} halaman.`
        );
      } else if (mode === "organize") {
        const [file] = files;
        const bytes = await fileToArrayBuffer(file);
        const src = await PDFDocument.load(bytes);
        const total = src.getPageCount();

        const tokens = pageSpec
          .split(/[,;]/)
          .map((p) => p.trim())
          .filter(Boolean);
        const order: number[] = [];

        for (const token of tokens) {
          const rangeMatch = token.match(/^(\d+)-(\d+)$/);
          if (rangeMatch) {
            let start = parseInt(rangeMatch[1], 10);
            let end = parseInt(rangeMatch[2], 10);
            if (isNaN(start) || isNaN(end)) continue;
            if (start > end) [start, end] = [end, start];
            for (let p = start; p <= end; p++) {
              if (p >= 1 && p <= total) order.push(p - 1);
            }
          } else {
            const num = parseInt(token, 10);
            if (!isNaN(num) && num >= 1 && num <= total) {
              order.push(num - 1);
            }
          }
        }

        if (!order.length) {
          setInfo("Urutan halaman tidak valid. Gunakan nomor halaman yang ada.");
        } else {
          const doc = await PDFDocument.create();
          const pages = await doc.copyPages(src, order);
          pages.forEach((p) => doc.addPage(p));
          const out = await doc.save();
          const blob = new Blob([out.buffer as ArrayBuffer], {
            type: "application/pdf",
          });
          downloadBlob(blob, "gamato-organized.pdf");
          setInfo(
            `Halaman diatur ulang sesuai urutan yang Anda tentukan (${pageSpec}).`
          );
        }
      } else if (mode === "rotate") {
        const [file] = files;
        const bytes = await fileToArrayBuffer(file);
        const src = await PDFDocument.load(bytes);
        const total = src.getPageCount();
        const target =
          rotateSpec === "semua"
            ? Array.from({ length: total }, (_, i) => i)
            : parsePageSpec(pageSpec, total);

        target.forEach((idx) => {
          const page = src.getPage(idx);
          page.setRotation(degrees(rotateDegrees));
        });

        const out = await src.save();
        const blob = new Blob([out.buffer as ArrayBuffer], {
          type: "application/pdf",
        });
        downloadBlob(blob, "gamato-rotated.pdf");
        setInfo(
          rotateSpec === "semua"
            ? `Semua halaman diputar ${rotateDegrees}°.`
            : `Halaman ${pageSpec} diputar ${rotateDegrees}°.`
        );
      }
    } catch (err: any) {
      console.error(err);
      setInfo(err?.message || "Gagal memproses PDF.");
    } finally {
      setIsWorking(false);
    }
  };

  const totalSizeMb = useMemo(
    () =>
      files.length
        ? Math.round(
            (files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024) * 10
          ) / 10
        : 0,
    [files]
  );

  return (
    <Card
      title="PDF Lab – Dokumen Suite"
      description="Toolkit PDF lengkap: kompres, gabung, pecah, atur ulang halaman, dan konversi."
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto rounded-xl bg-slate-50 p-1 text-xs font-medium text-slate-600 flex-nowrap whitespace-nowrap md:flex-wrap md:whitespace-normal md:overflow-x-visible [&>button]:shrink-0 [&>button]:whitespace-nowrap snap-x snap-mandatory">
            {/* Ensure tabs don't shrink on mobile to prevent overlap */}
            
            {(
              [
                ["compress", "Kompres"],
                ["merge", "Gabung"],
                ["split", "Pecah per halaman"],
                ["extract", "Ekstrak halaman"],
                ["delete", "Hapus halaman"],
                ["rotate", "Putar halaman"],
                ["organize", "Atur halaman"],
                ["imagesToPdf", "Gambar → PDF"],
                ["textToPdf", "Teks → PDF"],
              ] as [PdfMode, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 transition",
                  mode === id ? "bg-white shadow-sm" : "hover:bg-slate-100"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "textToPdf" ? (
            <div className="space-y-3 text-xs">
              <Textarea
                label="Isi teks untuk dijadikan PDF"
                rows={10}
                value={textForPdf}
                onChange={(e) => setTextForPdf(e.target.value)}
                placeholder="Tulis atau tempel teks di sini. Cocok untuk catatan rapat, checklist, atau draf cepat."
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRun}
                  disabled={isWorking || !textForPdf.trim()}
                >
                  {isWorking ? "Memproses…" : "Jadikan PDF"}
                </Button>
                <p className="text-[11px] text-slate-500">
                  Layout sederhana, aman dibuka di semua pembaca PDF.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-xs">
                <Label>
                  {mode === "imagesToPdf"
                    ? "Masukkan gambar (JPG/PNG)"
                    : "Masukkan berkas PDF"}
                </Label>
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3">
                  <input
                    type="file"
                    accept={
                      mode === "imagesToPdf"
                        ? "image/jpeg,image/png,image/jpg"
                        : "application/pdf"
                    }
                    multiple={mode === "merge" || mode === "imagesToPdf"}
                    onChange={(e) => onFilesChange(e.target.files)}
                    className="block w-full text-[11px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-50 hover:file:bg-slate-800"
                  />
                  <p className="text-[11px] text-slate-500">
                    {mode === "merge"
                      ? "Pilih beberapa PDF, urutan mengikuti daftar file."
                      : mode === "imagesToPdf"
                      ? "Pilih satu atau beberapa gambar. Setiap gambar jadi satu halaman."
                      : "Satu PDF, diproses langsung di browser."}
                  </p>
                  {files.length > 0 && (
                    <p className="text-[11px] text-slate-600">
                      {files.length} file dipilih – Total ≈ {totalSizeMb} MB
                    </p>
                  )}
                </div>
                {mode === "compress" && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    <span>Tingkat kompresi:</span>
                    <button
                      type="button"
                      onClick={() => setCompressLevel("low")}
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        compressLevel === "low"
                          ? "bg-slate-900 text-slate-50"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      Ringan
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompressLevel("medium")}
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        compressLevel === "medium"
                          ? "bg-slate-900 text-slate-50"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      Sedang
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompressLevel("high")}
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        compressLevel === "high"
                          ? "bg-slate-900 text-slate-50"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      )}
                    >
                      Tinggi
                    </button>
                    <span className="text-[10px] text-slate-400">
                      Semua level memakai optimasi struktur di browser. Untuk kompresi ekstrim biasanya diperlukan pemrosesan tambahan di sisi server.
                    </span>
                  </div>
                )}
              </div>

              {(mode === "extract" || mode === "delete" || mode === "rotate" || mode === "organize") && (
                <div className="grid gap-3 rounded-xl bg-slate-50/70 p-3 text-xs md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>
                      {mode === "organize" ? "Urutan halaman baru" : "Rentang halaman"}
                    </Label>
                    <Input
                      placeholder={
                        mode === "organize"
                          ? "contoh: 3,1,2,5-7"
                          : "contoh: 1-3,5,8-9"
                      }
                      value={pageSpec}
                      onChange={(e) => setPageSpec(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500">
                      {mode === "organize"
                        ? "Urutan mengikuti angka yang Anda masukkan. Gunakan koma untuk memisah, dan tanda minus untuk rentang. Halaman mulai dari 1."
                        : "Gunakan koma untuk memisah, dan tanda minus untuk rentang. Halaman mulai dari 1."}
                    </p>
                  </div>
                  {mode === "rotate" && (
                    <div className="space-y-2">
                      <Label>Opsi putar</Label>
                      <div className="flex flex-wrap gap-2">
                        <Select
                          value={rotateSpec}
                          onChange={(e) => setRotateSpec(e.target.value)}
                        >
                          <option value="semua">Putar semua halaman</option>
                          <option value="pilih">Hanya halaman tertentu</option>
                        </Select>
                        <Select
                          value={rotateDegrees}
                          onChange={(e) =>
                            setRotateDegrees(parseInt(e.target.value, 10) || 90)
                          }
                        >
                          <option value={90}>90°</option>
                          <option value={180}>180°</option>
                          <option value={270}>270°</option>
                        </Select>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Untuk halaman tertentu, isi rentang di sebelah kiri.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleRun}
                  disabled={isWorking || !files.length}
                >
                  {isWorking ? "Memproses…" : "Proses dokumen"}
                </Button>
                <p className="text-[11px] text-slate-500">
                  Hasil diunduh langsung sebagai dokumen baru.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-slate-950/95 p-4 text-[11px] text-slate-200 shadow-lg shadow-slate-900/40">
          <div className="space-y-2">
            <p className="font-medium uppercase tracking-[0.16em] text-slate-400">
              Mode aktif
            </p>
            <ul className="space-y-1.5 text-slate-200">
              {mode === "compress" && (
                <>
                  <li>• Optimasi ulang struktur PDF tanpa mengubah isi.</li>
                  <li>• Cocok untuk lampiran email dan upload portal.</li>
                  <li>• Mengurangi ukuran dengan menyimpan ulang objek.</li>
                </>
              )}
              {mode === "merge" && (
                <>
                  <li>• Gabungkan beberapa PDF menjadi satu.</li>
                  <li>• Urutan mengikuti daftar file yang dipilih.</li>
                  <li>• Ideal untuk menggabungkan laporan, kontrak, atau lampiran.</li>
                </>
              )}
              {mode === "split" && (
                <>
                  <li>• Setiap halaman menjadi file PDF terpisah.</li>
                  <li>• Praktis untuk membagi dokumen yang tebal.</li>
                </>
              )}
              {mode === "extract" && (
                <>
                  <li>• Pilih hanya halaman yang Anda butuhkan.</li>
                  <li>• Contoh: 1-3,5,10-12.</li>
                </>
              )}
              {mode === "delete" && (
                <>
                  <li>• Buang halaman yang tidak diperlukan.</li>
                  <li>• Nomor halaman yang diisi akan dihapus.</li>
                </>
              )}
              {mode === "rotate" && (
                <>
                  <li>• Putar orientasi halaman yang miring.</li>
                  <li>• Bisa semua halaman atau hanya rentang tertentu.</li>
                </>
              )}
              {mode === "organize" && (
                <>
                  <li>• Susun ulang urutan halaman secara bebas.</li>
                  <li>• Masukkan urutan baru, misalnya: 3,1,2,5-7.</li>
                  <li>• Cocok untuk menata ulang dokumen sebelum dibagikan.</li>
                </>
              )}
              {mode === "imagesToPdf" && (
                <>
                  <li>• Konversi JPG/PNG menjadi PDF.</li>
                  <li>• Satu gambar menjadi satu halaman.</li>
                </>
              )}
              {mode === "textToPdf" && (
                <>
                  <li>• Ubah teks polos menjadi dokumen PDF.</li>
                  <li>• Layout minimalis, cocok untuk catatan dan checklist.</li>
                </>
              )}
            </ul>
          </div>
          <div className="space-y-1 border-t border-slate-800/60 pt-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Status
            </p>
            <p className="text-[11px] text-slate-200">
              {info || "Siap menerima berkas atau teks."}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ---------- Document Tools (.docx) ----------

const DocTools: React.FC = () => {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("Gamato Piranti Dokumen");
  const [docInfo, setDocInfo] = useState<string | null>(null);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState<string | null>(null);

  const stats = useMemo(() => {
    const chars = text.length;
    const words = (text.match(/\S+/g) || []).length;
    const lines = text.split(/\r?\n/).length;
    return { chars, words, lines };
  }, [text]);

  const outline = useMemo(
    () => {
      const lines = text.split(/\r?\n/);
      const entries: { line: string; index: number }[] = [];
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const looksLikeHeading =
          trimmed.startsWith("#") ||
          (trimmed.length <= 80 &&
            trimmed === trimmed.toUpperCase() &&
            /[A-ZÀ-ÖØ-Ý]/.test(trimmed));
        if (looksLikeHeading) {
          entries.push({ line: trimmed.replace(/^#+\s*/, ""), index: idx });
        }
      });
      return entries;
    },
    [text]
  );

  const exportDocx = async () => {
    if (!text.trim()) return;
    const lines = text.split(/\n/g);
    const paragraphs = lines.map((line) =>
      new Paragraph({
        children: [new TextRun({ text: line || " ", size: 22 })],
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const safeName = sanitizeFileName(fileName || "gamato-dokumen");
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${safeName}.docx`);
    setDocInfo("Dokumen .docx berhasil disiapkan.");
  };

  const exportPdf = async () => {
    if (!text.trim()) return;
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const lineHeight = fontSize + 4;
      const margin = 50;

      const rawLines = text.split(/\r?\n/);
      const allLines: string[] = [];
      const approxCharWidth = fontSize * 0.55;
      const maxCharsPerLine = Math.floor(
        (595.28 - margin * 2) / approxCharWidth
      );

      for (const raw of rawLines) {
        if (!raw) {
          allLines.push("");
          continue;
        }
        let start = 0;
        while (start < raw.length) {
          allLines.push(raw.slice(start, start + maxCharsPerLine));
          start += maxCharsPerLine;
        }
      }

      let page = pdfDoc.addPage();
      let { height } = page.getSize();
      let y = height - margin;

      const addPage = () => {
        page = pdfDoc.addPage();
        const size = page.getSize();
        height = size.height;
        y = height - margin;
      };

      for (const line of allLines) {
        if (y < margin + lineHeight) addPage();
        if (line) {
          page.drawText(line, {
            x: margin,
            y: y - lineHeight,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        }
        y -= lineHeight;
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const safeName = sanitizeFileName(fileName || "gamato-dokumen");
      downloadBlob(blob, `${safeName}.pdf`);
      setDocInfo("Dokumen disimpan sebagai PDF sederhana.");
    } catch (err) {
      console.error(err);
      setDocInfo("Gagal menyusun PDF dari dokumen ini.");
    }
  };

  const downloadTxt = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const safeName = sanitizeFileName(fileName || "gamato-dokumen");
    downloadBlob(blob, `${safeName}.txt`);
    setDocInfo("Teks diekspor sebagai .txt.");
  };

  const importTxt = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setText((reader.result as string) || "");
      const base = file.name.replace(/\.[^.]+$/, "");
      setFileName(base || fileName);
      setDocInfo("Isi dokumen diambil dari berkas .txt.");
    };
    reader.readAsText(file);
  };

  const generateTemplate = (kind: "notulen" | "surat" | "catatan") => {
    if (kind === "notulen") {
      setText(
        "NOTULEN RAPAT\nGamato Piranti\n\nAgenda:\n- \n\nPeserta:\n- \n\nRingkasan:\n- \n\nKeputusan:\n- \n\nTindak Lanjut:\n- "
      );
      setFileName("Notulen Gamato");
      setDocInfo("Template notulen rapat dimuat.");
    } else if (kind === "surat") {
      setText(
        "Surabaya, .................................... 20..\n\nKepada Yth.\n...........................................\nDi Tempat\n\nPerihal: ...........................................\n\nDengan hormat,\n\n...\n\nHormat kami,\nGamato Piranti\n"
      );
      setFileName("Surat Gamato");
      setDocInfo("Template surat resmi dimuat.");
    } else {
      setText("Catatan kerja Gamato Piranti\n\n- ");
      setFileName("Catatan Gamato");
      setDocInfo("Template catatan kerja dimuat.");
    }
  };

  const quickClean = (kind: "trim" | "noBlank") => {
    if (!text) return;
    if (kind === "trim") {
      setText(text.replace(/[ \t]+/g, " "));
      setDocInfo("Spasi ganda dirapikan.");
    } else {
      setText(
        text
          .split(/\r?\n/)
          .filter((l) => l.trim() !== "")
          .join("\n")
      );
      setDocInfo("Baris kosong dihapus.");
    }
  };

  const runFindReplace = () => {
    if (!findText) return;
    if (!text.includes(findText)) {
      setDocInfo("Teks yang dicari tidak ditemukan.");
      return;
    }
    const replaced = text.split(findText).join(replaceText);
    setText(replaced);
    setDocInfo("Pencarian dan penggantian selesai.");
  };

  const changeCase = (kind: "upper" | "lower" | "title") => {
    if (!text) return;
    if (kind === "upper") {
      setText(text.toUpperCase());
      setDocInfo("Seluruh teks diubah menjadi huruf besar.");
    } else if (kind === "lower") {
      setText(text.toLowerCase());
      setDocInfo("Seluruh teks diubah menjadi huruf kecil.");
    } else {
      const titled = text.replace(/\w\S*/g, (word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
      setText(titled);
      setDocInfo("Setiap kata diawali huruf besar.");
    }
  };

  const saveSnapshot = () => {
    if (!text) return;
    setSnapshot(text);
    setSnapshotLabel(fileName || "Tanpa judul");
    setDocInfo("Snapshot sesi disimpan. Anda bisa kembali kapan saja.");
  };

  const restoreSnapshot = () => {
    if (!snapshot) return;
    setText(snapshot);
    setDocInfo("Teks dikembalikan ke snapshot yang tersimpan.");
  };

  return (
    <Card
      title="Doc Studio"
      description="Editor dokumen ringan dengan ekspor .docx, .pdf, dan .txt, plus utilitas pengolah teks."
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Input
            label="Nama dokumen"
            value={fileName}
            onChange={(e) => setFileName(sanitizeFileName(e.target.value))}
            placeholder="Judul atau nama file"
          />

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>Template cepat:</span>
            <button
              type="button"
              onClick={() => generateTemplate("notulen")}
              className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            >
              Notulen rapat
            </button>
            <button
              type="button"
              onClick={() => generateTemplate("surat")}
              className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            >
              Surat resmi
            </button>
            <button
              type="button"
              onClick={() => generateTemplate("catatan")}
              className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            >
              Catatan kerja
            </button>
          </div>

          <div className="grid gap-3 text-[11px] text-slate-600 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.5fr)]">
            <Input
              label="Cari teks"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Kata atau frasa yang akan dicari"
            />
            <Input
              label="Ganti dengan"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Teks pengganti (opsional)"
            />
            <div className="flex items-end gap-2">
              <Button
                variant="ghost"
                onClick={runFindReplace}
                disabled={!findText}
                className="flex-1"
              >
                Cari & ganti
              </Button>
              <button
                type="button"
                onClick={() => {
                  setFindText("");
                  setReplaceText("");
                }}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                Reset
              </button>
            </div>
          </div>

          <Textarea
            label="Isi dokumen"
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis isi dokumen di sini."
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={exportDocx} disabled={!text.trim()}>
              Unduh sebagai .docx
            </Button>
            <Button
              variant="ghost"
              onClick={exportPdf}
              disabled={!text.trim()}
              className="border border-slate-200 bg-white"
            >
              Unduh sebagai .pdf
            </Button>
            <Button
              variant="ghost"
              onClick={downloadTxt}
              disabled={!text}
              className="border border-slate-200 bg-white"
            >
              Unduh sebagai .txt
            </Button>
            <label className="ml-auto inline-flex cursor-pointer items-center rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100">
              <span>Impor .txt</span>
              <input
                type="file"
                accept="text/plain"
                className="hidden"
                onChange={(e) => importTxt(e.target.files)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span>Perapian cepat:</span>
            <button
              type="button"
              onClick={() => quickClean("trim")}
              className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            >
              Rapikan spasi
            </button>
            <button
              type="button"
              onClick={() => quickClean("noBlank")}
              className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            >
              Hapus baris kosong
            </button>
            <button
              type="button"
              onClick={() => changeCase("upper")}
              className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            >
              HURUF BESAR
            </button>
            <button
              type="button"
              onClick={() => changeCase("lower")}
              className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            >
              huruf kecil
            </button>
            <button
              type="button"
              onClick={() => changeCase("title")}
              className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            >
              Kapitalisasi kata
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>Snapshot sesi:</span>
            <button
              type="button"
              onClick={saveSnapshot}
              className="rounded-full bg-slate-100 px-2 py-0.5 hover:bg-slate-200"
            >
              Simpan snapshot
            </button>
            <button
              type="button"
              onClick={restoreSnapshot}
              disabled={!snapshot}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 hover:bg-slate-200 disabled:text-slate-300"
            >
              Kembalikan snapshot
            </button>
            {snapshotLabel && (
              <span className="text-[10px] text-slate-400">
                Tersimpan terakhir: {snapshotLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-slate-950/95 p-4 text-[11px] text-slate-100 shadow-lg shadow-slate-900/40">
          <div className="space-y-2">
            <p className="font-medium uppercase tracking-[0.16em] text-slate-400">
              Pratinjau ringkas
            </p>
            <div className="max-h-60 space-y-2 overflow-hidden rounded-xl bg-slate-900/50 p-3 text-[11px] leading-relaxed text-slate-100">
              {text ? (
                text.split("\n").slice(0, 14).map((line, idx) => (
                  <p key={idx} className="whitespace-pre-wrap">
                    {line || " "}
                  </p>
                ))
              ) : (
                <p className="text-slate-500">
                  Mulai menulis atau impor .txt untuk melihat pratinjau di sini.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2 border-t border-slate-800/60 pt-3 text-[11px]">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Statistik dokumen
            </p>
            <div className="flex flex-wrap gap-3 text-slate-200">
              <span>{stats.words} kata</span>
              <span>{stats.chars} karakter</span>
              <span>{stats.lines} baris</span>
            </div>
            {docInfo && (
              <p className="mt-1 text-[10px] text-emerald-400">{docInfo}</p>
            )}
            <p className="mt-1 text-[10px] text-slate-400">
              Ekspor .docx, .pdf, dan .txt aman dibuka di Word, Google Docs, dan office suite lain.
            </p>
            {outline.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Outline dokumen
                </p>
                <ul className="space-y-0.5 text-[11px] text-slate-200">
                  {outline.map((item) => (
                    <li key={item.index} className="truncate">
                      <span className="mr-1 text-slate-500">•</span>
                      {item.line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ---------- Image Lab (Gambar) ----------

const ImageTools: React.FC = () => {
  type ImageMode = "compress" | "resize" | "convert" | "rotate";

  const [mode, setMode] = useState<ImageMode>("compress");
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(75);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [maxHeight, setMaxHeight] = useState(1600);
  const [targetFormat, setTargetFormat] = useState<
    "original" | "jpeg" | "png" | "webp"
  >("jpeg");
  const [rotateDeg, setRotateDeg] = useState(90);
  const [isWorking, setIsWorking] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const onFilesChange = (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    setFiles(arr);
  };

  const totalSizeMb = useMemo(
    () =>
      files.length
        ? Math.round(
            (files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024) * 10
          ) / 10
        : 0,
    [files]
  );

  const processImages = async () => {
    if (!files.length) return;
    setIsWorking(true);
    setInfo(null);

    try {
      for (const file of files) {
        const dataUrl = await fileToDataUrl(file);
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Gagal memuat gambar."));
        });

        let drawWidth = img.width;
        let drawHeight = img.height;

        if (mode === "resize") {
          const limitW = maxWidth > 0 ? maxWidth : img.width;
          const limitH = maxHeight > 0 ? maxHeight : img.height;
          const scale = Math.min(limitW / img.width, limitH / img.height, 1);
          drawWidth = Math.round(img.width * scale);
          drawHeight = Math.round(img.height * scale);
        }

        const angle = mode === "rotate" ? rotateDeg : 0;
        const radians = (angle * Math.PI) / 180;

        let canvasWidth = drawWidth;
        let canvasHeight = drawHeight;
        if (angle === 90 || angle === 270) {
          canvasWidth = drawHeight;
          canvasHeight = drawWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas tidak tersedia.");

        ctx.save();
        ctx.translate(canvasWidth / 2, canvasHeight / 2);
        if (angle !== 0) ctx.rotate(radians);
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();

        const originalType =
          file.type && file.type.startsWith("image/")
            ? file.type
            : "image/png";

        let mime: string;
        if (targetFormat === "original") {
          mime = originalType;
        } else if (targetFormat === "jpeg") {
          mime = "image/jpeg";
        } else if (targetFormat === "png") {
          mime = "image/png";
        } else {
          mime = "image/webp";
        }

        const q = Math.min(Math.max(quality, 10), 100) / 100;
        const needQuality = mime === "image/jpeg" || mime === "image/webp";

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b),
            mime,
            needQuality ? q : undefined
          );
        });

        if (!blob) continue;

        const base = file.name.replace(/\.[^.]+$/, "");
        const ext =
          mime === "image/jpeg"
            ? "jpg"
            : mime === "image/png"
            ? "png"
            : mime === "image/webp"
            ? "webp"
            : "img";
        const suffix =
          mode === "compress"
            ? "compressed"
            : mode === "resize"
            ? "resized"
            : mode === "convert"
            ? "converted"
            : "rotated";
        const filename = `${base}-gp-${suffix}.${ext}`;
        downloadBlob(blob, filename);
      }

      setInfo(`${files.length} gambar diproses.`);
    } catch (err: any) {
      console.error(err);
      setInfo(err?.message || "Gagal memproses gambar.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Card
      title="Image Lab – Gambar"
      description="Kompres, ubah ukuran, konversi, dan putar gambar langsung di browser."
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4 text-xs">
          <div className="flex gap-2 overflow-x-auto rounded-xl bg-slate-50 p-1 font-medium text-slate-600 flex-nowrap whitespace-nowrap [&>button]:shrink-0 [&>button]:whitespace-nowrap">
            {/* Prevent button shrink to avoid overlap */}
            {(
              [
                ["compress", "Kompres"],
                ["resize", "Ubah ukuran"],
                ["convert", "Konversi format"],
                ["rotate", "Putar"],
              ] as [ImageMode, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 transition",
                  mode === id ? "bg-white shadow-sm" : "hover:bg-slate-100"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Masukkan gambar</Label>
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onFilesChange(e.target.files)}
                className="block w-full text-[11px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-50 hover:file:bg-slate-800"
              />
              <p className="text-[11px] text-slate-500">
                Pilih satu atau beberapa gambar. Semua diproses langsung di browser.
              </p>
              {files.length > 0 && (
                <p className="text-[11px] text-slate-600">
                  {files.length} file – Total ≈ {totalSizeMb} MB
                </p>
              )}
            </div>
          </div>

          {mode === "resize" && (
            <div className="grid gap-3 rounded-xl bg-slate-50/70 p-3 md:grid-cols-2">
              <Input
                label="Lebar maksimum (px)"
                type="number"
                min={0}
                value={maxWidth}
                onChange={(e) => setMaxWidth(parseInt(e.target.value, 10) || 0)}
              />
              <Input
                label="Tinggi maksimum (px)"
                type="number"
                min={0}
                value={maxHeight}
                onChange={(e) => setMaxHeight(parseInt(e.target.value, 10) || 0)}
              />
              <p className="col-span-full text-[11px] text-slate-500">
                Rasio gambar dipertahankan. Jika 0, ukuran asli akan dipertahankan untuk sisi tersebut.
              </p>
            </div>
          )}

          {mode === "rotate" && (
            <div className="grid gap-3 rounded-xl bg-slate-50/70 p-3 md:grid-cols-2">
              <Select
                label="Derajat putar"
                value={rotateDeg}
                onChange={(e) => setRotateDeg(parseInt(e.target.value, 10) || 90)}
              >
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </Select>
              <p className="text-[11px] text-slate-500">
                Setiap gambar akan diputar dengan sudut yang dipilih.
              </p>
            </div>
          )}

          <div className="grid gap-3 rounded-xl bg-slate-50/70 p-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
            <Select
              label="Format keluaran"
              value={targetFormat}
              onChange={(e) =>
                setTargetFormat(
                  (e.target.value as "original" | "jpeg" | "png" | "webp") ||
                    "jpeg"
                )
              }
            >
              <option value="original">Sesuai asli</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WEBP</option>
            </Select>
            <div className="space-y-1.5">
              <Label>Kualitas (untuk JPEG/WEBP)</Label>
              <input
                type="range"
                min={30}
                max={100}
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value, 10) || 75)}
                className="w-full accent-slate-900"
              />
              <p className="text-[11px] text-slate-500">
                Nilai lebih rendah akan mengecilkan ukuran berkas namun menurunkan detail.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={processImages}
              disabled={isWorking || !files.length}
            >
              {isWorking ? "Memproses…" : "Proses gambar"}
            </Button>
            <p className="text-[11px] text-slate-500">
              Setiap gambar akan diunduh sebagai berkas baru.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-slate-950/95 p-4 text-[11px] text-slate-200 shadow-lg shadow-slate-900/40">
          <div className="space-y-2">
            <p className="font-medium uppercase tracking-[0.16em] text-slate-400">
              Mode gambar
            </p>
            <ul className="space-y-1.5 text-slate-200">
              {mode === "compress" && (
                <>
                  <li>• Kompres gambar tanpa mengubah dimensi.</li>
                  <li>• Cocok untuk unggahan web dan dokumen.</li>
                </>
              )}
              {mode === "resize" && (
                <>
                  <li>• Ubah ukuran gambar dengan rasio terjaga.</li>
                  <li>• Berguna untuk thumbnail dan preview.</li>
                </>
              )}
              {mode === "convert" && (
                <>
                  <li>• Konversi format antara JPEG, PNG, dan WEBP.</li>
                  <li>• Dapat membantu mengecilkan ukuran berkas.</li>
                </>
              )}
              {mode === "rotate" && (
                <>
                  <li>• Putar orientasi foto yang miring.</li>
                  <li>• Menerapkan rotasi ke semua gambar yang dipilih.</li>
                </>
              )}
            </ul>
          </div>
          <div className="space-y-1 border-t border-slate-800/60 pt-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Status
            </p>
            <p className="text-[11px] text-slate-200">
              {info || "Siap menerima berkas gambar."}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ---------- Misc Utility Shelf ----------

const UtilityShelf: React.FC = () => {
  const [tab, setTab] = useState<
    | "json"
    | "bulk"
    | "media"
    | "alias"
    | "tax"
    | "interest"
    | "stats"
    | "wa"
    | "pass"
    | "meta"
  >("json");

  // JSON & Base64
  const [textInput, setTextInput] = useState("");
  const [jsonPretty, setJsonPretty] = useState("");
  const [base64, setBase64] = useState("");

  // Bulk text & data lab
  const [bulkInput, setBulkInput] = useState("");
  const [bulkOutput, setBulkOutput] = useState("");
  const [bulkInfo, setBulkInfo] = useState<string | null>(null);

  // Link & media helper
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaInfo, setMediaInfo] = useState<string | null>(null);
  const [directDownload, setDirectDownload] = useState<string | null>(null);

  // Alias / temp email planner
  const [baseEmail, setBaseEmail] = useState("");
  const [aliasDomain, setAliasDomain] = useState("example.com");
  const [aliasEmail, setAliasEmail] = useState<string | null>(null);
  const [aliasInfo, setAliasInfo] = useState<string | null>(null);

  // Tax calculator
  const [taxBase, setTaxBase] = useState<string>("");
  const [taxRate, setTaxRate] = useState<string>("11");
  const [taxMode, setTaxMode] = useState<"exclusive" | "inclusive">("exclusive");
  const [taxOutput, setTaxOutput] = useState<string>("");

  // Interest calculator
  const [princ, setPrinc] = useState<string>("");
  const [rate, setRate] = useState<string>("10");
  const [years, setYears] = useState<string>("1");
  const [compoundPerYear, setCompoundPerYear] = useState<number>(12);
  const [interestOutput, setInterestOutput] = useState<string>("");

  // Simple statistics
  const [statsInput, setStatsInput] = useState<string>("");
  const [statsOutput, setStatsOutput] = useState<string>("");

  // WhatsApp Direct Link
  const [waPhone, setWaPhone] = useState<string>("");
  const [waMessage, setWaMessage] = useState<string>("");
  const [waLink, setWaLink] = useState<string>("");

  // Password & Token Generator
  const [pwLength, setPwLength] = useState<number>(16);
  const [pwUpper, setPwUpper] = useState<boolean>(true);
  const [pwLower, setPwLower] = useState<boolean>(true);
  const [pwNumber, setPwNumber] = useState<boolean>(true);
  const [pwSymbol, setPwSymbol] = useState<boolean>(false);
  const [pwOutput, setPwOutput] = useState<string>("");

  // Image Metadata Remover
  const [metaFiles, setMetaFiles] = useState<File[]>([]);
  const [metaInfo, setMetaInfo] = useState<string | null>(null);

  // Token Generator
  const [tokenBytes, setTokenBytes] = useState<number>(32);
  const [tokenFormat, setTokenFormat] = useState<"hex" | "base64" | "urlsafe">(
    "hex"
  );
  const [tokenOutput, setTokenOutput] = useState<string>("");

  // Helpers for password & token
  const cryptoRandom = (maxExclusive: number) => {
    const buf = new Uint32Array(1);
    let rand = 0;
    do {
      window.crypto.getRandomValues(buf);
      rand = buf[0] / 2 ** 32;
    } while (rand === 1);
    return Math.floor(rand * maxExclusive);
  };

  const shuffleInPlace = (arr: string[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = cryptoRandom(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  const generatePassword = () => {
    const length = Math.min(Math.max(pwLength, 6), 128);
    const U = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude easily confused chars
    const L = "abcdefghijkmnopqrstuvwxyz"; // exclude l
    const N = "23456789"; // exclude 0,1
    const S = "!@#$%^&*()-_=+[]{};:,.?";

    let pool = "";
    const must: string[] = [];
    if (pwUpper) {
      pool += U;
      must.push(U[cryptoRandom(U.length)]);
    }
    if (pwLower) {
      pool += L;
      must.push(L[cryptoRandom(L.length)]);
    }
    if (pwNumber) {
      pool += N;
      must.push(N[cryptoRandom(N.length)]);
    }
    if (pwSymbol) {
      pool += S;
      must.push(S[cryptoRandom(S.length)]);
    }

    if (!pool) {
      setPwOutput("");
      return;
    }

    const out: string[] = [...must];
    while (out.length < length) {
      out.push(pool[cryptoRandom(pool.length)]);
    }
    shuffleInPlace(out);
    setPwOutput(out.join(""));
  };

  const copyPw = async () => {
    if (!pwOutput) return;
    try {
      await navigator.clipboard.writeText(pwOutput);
      setBulkInfo("Password disalin ke clipboard.");
    } catch {
      setBulkInfo("Gagal menyalin password. Salin manual.");
    }
  };

  const bytesToBase64 = (bytes: Uint8Array) => {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };

  const generateToken = () => {
    const n = Math.min(Math.max(tokenBytes, 4), 128);
    const bytes = new Uint8Array(n);
    window.crypto.getRandomValues(bytes);
    if (tokenFormat === "hex") {
      setTokenOutput(Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""));
    } else if (tokenFormat === "base64") {
      setTokenOutput(bytesToBase64(bytes));
    } else {
      const b64 = bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      setTokenOutput(b64);
    }
  };

  const copyToken = async () => {
    if (!tokenOutput) return;
    try {
      await navigator.clipboard.writeText(tokenOutput);
      setBulkInfo("Token disalin ke clipboard.");
    } catch {
      setBulkInfo("Gagal menyalin token. Salin manual.");
    }
  };

  const onMetaFilesChange = (fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    setMetaFiles(arr);
  };

  const runMetaClean = async () => {
    if (!metaFiles.length) return;
    setMetaInfo(null);
    try {
      for (const file of metaFiles) {
        const dataUrl = await fileToDataUrl(file);
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Gagal memuat gambar."));
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas tidak tersedia.");
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // pilih format keluaran sesuai asli (fallback ke PNG)
        let mime = file.type && file.type.startsWith("image/") ? file.type : "image/png";
        if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") {
          mime = "image/png";
        }

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), mime, mime === "image/jpeg" ? 0.92 : undefined);
        });
        if (!blob) continue;
        const base = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
        const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
        downloadBlob(blob, `${base}-clean.${ext}`);
      }
      setMetaInfo(`${metaFiles.length} gambar dibersihkan dari metadata dan diunduh.`);
    } catch (err: any) {
      console.error(err);
      setMetaInfo(err?.message || "Gagal menghapus metadata gambar.");
    }
  };

  // use centralized sanitizer from utils

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(
      n
    );

  const runTaxCalc = () => {
    const base = parseFloat(sanitizeNumberString(taxBase || ""));
    const r = parseFloat(sanitizeNumberString(taxRate || ""));
    if (isNaN(base) || isNaN(r)) {
      setTaxOutput("Masukkan nilai dasar dan tarif pajak yang valid.");
      return;
    }
    const rp = r / 100;
    if (taxMode === "exclusive") {
      const pajak = base * rp;
      const total = base + pajak;
      setTaxOutput(
        `Dasar: ${formatCurrency(base)}\nPajak (${r}%): ${formatCurrency(pajak)}\nTotal: ${formatCurrency(total)}`
      );
    } else {
      const pajak = base - base / (1 + rp);
      const dasar = base - pajak;
      setTaxOutput(
        `Total (inklusif): ${formatCurrency(base)}\nTermasuk Pajak (${r}%): ${formatCurrency(pajak)}\nDasar sebelum pajak: ${formatCurrency(dasar)}`
      );
    }
  };

  const runInterestCalc = () => {
    const P = parseFloat(sanitizeNumberString(princ || ""));
    const r = parseFloat(sanitizeNumberString(rate || "")) / 100;
    const t = parseFloat(sanitizeNumberString(years || ""));
    if (isNaN(P) || isNaN(r) || isNaN(t)) {
      setInterestOutput("Isi pokok, bunga tahunan (%), dan durasi (tahun) dengan benar.");
      return;
    }
    const simpleInterest = P * r * t;
    const A_simple = P + simpleInterest;
    const n = compoundPerYear > 0 ? compoundPerYear : 1;
    const A_comp = P * Math.pow(1 + r / n, n * t);
    const compInterest = A_comp - P;
    setInterestOutput(
      `Sederhana: Bunga = ${formatCurrency(simpleInterest)} | Akhir = ${formatCurrency(
        A_simple
      )}\nMajemuk (${n}x/tahun): Bunga = ${formatCurrency(compInterest)} | Akhir = ${formatCurrency(
        A_comp
      )}`
    );
  };

  const runStats = () => {
    const nums = (statsInput || "")
      .split(/[^0-9.+\-eE]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
    if (!nums.length) {
      setStatsOutput("Tidak ada angka valid yang ditemukan.");
      return;
    }
    const sorted = [...nums].sort((a, b) => a - b);
    const count = nums.length;
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const median =
      count % 2 === 1
        ? sorted[(count - 1) / 2]
        : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const variance =
      nums.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / count;
    const stdev = Math.sqrt(variance);
    setStatsOutput(
      `n = ${count}\nΣ = ${sum}\nmean = ${mean}\nmedian = ${median}\nmin = ${min}\nmax = ${max}\nstdev(populasi) = ${stdev}`
    );
  };

  const buildWa = () => {
    const phone = sanitizePhone(waPhone);
    const msg = sanitizeText(waMessage);
    if (!phone) {
      setWaLink("");
      return;
    }
    const link = `https://wa.me/${phone.replace(/^\+/, "")}${
      msg ? `?text=${encodeURIComponent(msg)}` : ""
    }`;
    setWaLink(link);
  };

  const copyWaLink = async () => {
    if (!waLink) return;
    try {
      await navigator.clipboard.writeText(waLink);
      setAliasInfo("Tautan WA disalin ke clipboard.");
    } catch {
      setAliasInfo("Gagal menyalin tautan. Salin manual.");
    }
  };
  const toJsonPretty = () => {
    try {
      const obj = JSON.parse(textInput);
      setJsonPretty(JSON.stringify(obj, null, 2));
    } catch {
      setJsonPretty("Input bukan JSON yang valid.");
    }
  };

  const toBase64 = () => {
    const safe = sanitizeText(textInput);
    setBase64(btoa(unescape(encodeURIComponent(safe))));
  };

  const fromBase64 = () => {
    try {
      const decoded = decodeURIComponent(escape(atob(base64)));
      setTextInput(sanitizeText(decoded));
    } catch {
      // ignore
    }
  };

  const runBulkOp = (
    kind:
      | "unique"
      | "sortAsc"
      | "sortDesc"
      | "shuffle"
      | "number"
      | "prefix"
      | "suffix"
  ) => {
    if (!bulkInput.trim()) return;
    const lines = bulkInput.split(/\r?\n/);
    let resultLines = [...lines];
    let info = "";

    if (kind === "unique") {
      const seen = new Set<string>();
      resultLines = [];
      for (const line of lines) {
        if (!seen.has(line)) {
          seen.add(line);
          resultLines.push(line);
        }
      }
      info = "Duplikat baris dihapus, urutan pertama dipertahankan.";
    } else if (kind === "sortAsc" || kind === "sortDesc") {
      resultLines = [...lines].sort((a, b) => a.localeCompare(b));
      if (kind === "sortDesc") resultLines.reverse();
      info = kind === "sortAsc" ? "Baris diurutkan A→Z." : "Baris diurutkan Z→A.";
    } else if (kind === "shuffle") {
      for (let i = resultLines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resultLines[i], resultLines[j]] = [resultLines[j], resultLines[i]];
      }
      info = "Urutan baris diacak.";
    } else if (kind === "number") {
      resultLines = lines.map((line, idx) => `${idx + 1}. ${line}`);
      info = "Baris diberi penomoran.";
    } else if (kind === "prefix") {
      const prefix = "[x] ";
      resultLines = lines.map((line) => `${prefix}${line}`);
      info = "Prefix sederhana ditambahkan ke setiap baris.";
    } else if (kind === "suffix") {
      const suffix = " #";
      resultLines = lines.map((line) => `${line}${suffix}`);
      info = "Suffix sederhana ditambahkan ke setiap baris.";
    }

    setBulkOutput(resultLines.join("\n"));
    setBulkInfo(info);
  };

  const analyzeMedia = () => {
    setMediaInfo(null);
    setDirectDownload(null);
    const safe = sanitizeUrl(mediaUrl);
    if (!safe) {
      setMediaInfo("URL tidak valid atau tidak didukung. Hanya http/https yang diperbolehkan.");
      return;
    }

    try {
      const u = new URL(safe);
      const lower = u.pathname.toLowerCase();
      const isDirect = /\.(mp4|webm|mov|m4a|mp3|wav)$/i.test(lower);

      if (isDirect) {
        setDirectDownload(safe);
        setMediaInfo(
          "Link ini terlihat seperti berkas langsung. Anda bisa mengunduhnya dengan tombol di bawah."
        );
        return;
      }

      const host = u.hostname.replace(/^www\./, "");
      if (
        [
          "youtube.com",
          "youtu.be",
          "tiktok.com",
          "instagram.com",
          "twitter.com",
          "x.com",
        ].includes(host)
      ) {
        setMediaInfo(
          "Untuk menghormati kebijakan dan DRM masing-masing platform, Gamato Piranti tidak mengunduh langsung dari layanan streaming. Anda bisa menggunakan tool seperti yt-dlp di perangkat Anda dengan perintah: yt-dlp \"URL\"."
        );
      } else {
        setMediaInfo(
          "Link ini bukan berkas video langsung. Jika layanan menyediakan tombol unduh resmi, gunakan opsi tersebut untuk mengunduh."
        );
      }
    } catch {
      setMediaInfo("URL tidak valid. Periksa kembali penulisan link.");
    }
  };

  const generateAlias = () => {
    const trimmed = baseEmail.trim();
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}`;

    let alias = "";
    if (trimmed && trimmed.includes("@")) {
      const [local, domain] = trimmed.split("@");
      alias = `${local}+gp-${stamp}@${domain}`;
      setAliasInfo("Alias bergaya plus-address dibuat dari email utama Anda.");
    } else {
      const rand = Math.random().toString(36).slice(2, 8);
      alias = `gp-${rand}-${stamp}@${aliasDomain}`;
      setAliasInfo(
        "Alamat acak disiapkan. Gunakan dengan layanan temp-mail atau alias pilihan Anda."
      );
    }

    setAliasEmail(alias);
  };

  const copyAlias = async () => {
    if (!aliasEmail) return;
    try {
      await navigator.clipboard.writeText(aliasEmail);
      setAliasInfo("Alamat disalin ke clipboard.");
    } catch {
      setAliasInfo("Gagal menyalin ke clipboard. Salin manual secara biasa.");
    }
  };

  return (
    <Card
      title="Rak Utilitas"
      description="Kumpulan alat kecil untuk teks, data, link, dan email."
    >
      <div className="space-y-4 text-xs">
        <div className="flex gap-2 overflow-x-auto rounded-xl bg-slate-50 p-1 font-medium text-slate-600 flex-nowrap whitespace-nowrap md:flex-wrap md:whitespace-normal md:overflow-x-visible snap-x snap-mandatory">
          {(
            [
              ["json", "JSON & Base64"],
              ["bulk", "Bulk teks/data"],
              ["media", "Link & media"],
              ["alias", "Alias email"],
              ["tax", "Kalkulator pajak"],
              ["interest", "Hitung bunga"],
              ["stats", "Statistik sederhana"],
              ["wa", "WA Link"],
              ["pass", "Password & Token"],
              ["meta", "Hapus metadata"],
            ] as [
              | "json"
              | "bulk"
              | "media"
              | "alias"
              | "tax"
              | "interest"
              | "stats"
              | "wa"
              | "pass"
              | "meta",
              string
            ][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 transition shrink-0 snap-start",
                tab === id ? "bg-white shadow-sm" : "hover:bg-slate-100"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "json" && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Input teks / JSON</Label>
              <textarea
                className="h-40 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Tempel teks, JSON, atau data lainnya di sini."
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={toJsonPretty}>
                  Rapikan JSON
                </Button>
                <Button variant="ghost" onClick={toBase64}>
                  Ke Base64
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>JSON rapi</Label>
              <textarea
                className="h-40 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                value={jsonPretty}
                onChange={(e) => setJsonPretty(e.target.value)}
                placeholder="Hasil JSON yang sudah diformat akan muncul di sini."
              />
            </div>
            <div className="space-y-2">
              <Label>Base64</Label>
              <textarea
                className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                value={base64}
                onChange={(e) => setBase64(e.target.value)}
                placeholder="Encode/decode data teks ke Base64."
              />
              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={fromBase64} className="flex-1">
                  Dari Base64
                </Button>
                <div className="flex-1 text-[10px] text-slate-500">
                  Cocok untuk testing API, token, dan konfigurasi ringan.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "bulk" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <Label>Bulk Text & Data Lab</Label>
              <span className="text-[10px] text-slate-400">List, ID, email, dll.</span>
            </div>
            <textarea
              className="h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="Satu item per baris. Contoh: daftar email, ID, atau nama."
            />
            <div className="flex flex-wrap gap-1.5">
              <Button variant="ghost" onClick={() => runBulkOp("unique")}>
                Hapus duplikat
              </Button>
              <Button variant="ghost" onClick={() => runBulkOp("sortAsc")}>
                Urut A→Z
              </Button>
              <Button variant="ghost" onClick={() => runBulkOp("sortDesc")}>
                Urut Z→A
              </Button>
              <Button variant="ghost" onClick={() => runBulkOp("shuffle")}>
                Acak
              </Button>
              <Button variant="ghost" onClick={() => runBulkOp("number")}>
                Nomori baris
              </Button>
              <Button variant="ghost" onClick={() => runBulkOp("prefix")}>
                Tambah prefix
              </Button>
              <Button variant="ghost" onClick={() => runBulkOp("suffix")}>
                Tambah suffix
              </Button>
            </div>
            <textarea
              className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              value={bulkOutput}
              onChange={(e) => setBulkOutput(e.target.value)}
              placeholder="Hasil transformasi akan muncul di sini."
            />
            {bulkInfo && (
              <p className="text-[10px] text-slate-500">{bulkInfo}</p>
            )}
          </div>
        )}

        {tab === "media" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <Label>Helper link & media</Label>
            <input
              type="url"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="Tempel link video/file (mp4, webm, dll)."
            />
            <Button variant="ghost" onClick={analyzeMedia}>
              Analisis link
            </Button>
            {mediaInfo && (
              <p className="text-[10px] text-slate-600">{mediaInfo}</p>
            )}
            {directDownload && (
              <a
                href={directDownload}
                download
                className="mt-1 inline-flex justify-between rounded-xl border border-slate-200 bg-slate-900 px-3 py-1.5 text-[10px] font-medium text-slate-50 shadow-sm hover:bg-slate-800"
              >
                <span>Unduh langsung</span>
                <span className="text-slate-300">Buka di tab baru jika gagal</span>
              </a>
            )}
            <p className="mt-2 text-[10px] text-slate-500">
              Untuk platform streaming besar, gunakan tool resmi mereka atau utilitas baris perintah seperti <code className="rounded bg-slate-100 px-1">yt-dlp "URL"</code> di perangkat Anda.
            </p>
          </div>
        )}

        {tab === "alias" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <Label>Alias & temp email planner</Label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              value={baseEmail}
              onChange={(e) => setBaseEmail(sanitizeText(e.target.value))}
              placeholder="Email utama (opsional, untuk plus-address)"
            />
            <div className="grid gap-2 text-[11px] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <Input
                label="Domain alternatif"
                value={aliasDomain}
                onChange={(e) => setAliasDomain(sanitizeText(e.target.value))}
                placeholder="contoh: inbox.mydomain.com"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={generateAlias} className="flex-1">
                Buat alamat
              </Button>
              <Button
                variant="ghost"
                onClick={copyAlias}
                disabled={!aliasEmail}
                className="flex-1"
              >
                Salin
              </Button>
            </div>
            <div className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] text-slate-50">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                Alamat yang disiapkan
              </p>
              <p className="mt-1 break-all text-[11px]">
                {aliasEmail || "Belum ada. Klik \"Buat alamat\" untuk menghasilkan."}
              </p>
            </div>
            {aliasInfo && (
              <p className="text-[10px] text-slate-500">{aliasInfo}</p>
            )}
            <p className="mt-1 text-[10px] text-slate-500">
              Gamato Piranti tidak membuat inbox otomatis. Gunakan alamat ini bersama layanan temp-mail, alias, atau forwarder pilihan Anda.
            </p>
          </div>
        )}

        {tab === "tax" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <Label>Kalkulator Pajak</Label>
              <span className="text-[10px] text-slate-400">Eksklusif/Inklusif</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Nilai dasar (Rp)"
                value={taxBase}
                onChange={(e) => setTaxBase(e.target.value)}
                placeholder="contoh: 1000000"
              />
              <Input
                label="Tarif pajak (%)"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="contoh: 11"
              />
              <div className="space-y-1.5">
                <Label>Mode hitung</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTaxMode("exclusive")}
                    className={cn(
                      "rounded-full px-2 py-0.5",
                      taxMode === "exclusive"
                        ? "bg-slate-900 text-slate-50"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    Eksklusif (belum termasuk pajak)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxMode("inclusive")}
                    className={cn(
                      "rounded-full px-2 py-0.5",
                      taxMode === "inclusive"
                        ? "bg-slate-900 text-slate-50"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    Inklusif (sudah termasuk pajak)
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={runTaxCalc}>Hitung</Button>
              <p className="text-[10px] text-slate-500">
                Hasil memakai format mata uang IDR.
              </p>
            </div>
            {taxOutput && (
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[11px] text-slate-800">
                {taxOutput}
              </pre>
            )}
          </div>
        )}

        {tab === "interest" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <Label>Hitung Bunga</Label>
              <span className="text-[10px] text-slate-400">Sederhana & majemuk</span>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                label="Pokok (Rp)"
                value={princ}
                onChange={(e) => setPrinc(e.target.value)}
                placeholder="contoh: 5000000"
              />
              <Input
                label="Bunga tahunan (%)"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="contoh: 10"
              />
              <Input
                label="Durasi (tahun)"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="contoh: 3"
              />
              <Select
                label="Frekuensi majemuk"
                value={compoundPerYear}
                onChange={(e) => setCompoundPerYear(parseInt(e.target.value, 10) || 1)}
              >
                <option value={1}>Tahunan (1x)</option>
                <option value={2}>Semesteran (2x)</option>
                <option value={4}>Kuartalan (4x)</option>
                <option value={12}>Bulanan (12x)</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={runInterestCalc}>Hitung</Button>
              <p className="text-[10px] text-slate-500">Nilai indikatif.</p>
            </div>
            {interestOutput && (
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[11px] text-slate-800">
                {interestOutput}
              </pre>
            )}
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <Label>Statistik Sederhana</Label>
              <span className="text-[10px] text-slate-400">mean, median, min, max</span>
            </div>
            <Textarea
              rows={5}
              value={statsInput}
              onChange={(e) => setStatsInput(e.target.value)}
              placeholder="Tempel angka dipisah spasi, koma, atau baris baru."
            />
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={runStats}>Analisis</Button>
              <p className="text-[10px] text-slate-500">
                Hanya angka yang dihitung, karakter lain diabaikan.
              </p>
            </div>
            {statsOutput && (
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[11px] text-slate-800">
                {statsOutput}
              </pre>
            )}
          </div>
        )}

        {tab === "wa" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <Label>WhatsApp Direct Link</Label>
              <span className="text-[10px] text-slate-400">Tanpa menyimpan kontak</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Nomor telepon (dengan kode negara, mis. +62...)"
                value={waPhone}
                onChange={(e) => setWaPhone(sanitizePhone(e.target.value))}
                placeholder="Contoh: +62812xxxxxxx"
              />

              <div className="space-y-1.5">
                <Label>Template pesan</Label>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const name = prompt('Nama penerima (opsional):') || '';
                      const safe = sanitizeText(name);
                      setWaMessage(
                        (safe ? `Halo ${safe}, ` : 'Halo, ') +
                          'apa kabar? Saya ingin menghubungi terkait sesuatu.'
                      );
                    }}
                  >
                    Salam
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const inv = prompt('Nomor invoice:') || '';
                      const amt = prompt('Jumlah (opsional):') || '';
                      const safeInv = sanitizeText(inv);
                      const safeAmt = sanitizeText(amt);
                      setWaMessage(
                        `Halo, ini tindak lanjut terkait invoice ${safeInv}. ${
                          safeAmt ? `Total ${safeAmt}. ` : ''
                        }Mohon konfirmasi penerimaan atau bila ada pertanyaan.`
                      );
                    }}
                  >
                    Follow-up
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const inv = prompt('Nomor invoice/kode transaksi:') || '';
                      const safeInv = sanitizeText(inv);
                      setWaMessage(
                        `Halo, pembayaran untuk ${safeInv} telah kami terima. Terima kasih! Jika ada yang perlu dibantu lagi, kabari ya.`
                      );
                    }}
                  >
                    Konfirmasi bayar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const addr = prompt('Alamat/tautan lokasi:') || '';
                      const time = prompt('Estimasi waktu (opsional):') || '';
                      const safeAddr = sanitizeText(addr);
                      const safeTime = sanitizeText(time);
                      setWaMessage(
                        `Halo, berikut alamat/lokasi tujuan: ${safeAddr}. ${
                          safeTime ? `Estimasi waktu: ${safeTime}. ` : ''
                        }Terima kasih.`
                      );
                    }}
                  >
                    Kirim alamat
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const date = prompt('Tanggal (mis. 12/03/2026):') || '';
                      const hour = prompt('Jam (opsional):') || '';
                      const topic = prompt('Topik/agenda (opsional):') || '';
                      const safeDate = sanitizeText(date);
                      const safeHour = sanitizeText(hour);
                      const safeTopic = sanitizeText(topic);
                      setWaMessage(
                        `Halo, mengingatkan jadwal pada ${safeDate}${
                          safeHour ? ` pukul ${safeHour}` : ''
                        }${safeTopic ? ` untuk ${safeTopic}` : ''}. Terima kasih.`
                      );
                    }}
                  >
                    Reminder
                  </Button>
                </div>
              </div>
            </div>

            <Textarea
              label="Pesan (opsional)"
              rows={3}
              value={waMessage}
              onChange={(e) => setWaMessage(sanitizeText(e.target.value))}
              placeholder="Tulis pesan Anda di sini, atau gunakan template di atas."
            />
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={buildWa}>Buat tautan</Button>
              <Button variant="ghost" onClick={copyWaLink} disabled={!waLink}>
                Salin tautan
              </Button>
            </div>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex justify-between rounded-xl border border-slate-200 bg-slate-900 px-3 py-1.5 text-[10px] font-medium text-slate-50 shadow-sm hover:bg-slate-800"
              >
                <span>Buka chat</span>
                <span className="text-slate-300">wa.me</span>
              </a>
            )}
          </div>
        )}

        {tab === "pass" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <Label>Password & Token Generator</Label>
              <span className="text-[10px] text-slate-400">Web Crypto aman</span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Panjang password"
                type="number"
                min={6}
                max={128}
                value={pwLength}
                onChange={(e) => setPwLength(parseInt(e.target.value, 10) || 16)}
              />
              <div className="space-y-1.5">
                <Label>Karakter yang digunakan</Label>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={pwUpper} onChange={(e) => setPwUpper(e.target.checked)} />
                    <span>Huruf besar</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={pwLower} onChange={(e) => setPwLower(e.target.checked)} />
                    <span>Huruf kecil</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={pwNumber} onChange={(e) => setPwNumber(e.target.checked)} />
                    <span>Angka</span>
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={pwSymbol} onChange={(e) => setPwSymbol(e.target.checked)} />
                    <span>Simbol</span>
                  </label>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button variant="ghost" onClick={generatePassword} className="flex-1">Buat password</Button>
                <Button variant="ghost" onClick={copyPw} disabled={!pwOutput} className="flex-1">Salin</Button>
              </div>
            </div>

            <Input
              label="Password"
              value={pwOutput}
              onChange={(e) => setPwOutput(e.target.value)}
              placeholder="Klik 'Buat password' untuk membuat kata sandi acak."
            />

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Panjang token (byte)"
                type="number"
                min={4}
                max={128}
                value={tokenBytes}
                onChange={(e) => setTokenBytes(parseInt(e.target.value, 10) || 32)}
              />
              <Select
                label="Format token"
                value={tokenFormat}
                onChange={(e) => setTokenFormat((e.target.value as any) || "hex")}
              >
                <option value="hex">Hex</option>
                <option value="base64">Base64</option>
                <option value="urlsafe">URL-safe Base64</option>
              </Select>
              <div className="flex items-end gap-2">
                <Button variant="ghost" onClick={generateToken} className="flex-1">Buat token</Button>
                <Button variant="ghost" onClick={copyToken} disabled={!tokenOutput} className="flex-1">Salin</Button>
              </div>
            </div>

            <Textarea
              label="Token"
              rows={3}
              value={tokenOutput}
              onChange={(e) => setTokenOutput(e.target.value)}
              placeholder="Klik 'Buat token' untuk menghasilkan token acak."
            />

            <p className="text-[10px] text-slate-500">
              Disarankan menyimpan password/token secara aman. Gamato Piranti tidak mengirimkan data ini ke server mana pun.
            </p>
          </div>
        )}

        {tab === "meta" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <Label>Hapus Metadata Gambar</Label>
              <span className="text-[10px] text-slate-400">Privacy tool</span>
            </div>
            <div className="space-y-2">
              <Label>Pilih gambar</Label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onMetaFilesChange(e.target.files)}
                className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-50 hover:file:bg-slate-800"
              />
              {metaFiles.length > 0 && (
                <p className="text-[11px] text-slate-600">{metaFiles.length} gambar dipilih.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={runMetaClean} disabled={!metaFiles.length}>Bersihkan metadata</Button>
              <p className="text-[10px] text-slate-500">EXIF/metadata dihapus dengan re-encode via canvas, gambar diunduh ulang.</p>
            </div>
            {metaInfo && (
              <p className="text-[10px] text-slate-600">{metaInfo}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// ---------- Static Pages: Privacy & Terms ----------

const PrivacyPage: React.FC = () => (
  <Card title="Privacy Policy for Gamato Piranti" description="Terakhir Diperbarui: 2 Maret 2026">
    <div className="space-y-3 text-[13px] leading-relaxed text-slate-700">
      <p>
        Di Gamato Piranti, yang beralamat di https://gamato-piranti.vercel.app/, salah satu prioritas utama kami adalah privasi pengunjung kami. Dokumen Kebijakan Privasi ini berisi jenis informasi yang dikumpulkan dan dicatat oleh Gamato Piranti dan bagaimana kami menggunakannya.
      </p>
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">1. Informasi yang Kami Kumpulkan</p>
        <p>
          Sebagai Digital Tool Studio, sebagian besar alat kami bekerja di sisi klien (browser). Kami tidak secara sengaja mengumpulkan data pribadi sensitif kecuali jika Anda memberikannya secara sukarela melalui formulir kontak.
        </p>
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">2. Log Files & Analytics</p>
        <p>
          Gamato Piranti mengikuti prosedur standar penggunaan file log. Informasi yang dikumpulkan termasuk alamat protokol internet (IP), jenis browser, Penyedia Layanan Internet (ISP), stempel tanggal dan waktu, serta halaman rujukan. Ini dilakukan melalui infrastruktur Vercel untuk analisis performa web.
        </p>
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">3. Keamanan Data (WUG Secure Standard)</p>
        <p>
          Kami menerapkan sistem keamanan WUG Secure System untuk memastikan bahwa setiap input data pada tools kami diproses dengan enkripsi standar dan tidak disalahgunakan oleh pihak ketiga.
        </p>
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">4. Kebijakan Pihak Ketiga</p>
        <p>
          Kebijakan Privasi Gamato Piranti tidak berlaku untuk pengiklan atau situs web lain. Kami menyarankan Anda untuk berkonsultasi dengan Kebijakan Privasi masing-masing dari server pihak ketiga tersebut untuk informasi lebih rinci.
        </p>
      </div>
      <div className="pt-2">
        <a href="#/" className="text-xs font-medium text-slate-700 underline hover:text-slate-900">Kembali ke beranda</a>
      </div>
    </div>
  </Card>
);

const TermsPage: React.FC = () => (
  <Card title="Terms of Service for Gamato Piranti" description="Terakhir Diperbarui: 2 Maret 2026">
    <div className="space-y-3 text-[13px] leading-relaxed text-slate-700">
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">1. Penerimaan Ketentuan</p>
        <p>
          Dengan mengakses situs web ini, kami menganggap Anda menerima syarat dan ketentuan ini secara penuh. Jangan terus menggunakan Gamato Piranti jika Anda tidak menerima semua syarat dan ketentuan yang tercantum di halaman ini.
        </p>
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">2. Lisensi Penggunaan</p>
        <p>
          Gamato Piranti memberikan izin untuk menggunakan alat digital yang tersedia untuk penggunaan pribadi maupun komersial ringan. Namun, Anda dilarang:
        </p>
        <ul className="list-disc pl-5">
          <li>Menyalin atau memodifikasi materi tanpa izin.</li>
          <li>Menggunakan tools untuk tujuan ilegal atau melanggar hukum.</li>
          <li>Melakukan tindakan yang merusak integritas infrastruktur server kami.</li>
        </ul>
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">3. Batasan Tanggung Jawab</p>
        <p>
          Semua alat di Gamato Piranti disediakan "sebagaimana adanya" (as is). Kami tidak memberikan jaminan bahwa alat akan selalu bebas dari kesalahan atau gangguan. Gamato Piranti tidak bertanggung jawab atas kerugian yang timbul dari penggunaan atau ketidakmampuan menggunakan layanan kami.
        </p>
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-900">4. Perubahan Layanan</p>
        <p>
          Sebagai studio inovasi digital, kami berhak menambah atau menghapus fitur/tools tanpa pemberitahuan sebelumnya demi pengembangan kualitas layanan.
        </p>
      </div>
      <div className="pt-2">
        <a href="#/" className="text-xs font-medium text-slate-700 underline hover:text-slate-900">Kembali ke beranda</a>
      </div>
    </div>
  </Card>
);

// ---------- Layout & App Shell ----------

type SectionId = "qr" | "pdf" | "doc" | "img" | "util";

const AppHeader: React.FC<{
  current: SectionId;
  onChange: (id: SectionId) => void;
}> = ({ current, onChange }) => {
  const [openGroup, setOpenGroup] = useState<
    null | "kode" | "dokumen" | "gambar" | "util"
  >(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);

  // Close desktop dropdown when clicking outside nav
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (navRef.current && !navRef.current.contains(target)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prevBody || "";
      document.documentElement.style.overflow = prevHtml || "";
    }
    return () => {
      document.body.style.overflow = prevBody || "";
      document.documentElement.style.overflow = prevHtml || "";
    };
  }, [mobileOpen]);

  const navButtonCls = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase transition",
      active
        ? "bg-slate-900 text-slate-50 shadow-sm"
        : "text-slate-600 hover:bg-slate-100"
    );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-slate-50 shadow-sm">
            <span className="text-[14px] font-semibold">G</span>
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold tracking-tight text-slate-900">
              Gamato Piranti
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Digital Tool Studio
            </p>
          </div>
        </div>

        {/* Desktop nav (center) */}
        <nav ref={navRef} className="relative hidden items-center justify-center md:flex">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-2 py-1 text-[11px] shadow-sm">
            {/* Kode */}
            <div className="relative">
              <button
                type="button"
                className={navButtonCls(openGroup === "kode" || current === "qr")}
                onClick={() => setOpenGroup((prev) => (prev === "kode" ? null : "kode"))}
              >
                Kode
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {openGroup === "kode" && (
                <div className="absolute left-1/2 top-[110%] z-[200] w-[min(92vw,340px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-[12px] leading-6 shadow-2xl">
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onChange("qr");
                        setOpenGroup(null);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    >
                      <span>QR & Barcode Studio</span>
                      <span className="text-[9px] text-slate-400">Utama</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dokumen */}
            <div className="relative">
              <button
                type="button"
                className={navButtonCls(openGroup === "dokumen" || current === "pdf" || current === "doc")}
                onClick={() => setOpenGroup((prev) => (prev === "dokumen" ? null : "dokumen"))}
              >
                Dokumen
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {openGroup === "dokumen" && (
                <div className="absolute left-1/2 top-[110%] z-[200] w-[min(92vw,380px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-[12px] leading-6 shadow-2xl">
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onChange("pdf");
                        setOpenGroup(null);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    >
                      <span>PDF Lab – Suite</span>
                      <span className="text-[9px] text-slate-400">Toolkit lengkap</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange("doc");
                        setOpenGroup(null);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    >
                      <span>Doc Studio</span>
                      <span className="text-[9px] text-slate-400">.docx & teks</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Gambar */}
            <div className="relative">
              <button
                type="button"
                className={navButtonCls(openGroup === "gambar" || current === "img")}
                onClick={() => setOpenGroup((prev) => (prev === "gambar" ? null : "gambar"))}
              >
                Gambar
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {openGroup === "gambar" && (
                <div className="absolute left-1/2 top-[110%] z-[200] w-[min(92vw,340px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-[12px] leading-6 shadow-2xl">
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onChange("img");
                        setOpenGroup(null);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    >
                      <span>Image Lab</span>
                      <span className="text-[9px] text-slate-400">Kompres & ubah</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Utilitas */}
            <div className="relative">
              <button
                type="button"
                className={navButtonCls(openGroup === "util" || current === "util")}
                onClick={() => setOpenGroup((prev) => (prev === "util" ? null : "util"))}
              >
                Utilitas
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {openGroup === "util" && (
                <div className="absolute left-1/2 top-[110%] z-[200] w-[min(92vw,380px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-[12px] leading-6 shadow-2xl">
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onChange("util");
                        setOpenGroup(null);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                    >
                      <span>Rak Utilitas</span>
                      <span className="text-[9px] text-slate-400">JSON, bulk & link</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Right side: desktop hint + mobile burger */}
        <div className="flex items-center gap-2">
          <div className="hidden text-right text-[10px] text-slate-400 md:block">
            <p>Tanpa Login</p>
          </div>
          <button
            type="button"
            aria-label="Buka menu"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50 md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <span className="block h-0.5 w-5 bg-slate-900"></span>
            <span className="mt-1 block h-0.5 w-5 bg-slate-900"></span>
            <span className="mt-1 block h-0.5 w-5 bg-slate-900"></span>
          </button>
        </div>
      </div>

      {/* Mobile drawer (portal to body to avoid clipping by header/backdrop) */}
      {mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] md:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-slate-900/50"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-0 flex">
              <div className="ml-auto h-full w-full max-w-full overflow-y-auto bg-white p-0 shadow-xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
                  <p className="text-sm font-semibold text-slate-900">Menu</p>
                  <button
                    type="button"
                    aria-label="Tutup menu"
                    className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="block h-5 w-5">✕</span>
                  </button>
                </div>
                <div className="space-y-4 p-4 text-[13px]">
                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Kode</p>
                    <button
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        onChange("qr");
                        setMobileOpen(false);
                      }}
                    >
                      <span>QR & Barcode Studio</span>
                      {current === "qr" && <span className="text-[10px] text-slate-400">Aktif</span>}
                    </button>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Dokumen</p>
                    <div className="space-y-2">
                      <button
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          onChange("pdf");
                          setMobileOpen(false);
                        }}
                      >
                        <span>PDF Lab – Suite</span>
                        {current === "pdf" && <span className="text-[10px] text-slate-400">Aktif</span>}
                      </button>
                      <button
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          onChange("doc");
                          setMobileOpen(false);
                        }}
                      >
                        <span>Doc Studio</span>
                        {current === "doc" && <span className="text-[10px] text-slate-400">Aktif</span>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Gambar</p>
                    <button
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        onChange("img");
                        setMobileOpen(false);
                      }}
                    >
                      <span>Image Lab</span>
                      {current === "img" && <span className="text-[10px] text-slate-400">Aktif</span>}
                    </button>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Utilitas</p>
                    <button
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        onChange("util");
                        setMobileOpen(false);
                      }}
                    >
                      <span>Rak Utilitas</span>
                      {current === "util" && <span className="text-[10px] text-slate-400">Aktif</span>}
                    </button>
                  </div>

                  <div className="pt-2">
                    <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">Kebijakan</p>
                    <div className="flex gap-2">
                      <a
                        href="#/privacy"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-center text-[12px] text-slate-700 hover:bg-slate-50"
                        onClick={() => setMobileOpen(false)}
                      >
                        Privacy Policy
                      </a>
                      <a
                        href="#/terms"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-center text-[12px] text-slate-700 hover:bg-slate-50"
                        onClick={() => setMobileOpen(false)}
                      >
                        Terms
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};

export const App: React.FC = () => {
  const [route, setRoute] = useState<'home' | 'privacy' | 'terms'>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('/privacy')) return 'privacy';
    if (hash.startsWith('/terms')) return 'terms';
    return 'home';
  });

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('/privacy')) setRoute('privacy');
      else if (hash.startsWith('/terms')) setRoute('terms');
      else setRoute('home');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const [section, setSection] = useState<SectionId>("qr");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <AppHeader current={section} onChange={setSection} />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 pb-10">
        {route !== 'home' ? (
          route === 'privacy' ? (
            <PrivacyPage />
          ) : (
            <TermsPage />
          )
        ) : (
          <>
            <section className="rounded-2xl bg-slate-900 px-5 py-4 text-slate-50 shadow-lg shadow-slate-900/40 md:px-7 md:py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Studio alat digital
                  </p>
                  <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
                    Satu kanvas, banyak alat. Tanpa ribet.
                  </h1>
                  <p className="mt-1.5 max-w-xl text-[12px] text-slate-300">
                    Gamato Piranti merapikan pekerjaan harian: dari QR code, PDF, gambar, sampai dokumen .docx. Sederhana, modern, dan penuh alat yang benar-benar terpakai.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right text-[11px] text-slate-300">
                  <Badge>Browser Native</Badge>
                  <p>Semua diproses di perangkat Anda.</p>
                </div>
              </div>
            </section>

            {section === "qr" && <QRBarcodeStudio />}
            {section === "pdf" && <PdfTools />}
            {section === "doc" && <DocTools />}
            {section === "img" && <ImageTools />}
            {section === "util" && <UtilityShelf />}
          </>
        )}

        <footer className="mt-4 flex flex-col justify-between gap-3 border-t border-slate-200 pt-4 text-[11px] text-slate-500 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} WisDev | Gamato Piranti | Fokus ke utilitas.
          </p>
          <div className="flex items-center justify-center gap-4 text-center">
            <a href="#/privacy" className="hover:text-slate-700">Privacy Policy</a>
            <span className="text-slate-300">•</span>
            <a href="#/terms" className="hover:text-slate-700">Terms of Service</a>
          </div>
          <p className="text-slate-400">
            Dibangun dengan ❤ | Ditenagai oleh Vercel.
          </p>
        </footer>
      </main>
    </div>
  );
};

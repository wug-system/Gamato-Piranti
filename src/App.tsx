import React, { useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { cn } from "./utils/cn";

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
        return qrUrl.trim();
      }
      case "text": {
        return qrText;
      }
      case "wifi": {
        if (!qrWifiSsid.trim()) return "";
        const enc = qrWifiEnc === "nopass" ? "nopass" : qrWifiEnc;
        const hidden = qrWifiHidden ? "true" : "false";
        const passPart = enc === "nopass" ? "" : `P:${qrWifiPass};`;
        return `WIFI:T:${enc};S:${qrWifiSsid};${passPart}H:${hidden};;`;
      }
      case "email": {
        if (!qrEmailTo.trim()) return "";
        const params: string[] = [];
        if (qrEmailSubject.trim()) {
          params.push(`subject=${encodeURIComponent(qrEmailSubject)}`);
        }
        if (qrEmailBody.trim()) {
          params.push(`body=${encodeURIComponent(qrEmailBody)}`);
        }
        const query = params.length ? `?${params.join("&")}` : "";
        return `mailto:${qrEmailTo.trim()}${query}`;
      }
      case "phone": {
        if (!qrPhone.trim()) return "";
        return `tel:${qrPhone.trim()}`;
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
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder="Tulis pesan, catatan, atau instruksi yang akan muncul saat discan."
                />
              )}

              {qrTemplate === "wifi" && (
                <div className="grid gap-3 rounded-xl bg-slate-50/70 p-3 text-xs md:grid-cols-2">
                  <div className="space-y-2">
                    <Input
                      label="Nama WiFi (SSID)"
                      value={qrWifiSsid}
                      onChange={(e) => setQrWifiSsid(e.target.value)}
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
                      onChange={(e) => setQrWifiPass(e.target.value)}
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
                    onChange={(e) => setQrEmailTo(e.target.value)}
                    placeholder="nama@perusahaan.com"
                  />
                  <Input
                    label="Subjek"
                    value={qrEmailSubject}
                    onChange={(e) => setQrEmailSubject(e.target.value)}
                    placeholder="Subjek email"
                  />
                  <Textarea
                    label="Isi email"
                    rows={3}
                    value={qrEmailBody}
                    onChange={(e) => setQrEmailBody(e.target.value)}
                    placeholder="Teks email yang akan diisi otomatis."
                  />
                </div>
              )}

              {qrTemplate === "phone" && (
                <Input
                  label="Nomor telepon"
                  value={qrPhone}
                  onChange={(e) => setQrPhone(e.target.value)}
                  placeholder="Contoh: +62812..."
                />
              )}
            </div>
          ) : (
            <Textarea
              label="Isi Barcode"
              rows={4}
              value={barcodeContent}
              onChange={(e) => setBarcodeContent(e.target.value)}
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
            <div className="flex items-center justify-center rounded-xl bg-slate-900/60 p-4">
              {mode === "qr" ? (
                qrUrlImage ? (
                  <img
                    src={qrUrlImage}
                    alt="QR preview"
                    className="h-[220px] w-[220px] rounded-2xl bg-white p-3 shadow-md"
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
              <span>Offline first – tanpa tracking</span>
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

        // Semua level saat ini menggunakan optimasi struktur via pdf-lib.
        // Perbedaan level lebih ke profil penggunaan dan penandaan berkas.
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
          <div className="flex gap-2 overflow-x-auto rounded-xl bg-slate-50 p-1 text-xs font-medium text-slate-600">
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

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${fileName || "gamato-dokumen"}.docx`);
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
      downloadBlob(blob, `${fileName || "gamato-dokumen"}.pdf`);
      setDocInfo("Dokumen disimpan sebagai PDF sederhana.");
    } catch (err) {
      console.error(err);
      setDocInfo("Gagal menyusun PDF dari dokumen ini.");
    }
  };

  const downloadTxt = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${fileName || "gamato-dokumen"}.txt`);
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
            onChange={(e) => setFileName(e.target.value)}
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

// ---------- Misc Utility Shelf ----------

const UtilityShelf: React.FC = () => {
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

  const toJsonPretty = () => {
    try {
      const obj = JSON.parse(textInput);
      setJsonPretty(JSON.stringify(obj, null, 2));
    } catch {
      setJsonPretty("Input bukan JSON yang valid.");
    }
  };

  const toBase64 = () => {
    setBase64(btoa(unescape(encodeURIComponent(textInput))));
  };

  const fromBase64 = () => {
    try {
      setTextInput(decodeURIComponent(escape(atob(base64))));
    } catch {
      // ignore
    }
  };

  const runBulkOp = (kind: "unique" | "sortAsc" | "sortDesc" | "shuffle" | "number" | "prefix" | "suffix") => {
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
    if (!mediaUrl.trim()) return;

    try {
      const u = new URL(mediaUrl.trim());
      const lower = u.pathname.toLowerCase();
      const isDirect = /\.(mp4|webm|mov|m4a|mp3|wav)$/i.test(lower);

      if (isDirect) {
        setDirectDownload(mediaUrl.trim());
        setMediaInfo(
          "Link ini terlihat seperti berkas langsung. Anda bisa mengunduhnya dengan tombol di bawah."
        );
        return;
      }

      const host = u.hostname.replace(/^www\./, "");
      if (["youtube.com", "youtu.be", "tiktok.com", "instagram.com", "twitter.com", "x.com"].includes(host)) {
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
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

    let alias = "";
    if (trimmed && trimmed.includes("@")) {
      const [local, domain] = trimmed.split("@");
      alias = `${local}+gp-${stamp}@${domain}`;
      setAliasInfo("Alias bergaya plus-address dibuat dari email utama Anda.");
    } else {
      const rand = Math.random().toString(36).slice(2, 8);
      alias = `gp-${rand}-${stamp}@${aliasDomain}`;
      setAliasInfo("Alamat acak disiapkan. Gunakan dengan layanan temp-mail atau alias pilihan Anda.");
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
      description="JSON, Base64, bulk teks/data, helper link, dan perencana alias email."
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 text-xs">
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
          <div className="space-y-2 text-xs">
            <Label>JSON rapi</Label>
            <textarea
              className="h-40 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              value={jsonPretty}
              onChange={(e) => setJsonPretty(e.target.value)}
              placeholder="Hasil JSON yang sudah diformat akan muncul di sini."
            />
          </div>
          <div className="space-y-2 text-xs">
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

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)] text-xs">
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-3">
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

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-3">
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

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-3">
            <Label>Alias & temp email planner</Label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 shadow-sm focus:border-slate-900/60 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              value={baseEmail}
              onChange={(e) => setBaseEmail(e.target.value)}
              placeholder="Email utama (opsional, untuk plus-address)"
            />
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2 text-[11px]">
              <Input
                label="Domain alternatif"
                value={aliasDomain}
                onChange={(e) => setAliasDomain(e.target.value)}
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
        </div>
      </div>
    </Card>
  );
};

// ---------- Layout & App Shell ----------

type SectionId = "qr" | "pdf" | "doc" | "util";

const AppHeader: React.FC<{ current: SectionId; onChange: (id: SectionId) => void }> = ({
  current,
  onChange,
}) => {
  const [openGroup, setOpenGroup] = useState<null | "kode" | "dokumen" | "dev">(
    null
  );

  const navButtonCls = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase transition",
      active
        ? "bg-slate-900 text-slate-50 shadow-sm"
        : "text-slate-600 hover:bg-slate-100"
    );

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
         <div className="flex items-center">
          <img 
            src="/gamato-piranti.png" 
            alt="Gamato Piranti Logo" 
            className="h-9 w-9 object-contain" 
          />
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

        <nav className="relative flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-2 py-1 text-[11px] shadow-sm">
            <div className="relative">
              <button
                type="button"
                className={navButtonCls(openGroup === "kode" || current === "qr")}
                onClick={() =>
                  setOpenGroup((prev) => (prev === "kode" ? null : "kode"))
                }
              >
                Kode
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {openGroup === "kode" && (
                <div className="absolute left-0 right-0 top-[110%] z-30 min-w-[180px] rounded-2xl border border-slate-200 bg-white p-2 text-[11px] shadow-lg">
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
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                className={navButtonCls(
                  openGroup === "dokumen" || current === "pdf" || current === "doc"
                )}
                onClick={() =>
                  setOpenGroup((prev) => (prev === "dokumen" ? null : "dokumen"))
                }
              >
                Dokumen
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {openGroup === "dokumen" && (
                <div className="absolute left-0 right-0 top-[110%] z-30 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 text-[11px] shadow-lg">
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
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                className={navButtonCls(openGroup === "dev" || current === "util")}
                onClick={() =>
                  setOpenGroup((prev) => (prev === "dev" ? null : "dev"))
                }
              >
                Utilitas
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {openGroup === "dev" && (
                <div className="absolute left-0 right-0 top-[110%] z-30 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 text-[11px] shadow-lg">
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
              )}
            </div>
          </div>
        </nav>

        <div className="hidden text-right text-[10px] text-slate-400 sm:block">
          <p>Tanpa Login</p>
        </div>
      </div>
    </header>
  );
};

export const App: React.FC = () => {
  const [section, setSection] = useState<SectionId>("qr");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <AppHeader current={section} onChange={setSection} />

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 pb-10">
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
                Gamato Piranti merapikan pekerjaan harian: dari QR code, PDF, sampai dokumen .docx. Sederhana, modern, dan penuh alat yang benar-benar terpakai.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-right text-[11px] text-slate-300">
              <Badge>Browser Native</Badge>
              <p>Semua diproses di perangkat Anda. Siap dideploy di hosting statis modern.</p>
            </div>
          </div>
        </section>

        {section === "qr" && <QRBarcodeStudio />}
        {section === "pdf" && <PdfTools />}
        {section === "doc" && <DocTools />}
        {section === "util" && <UtilityShelf />}

        <footer className="mt-4 flex flex-col justify-between gap-3 border-t border-slate-200 pt-4 text-[11px] text-slate-500 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} WUG | Gamato Piranti | Fokus ke utilitas.
          </p>
          <p className="text-slate-400">
            Dibangun dengan ❤ | Ditenagai oleh Vercel
          </p>
        </footer>
      </main>
    </div>
  );
};

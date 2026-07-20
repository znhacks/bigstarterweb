// ./components/ui/image-cropper-dialog.tsx
"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Link2, RotateCw, ZoomIn, ArrowLeft } from "lucide-react";

// Impor React Cropper & CSS bawaannya
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";

interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc?: string | null;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc: initialImageSrc,
  onCropComplete
}: ImageCropperDialogProps) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Manajemen Pemuatan Berkas
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageSrc ?? null);
  const [urlInput, setUrlInput] = useState("");
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [isDragging, setIsDragging] = useState(false);

  // State Sliders Kontrol
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.1);
  const [maxZoom, setMaxZoom] = useState(3);

  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset seluruh state ketika modal ditutup atau gambar diganti
  useEffect(() => {
    if (!open) {
      setImageSrc(null);
      setUrlInput("");
      setUrlPreview(null);
      setZoom(1);
      setMinZoom(0.1);
      setMaxZoom(3);
      setRotation(0);
      setIsDragging(false);
    } else {
      setImageSrc(initialImageSrc ?? null);
    }
  }, [open, initialImageSrc]);

  // Menangkap aksi Tempel Gambar secara global (Ctrl + V) saat modal terbuka
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!open) return;
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              loadImage(file);
            }
          }
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [open]);

  // Menghitung rasio zoom minimal agar gambar tidak lebih kecil dari KOTAK HIJAU
  const getMinRatioLimit = (): number => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return 0.1;

    const cropBoxData = cropper.getCropBoxData();
    const imageData = cropper.getImageData();

    return Math.max(
      cropBoxData.width / imageData.naturalWidth,
      cropBoxData.height / imageData.naturalHeight
    );
  };

  // Handler saat Cropper selesai memuat gambar
  const handleCropperReady = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const minLimit = getMinRatioLimit();

      setMinZoom(minLimit);
      setZoom(minLimit);
      setMaxZoom(minLimit * 4);

      cropper.zoomTo(minLimit);
    }
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      loadImage(file);
    }
  };

  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlPreview = () => {
    if (urlInput.trim()) {
      setUrlPreview(urlInput.trim());
    }
  };

  const handleUrlSaveProceed = () => {
    if (urlPreview) {
      setImageSrc(urlPreview);
    }
  };

  // Handler pergeseran slider Zoom
  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoom(val);
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.zoomTo(val);
    }
  };

  // Batalkan aksi perkecil jika melewati batas minimal
  const handleZoomEvent = (e: CustomEvent<any>) => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const minLimit = getMinRatioLimit();

    if (e.detail.ratio < minLimit) {
      e.preventDefault();
      cropper.zoomTo(minLimit);
      setZoom(minLimit);
    } else {
      setZoom(e.detail.ratio);
    }
  };

  // Handler perubahan nilai slider Rotasi secara reaktif (0° - 360°)
  const handleRotateSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setRotation(val);
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.rotateTo(val);
    }
  };

  // Memotong ke 300x300px, mengompresi ke WebP, lalu mengirimkan Blob hasilnya
  const handleSave = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setIsProcessing(true);

    const canvas = cropper.getCroppedCanvas({
      width: 300,
      height: 300,
      imageSmoothingQuality: "high"
    });

    if (!canvas) {
      setIsProcessing(false);
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onOpenChange(false);
        }
        setIsProcessing(false);
      },
      "image/webp",
      0.8
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Gaya CSS Khusus untuk menampilkan kotak luar dan lingkaran transparan di dalam */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Tetap tampilkan garis luar persegi berwarna hijau */
        .circular-cropper .cropper-view-box {
          outline: 2px solid #22c55e !important;
          outline-offset: -1px;
          position: relative;
        }

        /* Buat area lingkaran di dalam persegi dengan sudut luar setengah transparan */
        .circular-cropper .cropper-view-box::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          /* Bayangan hitam menyebar ke luar lingkaran untuk menggelapkan sudut persegi */
          box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.5) !important; 
          pointer-events: none;
          z-index: 1;
          /* Garis bantu lingkaran tipis */
          border: 1px dashed rgba(255, 255, 255, 0.4);
        }

        /* Pastikan elemen garis bantu (petak penolong) bawaan cropper tetap terlihat */
        .circular-cropper .cropper-dashed {
          opacity: 0.4 !important;
        }
        .circular-cropper .cropper-line {
          background-color: #22c55e !important;
          opacity: 0.6;
        }
      `
        }}
      />

      <DialogContent className="border-border/80 overflow-hidden rounded-2xl border p-6 sm:max-w-[480px]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {imageSrc && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setImageSrc(null)}
                  className="text-muted-foreground hover:text-foreground -ms-1 h-8 w-8 rounded-lg">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              Update Profile Photo
            </DialogTitle>
            {!imageSrc && (
              <DialogDescription className="text-muted-foreground text-xs">
                Choose a new photo from your device or paste a URL from the internet.
              </DialogDescription>
            )}
          </div>
        </DialogHeader>

        {/* TAMPILAN 1: PILIH GAMBAR */}
        {!imageSrc ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
            <TabsList className="bg-muted/60 grid h-11 w-full grid-cols-2 rounded-xl p-1">
              <TabsTrigger value="upload" className="rounded-lg py-2 text-xs font-semibold">
                <Upload className="me-2 h-3.5 w-3.5" /> Upload File
              </TabsTrigger>
              <TabsTrigger value="url" className="rounded-lg py-2 text-xs font-semibold">
                <Link2 className="me-2 h-3.5 w-3.5" /> From URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-0 focus-visible:outline-none">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleDropzoneClick}
                className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-border/80 hover:bg-accent/5"
                }`}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Upload className="text-muted-foreground/60 mb-4 h-10 w-10 animate-pulse" />
                <h3 className="text-foreground text-sm font-semibold">
                  Drag and drop your image here
                </h3>
                <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
                  Support JPEG, PNG, or WebP. Or click anywhere to browse from your computer.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="url" className="mt-0 space-y-5 focus-visible:outline-none">
              <div className="flex w-full gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="border-border/80 h-10 flex-1 rounded-xl text-xs"
                />
                <Button
                  type="button"
                  onClick={handleUrlPreview}
                  variant="secondary"
                  className="h-10 rounded-xl px-4 text-xs font-semibold">
                  Preview
                </Button>
              </div>

              {urlPreview && (
                <div className="flex flex-col items-center justify-center space-y-4 pt-2 text-center">
                  <div className="border-border/60 h-28 w-28 overflow-hidden rounded-full border shadow-sm">
                    <img
                      src={urlPreview}
                      alt="URL Preview"
                      className="h-full w-full object-cover"
                      onError={() => {
                        alert("Gagal memuat gambar dari URL. Pastikan tautan benar.");
                        setUrlPreview(null);
                      }}
                    />
                  </div>
                  <div className="max-w-xs space-y-1">
                    <p className="text-muted-foreground font-mono text-[11px] break-all">
                      {urlPreview}
                    </p>
                    <p className="text-muted-foreground text-[10px] italic">
                      Or paste an image (Ctrl+V)
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-10 rounded-xl text-xs font-semibold">
                  Cancel
                </Button>
                <Button
                  onClick={handleUrlSaveProceed}
                  disabled={!urlPreview}
                  className="bg-foreground text-background hover:bg-foreground/90 h-10 rounded-xl px-5 text-xs font-semibold">
                  Save
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* TAMPILAN 2: AREA CROPPER & SLIDERS */
          <div className="space-y-6">
            <div className="border-border/60 overflow-hidden rounded-xl border bg-neutral-900">
              <Cropper
                ref={cropperRef}
                src={imageSrc}
                className="circular-cropper"
                style={{ height: 280, width: "100%" }}
                initialAspectRatio={1}
                aspectRatio={1}
                guides={true}
                viewMode={1}
                dragMode="move"
                background={false}
                responsive={true}
                autoCropArea={1.0}
                checkOrientation={false}
                cropBoxMovable={false}
                cropBoxResizable={false}
                toggleDragModeOnDblclick={false}
                ready={handleCropperReady}
                zoom={handleZoomEvent}
              />
            </div>

            {/* AREA DUA SLIDER KONTROL */}
            <div className="space-y-4 px-1">
              {/* Slider 1: Zoom */}
              <div className="space-y-1">
                <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="h-3.5 w-3.5" /> Zoom
                  </span>
                  <span className="font-mono">{zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={minZoom}
                  max={maxZoom}
                  step={0.001}
                  aria-label="Zoom"
                  onChange={handleZoomSlider}
                  className="bg-muted analytics-accent-foreground h-1 w-full cursor-pointer appearance-none rounded-lg"
                />
              </div>

              {/* Slider 2: Rotasi */}
              <div className="space-y-1">
                <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <RotateCw className="h-3.5 w-3.5" /> Rotation
                  </span>
                  <span className="font-mono">{rotation}°</span>
                </div>
                <input
                  type="range"
                  value={rotation}
                  min={0}
                  max={360}
                  step={1}
                  aria-label="Rotation"
                  onChange={handleRotateSlider}
                  className="bg-muted analytics-accent-foreground h-1 w-full cursor-pointer appearance-none rounded-lg"
                />
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="flex justify-end border-t pt-3">
              <Button
                onClick={handleSave}
                disabled={isProcessing}
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold shadow-sm">
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

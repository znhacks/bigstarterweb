"use client";

import * as React from "react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  imageSrc?: string | null; // Kita perbolehkan null di awal untuk mendeteksi mode pilihan berkas
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
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageSrc);
  const [urlInput, setUrlInput] = useState("");
  const [activeTab, setActiveTab] = useState("upload");
  const [isDragging, setIsDragging] = useState(false);

  // State Sliders Kontrol
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sinkronisasi state internal saat modal ditutup atau gambar diganti
  useEffect(() => {
    if (!open) {
      setImageSrc(null);
      setUrlInput("");
      setZoom(1);
      setRotation(0);
      setIsDragging(false);
    } else {
      setImageSrc(initialImageSrc);
    }
  }, [open, initialImageSrc]);

  // Handler memicu input file
  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImage(file);
    }
  };

  // Drag & Drop event handlers
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

  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setImageSrc(urlInput.trim());
    }
  };

  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoom(val);
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.zoomTo(val);
    }
  };

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
      width: 300, // Dikunci ke ukuran 300px
      height: 300, // Dikunci ke ukuran 300px
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
      <DialogContent className="border-border/80 overflow-hidden rounded-2xl border sm:max-w-[500px]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            {imageSrc && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setImageSrc(null)}
                className="text-muted-foreground hover:text-foreground -ml-1 h-8 w-8 rounded-lg">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {imageSrc ? "Adjust Image" : "Upload Image"}
          </DialogTitle>
        </DialogHeader>

        {/* TAMPILAN 1: PILIH GAMBAR (JIKA BELUM ADA GAMBAR YANG DI-LOAD) */}
        {!imageSrc ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
            <TabsList className="border-border/60 h-auto w-full justify-start space-x-6 rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="upload"
                className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2.5 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
                Upload File
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="data-[state=active]:border-foreground text-muted-foreground rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2.5 text-sm font-semibold shadow-none transition-all data-[state=active]:bg-transparent">
                From URL
              </TabsTrigger>
            </TabsList>

            {/* TAB UPLOAD: DRAG AND DROP */}
            <TabsContent value="upload" className="mt-0 focus-visible:outline-none">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleDropzoneClick}
                className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-border/80 hover:bg-accent/5 hover:border-muted-foreground/45"
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

            {/* TAB URL: INPUT LINK GAMBAR */}
            <TabsContent value="url" className="mt-0 focus-visible:outline-none">
              <form onSubmit={handleLoadUrl} className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="image-url">Image URL</Label>
                  <div className="relative">
                    <Link2 className="text-muted-foreground/60 absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="image-url"
                      type="url"
                      required
                      placeholder="https://example.com/image.jpg"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="border-border/80 h-10 rounded-xl pl-10"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" className="h-10 rounded-xl px-5 font-semibold">
                    Load Image
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          /* TAMPILAN 2: AREA CROPPER & SLIDERS (JIKA GAMBAR SUDAH DI-LOAD) */
          <div className="space-y-6">
            <div className="border-border/60 overflow-hidden rounded-xl border bg-neutral-900">
              <Cropper
                ref={cropperRef}
                src={imageSrc}
                style={{ height: 280, width: "100%" }}
                initialAspectRatio={1}
                aspectRatio={1} // Mengunci rasio pemotongan agar tetap KOTAK (1:1)
                guides={true}
                viewMode={1} // Mencegah kotak seleksi keluar dari gambar
                dragMode="move" // Mengizinkan pengguna menggeser gambar di dalam wadah
                background={false}
                responsive={true}
                autoCropArea={0.7}
                checkOrientation={false}
                cropBoxMovable={false} // Kunci Posisi Box Seleksi agar tidak bisa digeser
                cropBoxResizable={false} // Kunci Ukuran Box Seleksi agar tidak bisa ditarik ujungnya
                toggleDragModeOnDblclick={false}
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
                  <span className="font-mono">{zoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-label="Zoom"
                  onChange={handleZoomSlider}
                  className="bg-muted analytics-accent-foreground h-1 w-full cursor-pointer appearance-none rounded-lg"
                />
              </div>

              {/* Slider 2: Rotasi (0° - 360°) */}
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

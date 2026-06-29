"use client";

import * as React from "react";
import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCw, Loader2, ZoomIn, ZoomOut } from "lucide-react";

// Impor React Cropper & CSS bawaannya
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";

interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete
}: ImageCropperDialogProps) {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset rotasi & cropper saat modal dibuka kembali
  useEffect(() => {
    if (open && cropperRef.current) {
      cropperRef.current.cropper.reset();
    }
  }, [open, imageSrc]);

  // Handler memutar gambar searah jarum jam (+90 derajat)
  const handleRotate = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.rotate(90);
    }
  };

  // Handler FITUR BARU: Zoom In (Perbesar Gambar)
  const handleZoomIn = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.zoom(0.1); // Perbesar gambar sebesar 10%
    }
  };

  // Handler FITUR BARU: Zoom Out (Perkecil Gambar)
  const handleZoomOut = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.zoom(-0.1); // Perkecil gambar sebesar 10%
    }
  };

  // Memotong, meresize ke 300x300px, mengompresi ke WebP kecil, lalu mengirimkan Blob hasilnya
  const handleSave = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setIsProcessing(true);

    // Memaksa ukuran output gambar menjadi tepat 300x300 piksel
    const canvas = cropper.getCroppedCanvas({
      width: 300, // Dikunci ke ukuran 300px
      height: 300, // Dikunci ke ukuran 300px
      imageSmoothingQuality: "high"
    });

    if (!canvas) {
      setIsProcessing(false);
      return;
    }

    // Kompresi canvas ke format image/webp dengan kualitas 80% (0.8)
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
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold">Adjust Image</DialogTitle>
        </DialogHeader>

        {imageSrc && (
          <div className="space-y-6">
            {/* Area Wadah Pemotong Gambar */}
            <div className="border-border/60 overflow-hidden rounded-xl border bg-neutral-900">
              <Cropper
                ref={cropperRef}
                src={imageSrc}
                style={{ height: 300, width: "100%" }}
                initialAspectRatio={1}
                aspectRatio={1} // Mengunci rasio pemotongan agar tetap KOTAK (1:1) saat ujung ditarik
                guides={true}
                viewMode={1} // Mencegah kotak seleksi keluar dari batas fisik gambar
                dragMode="move" // Mengizinkan pengguna menggeser gambar di dalam wadah
                background={false}
                responsive={true}
                autoCropArea={0.8}
                checkOrientation={false} // Mencegah auto-rotate EXIF dari browser
              />
            </div>

            {/* Tombol Aksi Kontrol */}
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex gap-2">
                {/* Tombol Putar Gambar 90 Derajat */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRotate}
                  disabled={isProcessing}
                  className="border-border/80 inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold">
                  <RotateCw className="h-3.5 w-3.5" />
                  Rotate 90°
                </Button>

                {/* TOMBOL BARU: Zoom In */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleZoomIn}
                  disabled={isProcessing}
                  className="border-border/80 flex h-10 w-10 items-center justify-center rounded-xl p-0"
                  title="Zoom In">
                  <ZoomIn className="h-4 w-4" />
                </Button>

                {/* TOMBOL BARU: Zoom Out */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleZoomOut}
                  disabled={isProcessing}
                  className="border-border/80 flex h-10 w-10 items-center justify-center rounded-xl p-0"
                  title="Zoom Out">
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Tombol Simpan */}
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

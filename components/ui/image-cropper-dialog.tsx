"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from "react-image-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// @ts-ignore - Mengabaikan pemeriksaan tipe data untuk berkas CSS eksternal
import "react-image-crop/dist/ReactCrop.css";

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
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Helper untuk membuat grid seleksi kotak (1:1) berada di tengah gambar secara otomatis saat dimuat
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;

    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 80 // Mengambil 80% area gambar di awal
        },
        1, // Mengunci rasio perbandingan 1:1 (Kotak)
        width,
        height
      ),
      width,
      height
    );

    setCrop(initialCrop);
  }, []);

  // Memproses pemotongan gambar berbasis koordinat piksel grid
  const handleSave = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      onCropComplete(croppedBlob);
      onOpenChange(false);
    } catch (e) {
      console.error("Gagal memotong gambar:", e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/80 overflow-hidden rounded-2xl border sm:max-w-[500px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold">Adjust Image</DialogTitle>
        </DialogHeader>

        {imageSrc && (
          <div className="space-y-6">
            {/* Area Grid Pemotong Gambar */}
            <div className="flex max-h-[350px] items-center justify-center overflow-hidden rounded-xl bg-neutral-900 p-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1} // Mengunci rasio grid agar tetap KOTAK (1:1) saat ujung ditarik
                keepSelection>
                <img
                  ref={imgRef}
                  alt="Crop Source"
                  src={imageSrc}
                  onLoad={onImageLoad}
                  className="max-h-[300px] w-auto object-contain"
                />
              </ReactCrop>
            </div>

            {/* Tombol Aksi */}
            <div className="flex justify-end border-t pt-3">
              <Button
                onClick={handleSave}
                disabled={!completedCrop}
                className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 py-2 text-sm font-semibold shadow-sm">
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// HELPER CANVAS: Ekstraksi potongan gambar ke format WebP Terkompresi (80% Quality)
// ==========================================
async function getCroppedImg(image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context found");
  }

  // Hitung skala perbandingan antara ukuran render gambar di browser vs ukuran asli file gambar
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // Atur dimensi output gambar (Skala kecil 400x400px agar hemat storage & cepat dimuat)
  const OUTPUT_SIZE = 400;
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  // Aktifkan pemulusan gambar resolusi tinggi
  ctx.imageSmoothingQuality = "high";

  // Gambar potongan ke dalam canvas menggunakan koordinat skala asli
  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  // Kompresi hasil render canvas ke tipe berkas image/webp dengan kualitas 80% (0.8)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      0.8
    );
  });
}

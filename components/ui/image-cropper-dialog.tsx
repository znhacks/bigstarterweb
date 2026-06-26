"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  aspectRatio = 1
}: ImageCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Memproses pemotongan gambar dan konversi ke WebP terkompresi
  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
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
            {/* Area Wadah Pemotong Gambar */}
            <div className="relative h-[280px] w-full overflow-hidden rounded-xl bg-neutral-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={onCropChange}
                onCropComplete={onCropCompleteCallback}
                onZoomChange={onZoomChange}
              />
            </div>

            {/* Slider Kontrol Zoom */}
            <div className="space-y-1.5 px-1">
              <label className="text-muted-foreground text-xs font-semibold">Zoom</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="bg-muted accent-foreground h-1 w-full cursor-pointer appearance-none rounded-lg"
              />
            </div>

            {/* Tombol Aksi */}
            <div className="flex justify-end border-t pt-2">
              <Button
                onClick={handleSave}
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
// HELPER CANVAS: Konversi gambar ke format WebP Kecil Terkompresi (80% Quality)
// ==========================================
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // Mencegah isu CORS Canvas
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context found");
  }

  // Atur dimensi output gambar (Skala kecil 400x400px agar hemat storage & cepat dimuat)
  const OUTPUT_SIZE = 400;
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  // Render potongan gambar ke dalam canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
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

"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, RotateCw, Loader2, Save } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { DriveFile } from "@/lib/googleDrive";

interface ImageEditorModalProps {
  file: DriveFile;
  onClose: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0,
): Promise<Blob> {
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  return new Promise(async (resolve, reject) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return reject(new Error("No 2d context"));

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5,
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y),
    );

    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas is empty"));
    }, "image/jpeg");
  });
}

export default function ImageEditorModal({
  file,
  onClose,
}: ImageEditorModalProps) {
  const { addToast, triggerRefresh } = useAppStore();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const onCropComplete = useCallback(
    (_: unknown, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!croppedAreaPixels) throw new Error("Area potong tidak valid");

      const blob = await getCroppedImg(
        `/api/download?fileId=${file.id}`,
        croppedAreaPixels,
        rotation,
      );

      const formData = new FormData();
      formData.append("file", blob, file.name);
      formData.append("fileId", file.id);
      if (file.parents?.[0]) {
        formData.append("parentId", file.parents[0]);
      }

      const res = await fetch("/api/files/update-media", {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal menyimpan gambar");

      addToast({ message: "Gambar berhasil disimpan!", type: "success" });
      triggerRefresh();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      addToast({ message: msg, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center p-4 bg-black text-white z-10">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full"
        >
          <X />
        </button>
        <h3 className="font-bold">Edit Gambar</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-primary text-white rounded-full flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
          Simpan
        </button>
      </div>

      <div className="relative flex-1 bg-zinc-900">
        <Cropper
          image={`/api/download?fileId=${file.id}`}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={undefined}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
        />
      </div>

      <div className="p-6 bg-black text-white flex items-center gap-6 justify-center pb-8">
        <div className="flex flex-col gap-2 w-1/3">
          <span className="text-xs text-gray-400">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="accent-primary"
          />
        </div>
        <div className="flex flex-col gap-2 w-1/3">
          <span className="text-xs text-gray-400">Rotasi</span>
          <input
            type="range"
            value={rotation}
            min={0}
            max={360}
            step={1}
            aria-labelledby="Rotation"
            onChange={(e) => setRotation(Number(e.target.value))}
            className="accent-primary"
          />
        </div>
        <button
          onClick={() => setRotation((r) => r + 90)}
          className="p-3 bg-white/10 rounded-full hover:bg-white/20 mt-4"
        >
          <RotateCw size={20} />
        </button>
      </div>
    </div>
  );
}

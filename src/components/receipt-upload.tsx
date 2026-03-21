"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

interface ReceiptItem {
  description: string;
  value: number;
}

interface ReceiptUploadProps {
  onItemsExtracted: (items: ReceiptItem[]) => void;
  onDateExtracted: (date: string) => void;
  onDescriptionExtracted: (description: string) => void;
  onImageReady: (base64: string, mediaType: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1600;
const QUALITY = 0.8;

function compressImage(file: File): Promise<{ base64: string; mediaType: string; dataUrl: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img;

        // Scale down if needed
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
        const base64 = dataUrl.split(",")[1];

        resolve({ base64, mediaType: "image/jpeg", dataUrl });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ReceiptUpload({ onItemsExtracted, onDateExtracted, onDescriptionExtracted, onImageReady, onLoadingChange }: ReceiptUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const { base64, mediaType, dataUrl } = await compressImage(file);
    setPreview(dataUrl);
    onImageReady(base64, mediaType);
  }

  async function handleExtract() {
    if (!preview) return;
    setLoading(true);
    onLoadingChange?.(true);
    setError(null);

    try {
      const base64 = preview.split(",")[1];

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
      });

      if (!res.ok) throw new Error("Erro ao processar imagem");

      const data = await res.json();
      if (data.items?.length > 0) {
        onItemsExtracted(data.items);
      } else {
        setError("Nenhum item encontrado no cupom");
      }
      if (data.date) {
        onDateExtracted(data.date);
      }
      if (data.description) {
        onDescriptionExtracted(data.description);
      }
    } catch {
      setError("Erro ao extrair itens do cupom");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
          Tirar foto
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => galleryRef.current?.click()}>
          Escolher da galeria
        </Button>
        {preview && (
          <Button type="button" size="sm" onClick={handleExtract} disabled={loading}>
            {loading ? "Extraindo..." : "Extrair itens com IA"}
          </Button>
        )}
      </div>

      {preview && (
        <div className="rounded border p-2">
          <img src={preview} alt="Cupom" className="max-h-64 rounded" />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

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
}

export function ReceiptUpload({ onItemsExtracted, onDateExtracted, onDescriptionExtracted, onImageReady }: ReceiptUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      onImageReady(base64, mediaType);
    };
    reader.readAsDataURL(file);
  }

  async function handleExtract() {
    if (!preview) return;
    setLoading(true);
    setError(null);

    try {
      const base64 = preview.split(",")[1];
      const mediaType = preview.startsWith("data:image/png") ? "image/png" : "image/jpeg";

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType }),
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

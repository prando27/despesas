"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptUpload, ReceiptUploadHandle } from "@/components/receipt-upload";
import { ExtractionOverlay } from "@/components/extraction-overlay";
import { useGroup } from "@/hooks/use-group";

interface Item {
  description: string;
  value: number;
}

export default function NewExpensePage() {
  const router = useRouter();
  const { currentGroup, loading } = useGroup();
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Item[]>([{ description: "", value: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptMediaType, setReceiptMediaType] = useState<string>("image/jpeg");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [lowConfidenceWarning, setLowConfidenceWarning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const receiptRef = useRef<ReceiptUploadHandle>(null);

  function handleItemsExtracted(extracted: Item[]) {
    setItems(extracted);
    setLowConfidenceWarning(null);
  }

  function handleDiscountExtracted(value: number) {
    setDiscount(value);
    setDiscountOpen(true);
  }

  function updateItem(index: number, field: keyof Item, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", value: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!currentGroup) {
      setError("Grupo não carregado. Tente novamente.");
      return;
    }

    const validItems = items.filter((i) => i.description && i.value > 0);
    if (!description || validItems.length === 0) {
      setError("Preencha a descrição e ao menos um item com valor.");
      return;
    }

    const itemsTotal = validItems.reduce((s, i) => s + i.value, 0);
    const safeDiscount = Math.max(0, discount || 0);
    if (safeDiscount > itemsTotal + 0.001) {
      setError("O desconto não pode ser maior que a soma dos itens.");
      return;
    }

    setSaving(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXPENSE",
          description,
          date,
          groupId: currentGroup.id,
          items: validItems,
          discount: safeDiscount,
          ...(receiptBase64 ? { receiptImage: receiptBase64, receiptMediaType } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        router.push("/entries");
        return;
      }

      const data = await res.json().catch(() => null);
      setError(data?.error || `Erro ao salvar (${res.status}). Tente novamente.`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Tempo esgotado. Verifique sua conexão e tente novamente.");
      } else {
        setError("Erro de conexão. Tente novamente.");
      }
    }
    setSaving(false);
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
  const safeDiscount = Math.max(0, Math.min(discount || 0, subtotal));
  const total = subtotal - safeDiscount;
  const hasDiscount = discountOpen || safeDiscount > 0;

  const overlayState = extracting ? "loading" : extractError ? "error" : "hidden";

  return (
    <div className="space-y-4">
      <ExtractionOverlay
        state={overlayState as "loading" | "error" | "hidden"}
        errorMessage={extractError || undefined}
        onRetry={() => {
          setExtractError(null);
          receiptRef.current?.extract();
        }}
        onDismiss={() => setExtractError(null)}
      />
      <h1 className="text-lg font-semibold">Nova Despesa</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto do cupom (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiptUpload
            ref={receiptRef}
            onItemsExtracted={handleItemsExtracted}
            onDateExtracted={(d) => setDate(d)}
            onDescriptionExtracted={(d) => setDescription(d)}
            onDiscountExtracted={handleDiscountExtracted}
            onImageReady={(base64, mediaType) => {
              setReceiptBase64(base64);
              setReceiptMediaType(mediaType);
            }}
            onLoadingChange={setExtracting}
            onError={setExtractError}
            onLowConfidence={setLowConfidenceWarning}
          />
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da despesa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descricao</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Farmacia, Mercado..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>

            {lowConfidenceWarning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {lowConfidenceWarning}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  + Item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Descricao do item"
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      className="flex-1 min-w-0"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder="Valor"
                      value={item.value || ""}
                      onChange={(e) => updateItem(i, "value", parseFloat(e.target.value) || 0)}
                      className="w-24 shrink-0"
                    />
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-500 px-2 shrink-0">
                        X
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {hasDiscount ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="discount">Desconto</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => { setDiscount(0); setDiscountOpen(false); }}
                  >
                    Remover
                  </Button>
                </div>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-blue-600 px-0"
                onClick={() => setDiscountOpen(true)}
              >
                + Adicionar desconto
              </Button>
            )}

            <div className="rounded-lg bg-gray-50 border p-3 space-y-1 text-sm">
              {safeDiscount > 0 ? (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Desconto</span>
                    <span className="tabular-nums">− R$ {safeDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t">
                    <span>Total</span>
                    <span className="tabular-nums">R$ {total.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">R$ {total.toFixed(2)}</span>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={saving || loading}>
              {saving ? "Salvando..." : "Salvar despesa"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

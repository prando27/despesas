"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptUpload } from "@/components/receipt-upload";
import { useGroup } from "@/hooks/use-group";

interface Item {
  description: string;
  value: number;
}

export default function NovaDespesaPage() {
  const router = useRouter();
  const { currentGroup, loading } = useGroup();
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<Item[]>([{ description: "", value: 0 }]);
  const [receiptKey, setReceiptKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleItemsExtracted(extracted: Item[]) {
    setItems(extracted);
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

  async function handleImageReady(base64: string, mediaType: string) {
    // Upload imediatamente em background
    setUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType }),
      });
      if (res.ok) {
        const data = await res.json();
        setReceiptKey(data.key);
      }
    } catch {
      // Upload falhou silenciosamente — despesa será salva sem cupom
    }
    setUploading(false);
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

    setSaving(true);
    try {
      const res = await fetch("/api/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          date,
          groupId: currentGroup.id,
          items: validItems,
          ...(receiptKey ? { receiptKey } : {}),
        }),
      });

      if (res.ok) {
        router.push("/despesas");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Erro ao salvar despesa.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setSaving(false);
  }

  const total = items.reduce((s, i) => s + (Number(i.value) || 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nova Despesa</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto do cupom (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiptUpload
            onItemsExtracted={handleItemsExtracted}
            onDateExtracted={(d) => setDate(d)}
            onDescriptionExtracted={(d) => setDescription(d)}
            onImageReady={handleImageReady}
          />
          {uploading && <p className="text-xs text-muted-foreground mt-2">Enviando foto...</p>}
          {receiptKey && !uploading && <p className="text-xs text-emerald-600 mt-2">Foto salva</p>}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da despesa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="space-y-2 flex-1 min-w-0">
                <Label htmlFor="description">Descricao</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Farmacia, Mercado..."
                  required
                />
              </div>
              <div className="space-y-2 w-[140px] shrink-0">
                <Label htmlFor="date">Data</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>

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
              <p className="text-sm text-right font-medium">Total: R$ {total.toFixed(2)}</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={saving || loading || uploading}>
              {saving ? "Salvando..." : uploading ? "Aguardando foto..." : "Salvar despesa"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

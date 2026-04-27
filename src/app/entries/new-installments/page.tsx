"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGroup } from "@/hooks/use-group";
import { MONTH_NAMES } from "@/lib/types";

function addMonthsClamped(base: Date, months: number): Date {
  const year = base.getFullYear();
  const month = base.getMonth() + months;
  const day = base.getDate();
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDayOfTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfTarget);
  return new Date(targetYear, targetMonth, clampedDay);
}

export default function NewInstallmentsPage() {
  const router = useRouter();
  const { currentGroup, loading } = useGroup();
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [total, setTotal] = useState(0);
  const [months, setMonths] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const preview = useMemo(() => {
    if (!total || !months || months < 2) return null;
    const totalCents = Math.round(total * 100);
    const baseCents = Math.floor(totalCents / months);
    const remainderCents = totalCents - baseCents * months;
    const [y, m, d] = startDate.split("-").map((s) => parseInt(s, 10));
    const start = new Date(y, (m || 1) - 1, d || 1);

    const rows = Array.from({ length: months }).map((_, i) => {
      const valueCents = i === 0 ? baseCents + remainderCents : baseCents;
      const date = addMonthsClamped(start, i);
      return {
        index: i + 1,
        label: `${MONTH_NAMES[date.getMonth()]}/${date.getFullYear()}`,
        value: valueCents / 100,
      };
    });

    const sum = rows.reduce((s, r) => s + r.value, 0);
    return { rows, sum };
  }, [total, months, startDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!currentGroup) {
      setError("Grupo não carregado. Tente novamente.");
      return;
    }
    if (!description) {
      setError("Preencha a descrição.");
      return;
    }
    if (!total || total <= 0) {
      setError("Informe um valor total maior que zero.");
      return;
    }
    if (!months || months < 2) {
      setError("Informe pelo menos 2 parcelas.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/entries/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          startDate,
          groupId: currentGroup.id,
          total,
          months,
        }),
      });

      if (res.ok) {
        router.push("/entries");
        return;
      }

      const data = await res.json().catch(() => null);
      setError(data?.error || `Erro ao salvar (${res.status}). Tente novamente.`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setSaving(false);
  }

  const showAll = preview && preview.rows.length <= 12;
  const visibleRows = preview
    ? showAll
      ? preview.rows
      : [...preview.rows.slice(0, 3), null, preview.rows[preview.rows.length - 1]]
    : [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nova Despesa Parcelada</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: IPTU, Internet..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Data da primeira parcela</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="total">Valor total</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={total || ""}
                  onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="months">Parcelas</Label>
                <Input
                  id="months"
                  type="number"
                  step="1"
                  min="2"
                  max="60"
                  inputMode="numeric"
                  value={months || ""}
                  onChange={(e) => setMonths(parseInt(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            {preview && (
              <div className="rounded-lg bg-gray-50 border p-3 space-y-2 text-sm">
                <div className="font-medium">Pré-visualização</div>
                <div className="space-y-1">
                  {visibleRows.map((row, idx) =>
                    row === null ? (
                      <div key={`gap-${idx}`} className="text-muted-foreground text-center">…</div>
                    ) : (
                      <div key={row.index} className="flex justify-between tabular-nums">
                        <span>
                          {row.index}/{months} — {row.label}
                        </span>
                        <span>R$ {row.value.toFixed(2)}</span>
                      </div>
                    )
                  )}
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Total</span>
                  <span className="tabular-nums">R$ {preview.sum.toFixed(2)}</span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={saving || loading}>
              {saving ? "Salvando..." : "Salvar parcelas"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGroup } from "@/hooks/use-group";
import { useSession } from "@/lib/auth-client";

interface SummaryResponse {
  grandTotal: number;
  perUser: { id: string; name: string; total: number }[];
}

export function TransferForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const { currentGroup, loading: groupLoading } = useGroup();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [toUserId, setToUserId] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const userId = session?.user?.id;

  const myMembership = currentGroup?.members.find((m) => m.id === userId);
  const effectiveSenderId = myMembership?.countAsId || userId || "";

  const eligibleRecipients = useMemo(() => {
    if (!currentGroup) return [] as { id: string; name: string }[];
    return currentGroup.members
      .filter((m) => !m.countAsId && m.id !== effectiveSenderId)
      .map((m) => ({ id: m.id, name: m.name }));
  }, [currentGroup, effectiveSenderId]);

  useEffect(() => {
    if (!toUserId && eligibleRecipients.length > 0) {
      setToUserId(eligibleRecipients[0].id);
    }
  }, [eligibleRecipients, toUserId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!currentGroup) {
      setError("Grupo não carregado.");
      return;
    }

    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    if (!toUserId) {
      setError("Escolha o destinatário do pagamento.");
      return;
    }

    // Soft warning: check if sender actually has a debt in this month
    try {
      const [y, m] = date.split("-");
      const summaryRes = await fetch(
        `/api/summary?month=${parseInt(m)}&year=${parseInt(y)}&groupId=${currentGroup.id}`,
      );
      if (summaryRes.ok) {
        const summary: SummaryResponse = await summaryRes.json();
        const n = summary.perUser.length;
        const share = n > 0 ? summary.grandTotal / n : 0;
        const senderData = summary.perUser.find((u) => u.id === effectiveSenderId);
        const senderContribution = senderData?.total ?? 0;
        const currentDebt = Math.max(0, share - senderContribution);

        if (currentDebt < 0.01) {
          if (
            !confirm(
              `Você não tem dívida registrada neste mês. Deseja registrar esta transferência mesmo assim?`,
            )
          ) {
            return;
          }
        } else if (value > currentDebt + 0.01) {
          if (
            !confirm(
              `O valor (R$ ${value.toFixed(2)}) é maior que sua dívida atual (R$ ${currentDebt.toFixed(2)}). Deseja continuar?`,
            )
          ) {
            return;
          }
        }
      }
    } catch {
      // If summary fails, don't block — let the submit proceed
    }

    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TRANSFER",
          description: description || "Pagamento",
          date,
          groupId: currentGroup.id,
          toUserId,
          items: [{ description: description || "Pagamento", value }],
        }),
      });

      if (res.ok) {
        router.push("/entries");
        return;
      }

      const data = await res.json().catch(() => null);
      setError(data?.error || `Erro ao salvar (${res.status}).`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    }
    setSaving(false);
  }

  if (groupLoading) {
    return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  }

  if (eligibleRecipients.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Não há outros membros independentes neste grupo para receber um pagamento.
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toUserId">Para quem</Label>
            <select
              id="toUserId"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {eligibleRecipients.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pagamento"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Registrar pagamento"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

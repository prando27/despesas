"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MonthSummary } from "@/components/month-summary";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { useGroup } from "@/hooks/use-group";
import { useSession } from "@/lib/auth-client";
import { MONTH_NAMES } from "@/lib/types";
import type { SummaryData } from "@/lib/types";

interface PendingSettlement {
  month: number;
  year: number;
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}

interface PendingData {
  pending: PendingSettlement[];
  settlements: { from: string; fromId: string; to: string; toId: string; amount: number }[];
  totalPending: number;
}

function SummaryContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { currentGroup, loading: groupLoading } = useGroup();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [pendingData, setPendingData] = useState<PendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payingAll, setPayingAll] = useState(false);
  const { month, year, changeMonth, setMonthYear } = useMonthNavigation();

  const userId = session?.user?.id || "";

  useEffect(() => {
    if (groupLoading) return;
    if (!currentGroup) {
      router.push("/groups/new");
      return;
    }

    setLoading(true);
    Promise.all([
      fetch(`/api/summary?month=${month}&year=${year}&groupId=${currentGroup.id}`).then((r) => r.json()),
      fetch(`/api/payments/pendentes?groupId=${currentGroup.id}`).then((r) => r.json()),
    ]).then(([summaryData, pending]) => {
      setSummary(summaryData);
      setPendingData(pending);
    }).finally(() => setLoading(false));
  }, [month, year, currentGroup, groupLoading, router]);

  async function handleMarkPaid() {
    if (!currentGroup) return;
    setPaying(true);
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year, groupId: currentGroup.id }),
    });
    const [summaryRes, pendingRes] = await Promise.all([
      fetch(`/api/summary?month=${month}&year=${year}&groupId=${currentGroup.id}`),
      fetch(`/api/payments/pendentes?groupId=${currentGroup.id}`),
    ]);
    setSummary(await summaryRes.json());
    setPendingData(await pendingRes.json());
    setPaying(false);
  }

  async function handlePayAll() {
    if (!currentGroup) return;
    if (!confirm("Confirma que voce ja transferiu o valor total pendente?")) return;
    setPayingAll(true);
    await fetch("/api/payments/pagar-tudo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: currentGroup.id }),
    });
    const [summaryRes, pendingRes] = await Promise.all([
      fetch(`/api/summary?month=${month}&year=${year}&groupId=${currentGroup.id}`),
      fetch(`/api/payments/pendentes?groupId=${currentGroup.id}`),
    ]);
    setSummary(await summaryRes.json());
    setPendingData(await pendingRes.json());
    setPayingAll(false);
  }

  // If user has countAsId, check settlement for the target user instead
  const myMember = currentGroup?.members.find((m) => m.id === userId);
  const effectiveUserId = myMember?.countAsId || userId;

  const mySettlement = pendingData?.settlements.find(
    (s) => s.fromId === effectiveUserId || s.toId === effectiveUserId
  );
  const iOwe = mySettlement?.fromId === effectiveUserId;

  if (groupLoading) {
    return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Pending total banner */}
      {!loading && mySettlement && mySettlement.amount > 0 && (
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">
              Saldo total pendente
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-orange-900">
            R$ {mySettlement.amount.toFixed(2)}
          </p>
          <p className="text-xs text-orange-700 mt-1">
            {iOwe
              ? `Voce deve R$ ${mySettlement.amount.toFixed(2)} para ${mySettlement.to} (${pendingData!.totalPending} ${pendingData!.totalPending === 1 ? "mes" : "meses"} pendentes)`
              : `${mySettlement.from} te deve R$ ${mySettlement.amount.toFixed(2)} (${pendingData!.totalPending} ${pendingData!.totalPending === 1 ? "mes" : "meses"} pendentes)`
            }
          </p>

          <div className="mt-3 space-y-1">
            {pendingData!.pending.map((p) => (
              <div key={`${p.month}-${p.year}`} className="flex justify-between text-xs text-orange-800">
                <span>{MONTH_NAMES[p.month - 1]} {p.year}</span>
                <span className="tabular-nums font-medium">R$ {p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {iOwe && (
            <Button
              size="sm"
              className="mt-3 w-full bg-orange-600 hover:bg-orange-700"
              onClick={handlePayAll}
              disabled={payingAll}
            >
              {payingAll ? "Salvando..." : `Ja paguei tudo (R$ ${mySettlement.amount.toFixed(2)})`}
            </Button>
          )}
        </div>
      )}

      {/* Month navigation */}
      <div>
        <MonthPicker month={month} year={year} onChangeMonth={changeMonth} onSetMonthYear={setMonthYear} />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : summary ? (
        <MonthSummary
          month={summary.month}
          year={summary.year}
          grandTotal={summary.grandTotal}
          perUser={summary.perUser}
          settlement={summary.settlement}
          isPaid={summary.isPaid}
          paidBy={summary.paidBy}
          paidAt={summary.paidAt}
          currentUserId={userId}
          onMarkPaid={handleMarkPaid}
          loading={paying}
        />
      ) : (
        <p className="text-muted-foreground">Sem dados para este mes.</p>
      )}
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<p className="text-center text-muted-foreground py-8">Carregando...</p>}>
      <SummaryContent />
    </Suspense>
  );
}

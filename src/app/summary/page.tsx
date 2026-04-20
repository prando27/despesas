"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MonthSummary } from "@/components/month-summary";
import { MonthPicker } from "@/components/month-picker";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { useGroup } from "@/hooks/use-group";
import type { SummaryData } from "@/lib/types";

function SummaryContent() {
  const router = useRouter();
  const { currentGroup, loading: groupLoading } = useGroup();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { month, year, changeMonth, setMonthYear } = useMonthNavigation();

  useEffect(() => {
    if (groupLoading) return;
    if (!currentGroup) {
      router.push("/groups/new");
      return;
    }

    setLoading(true);
    fetch(`/api/summary?month=${month}&year=${year}&groupId=${currentGroup.id}`)
      .then((r) => r.json())
      .then((data: SummaryData) => setSummary(data))
      .finally(() => setLoading(false));
  }, [month, year, currentGroup, groupLoading, router]);

  if (groupLoading) {
    return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <MonthPicker month={month} year={year} onChangeMonth={changeMonth} onSetMonthYear={setMonthYear} />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : summary ? (
        <MonthSummary
          grandTotal={summary.grandTotal}
          perUser={summary.perUser}
          settlements={summary.settlements}
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

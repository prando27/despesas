"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EntryList } from "@/components/entry-list";
import { MonthPicker } from "@/components/month-picker";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { useGroup } from "@/hooks/use-group";
import { useSession } from "@/lib/auth-client";
import type { Entry } from "@/lib/types";

function EntriesContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { currentGroup, loading: groupLoading } = useGroup();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const { month, year, changeMonth, setMonthYear } = useMonthNavigation();

  useEffect(() => {
    if (groupLoading) return;
    if (!currentGroup) {
      router.push("/groups/new");
      return;
    }

    setLoading(true);
    fetch(`/api/entries?month=${month}&year=${year}&groupId=${currentGroup.id}`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries || []))
      .finally(() => setLoading(false));
  }, [month, year, currentGroup, groupLoading, router]);

  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const expenseTotal = entries
    .filter((e) => e.type === "EXPENSE")
    .reduce((sum, e) => sum + e.items.reduce((s, i) => s + Number(i.value), 0), 0);

  if (groupLoading) {
    return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <MonthPicker month={month} year={year} onChangeMonth={changeMonth} onSetMonthYear={setMonthYear} />
        <p className="text-sm text-muted-foreground">Total: R$ {expenseTotal.toFixed(2)}</p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : (
        <EntryList entries={entries} currentUserId={session?.user?.id} members={currentGroup?.members} onDelete={handleDelete} />
      )}
    </div>
  );
}

export default function EntriesPage() {
  return (
    <Suspense fallback={<p className="text-center text-muted-foreground py-8">Carregando...</p>}>
      <EntriesContent />
    </Suspense>
  );
}

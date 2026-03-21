"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseList } from "@/components/expense-list";
import { MonthPicker } from "@/components/month-picker";
import { useMonthNavigation } from "@/hooks/use-month-navigation";
import { useGroup } from "@/hooks/use-group";
import { useSession } from "@/lib/auth-client";
import type { Expense } from "@/lib/types";

export default function DespesasPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { currentGroup, loading: groupLoading } = useGroup();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { month, year, changeMonth, setMonthYear } = useMonthNavigation();

  useEffect(() => {
    if (groupLoading) return;
    if (!currentGroup) {
      router.push("/grupos/novo");
      return;
    }

    setLoading(true);
    fetch(`/api/despesas?month=${month}&year=${year}&groupId=${currentGroup.id}`)
      .then((r) => r.json())
      .then((data) => setExpenses(data.expenses || []))
      .finally(() => setLoading(false));
  }, [month, year, currentGroup, groupLoading, router]);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta despesa?")) return;
    await fetch(`/api/despesas/${id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  const total = expenses.reduce(
    (sum, e) => sum + e.items.reduce((s, i) => s + Number(i.value), 0),
    0
  );

  if (groupLoading) {
    return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <MonthPicker month={month} year={year} onChangeMonth={changeMonth} onSetMonthYear={setMonthYear} />
        <p className="text-sm text-muted-foreground">Total: R$ {total.toFixed(2)}</p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : (
        <ExpenseList expenses={expenses} currentUserId={session?.user?.id} onDelete={handleDelete} />
      )}
    </div>
  );
}

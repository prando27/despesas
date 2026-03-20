"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Expense } from "@/lib/types";

interface ExpenseListProps {
  expenses: Expense[];
  currentUserId?: string;
  onDelete?: (id: string) => void;
}

function ReceiptViewer({ receiptKey }: { receiptKey: string }) {
  const [open, setOpen] = useState(false);
  const url = `/api/despesas/receipt?key=${encodeURIComponent(receiptKey)}`;

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs h-7 text-blue-600"
        onClick={() => setOpen(!open)}
      >
        {open ? "Ocultar cupom" : "Ver cupom"}
      </Button>
      {open && (
        <div className="mt-2">
          <img src={url} alt="Cupom" className="max-h-72 rounded border" />
        </div>
      )}
    </div>
  );
}

export function ExpenseList({ expenses, currentUserId, onDelete }: ExpenseListProps) {
  if (expenses.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhuma despesa neste mes.</p>;
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        const total = expense.items.reduce((s, i) => s + Number(i.value), 0);
        return (
          <Card key={expense.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{expense.description}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const d = expense.date.slice(0, 10).split("-");
                      return `${d[2]}/${d[1]}/${d[0]}`;
                    })()} — por {expense.createdBy.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">R$ {total.toFixed(2)}</p>
                  {onDelete && expense.createdBy.id === currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 h-7 text-xs"
                      onClick={() => onDelete(expense.id)}
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                {expense.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.description}</span>
                    <span className="text-muted-foreground">R$ {Number(item.value).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {expense.receiptUrl && (
                <div className="mt-2 pt-2 border-t">
                  <ReceiptViewer receiptKey={expense.receiptUrl} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

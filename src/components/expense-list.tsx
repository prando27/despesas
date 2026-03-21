"use client";

import { useState, useEffect } from "react";
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
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const url = `/api/expenses/receipt?key=${encodeURIComponent(receiptKey)}`;

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [fullscreen]);

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
          <img
            src={url}
            alt="Cupom"
            className="max-h-72 rounded border cursor-zoom-in"
            onClick={() => { setFullscreen(true); setZoomed(false); }}
          />
        </div>
      )}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light z-10 w-10 h-10 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
          >
            ✕
          </button>
          <div
            className={`w-full h-full ${zoomed ? "overflow-auto" : "flex items-center justify-center"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={url}
              alt="Cupom"
              className={zoomed
                ? "max-w-none cursor-zoom-out"
                : "max-w-full max-h-full object-contain cursor-zoom-in"
              }
              onClick={() => setZoomed(!zoomed)}
            />
          </div>
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

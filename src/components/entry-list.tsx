"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Entry } from "@/lib/types";

interface GroupMember {
  id: string;
  countAsId: string | null;
}

interface EntryListProps {
  entries: Entry[];
  currentUserId?: string;
  members?: GroupMember[];
  onDelete?: (id: string) => void;
}

function ReceiptViewer({ receiptKey }: { receiptKey: string }) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const url = `/api/receipts?key=${encodeURIComponent(receiptKey)}`;

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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

function formatDate(isoDate: string) {
  const d = isoDate.slice(0, 10).split("-");
  return `${d[2]}/${d[1]}/${d[0]}`;
}

export function EntryList({ entries, currentUserId, members, onDelete }: EntryListProps) {
  const canDeleteIds: string[] = currentUserId ? [currentUserId] : [];
  if (currentUserId && members) {
    for (const m of members) {
      if (m.countAsId === currentUserId && !canDeleteIds.includes(m.id)) {
        canDeleteIds.push(m.id);
      }
    }
  }

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum lançamento neste mes.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const subtotal = entry.items.reduce((s, i) => s + Number(i.value), 0);
        const discount = Number(entry.discount) || 0;
        const total = subtotal - discount;
        const isTransfer = entry.type === "TRANSFER";

        if (isTransfer) {
          return (
            <Card key={entry.id} className="border-l-4 border-l-blue-400">
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1 text-xs text-blue-600 font-medium shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                      Pagamento
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {entry.createdBy.name} → {entry.toUser?.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.date)}
                        {entry.description && entry.description !== "Pagamento" ? ` — ${entry.description}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums">R$ {total.toFixed(2)}</p>
                    {onDelete && canDeleteIds.includes(entry.createdBy.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 h-7 text-xs"
                        onClick={() => onDelete(entry.id)}
                      >
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={entry.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{entry.description}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(entry.date)} — por {entry.createdBy.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">R$ {total.toFixed(2)}</p>
                  {onDelete && canDeleteIds.includes(entry.createdBy.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 h-7 text-xs"
                      onClick={() => onDelete(entry.id)}
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                {entry.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.description}</span>
                    <span className="text-muted-foreground">R$ {Number(item.value).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {discount > 0 && (
                <div className="mt-2 pt-2 border-t text-sm flex justify-between text-amber-700">
                  <span>Desconto</span>
                  <span className="tabular-nums">− R$ {discount.toFixed(2)}</span>
                </div>
              )}
              {entry.receiptUrl && (
                <div className="mt-2 pt-2 border-t">
                  <ReceiptViewer receiptKey={entry.receiptUrl} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

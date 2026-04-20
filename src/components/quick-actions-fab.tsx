"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const HIDDEN_ON = ["/entries/new", "/entries/transfer"];

function IconPlus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconReceipt({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
    </svg>
  );
}

function IconArrow({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function QuickActionsFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-150 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* FAB stack */}
      <div
        className="fixed right-5 bottom-20 z-50 flex flex-col items-end gap-3"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Mini action: Pagamento */}
        <div
          className={`flex items-center gap-3 transition-all duration-200 ${
            open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
          style={{ transitionDelay: open ? "60ms" : "0ms" }}
        >
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium shadow-sm border">
            Pagamento
          </span>
          <Link
            href="/entries/transfer"
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-md bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors"
            aria-label="Registrar pagamento"
          >
            <IconArrow />
          </Link>
        </div>

        {/* Mini action: Despesa */}
        <div
          className={`flex items-center gap-3 transition-all duration-200 ${
            open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
          style={{ transitionDelay: open ? "0ms" : "60ms" }}
        >
          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium shadow-sm border">
            Despesa
          </span>
          <Link
            href="/entries/new"
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label="Adicionar despesa"
          >
            <IconReceipt />
          </Link>
        </div>

        {/* Main FAB */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Fechar ações" : "Novo lançamento"}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
            open
              ? "bg-white border-2 border-gray-300 text-gray-700 rotate-45"
              : "bg-primary/90 hover:bg-primary text-primary-foreground"
          }`}
        >
          <IconPlus />
        </button>
      </div>
    </>
  );
}

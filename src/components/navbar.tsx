"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { useGroup } from "@/hooks/use-group";
import { Button } from "@/components/ui/button";

function IconList({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function GroupSwitcher() {
  const router = useRouter();
  const { groups, currentGroup, setCurrentGroup } = useGroup();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!currentGroup) {
    return <span className="font-semibold text-sm">Racha Conta</span>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 -ml-2.5 hover:bg-gray-100 active:bg-gray-100 transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {currentGroup.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-semibold text-sm truncate max-w-[160px]">{currentGroup.name}</span>
        <IconChevron className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl border shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Seus grupos</p>
          </div>

          {groups.map((g) => {
            const isActive = g.id === currentGroup.id;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setCurrentGroup(g);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${isActive ? "bg-gray-50" : ""}`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${isActive ? "font-semibold" : "font-medium text-gray-700"}`}>{g.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {g.groupType === "event" ? "Evento" : "Mensal"} · {g.members.length} {g.members.length === 1 ? "membro" : "membros"}
                  </p>
                </div>
                {isActive && <IconCheck className="text-gray-900 shrink-0" />}
              </button>
            );
          })}

          <div className="border-t mt-1 pt-1">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/groups/new");
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-md bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Criar novo grupo</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const tabs = [
  { href: "/expenses", label: "Despesas", icon: IconList },
  { href: "/summary", label: "Resumo", icon: IconChart },
  { href: "/groups/config", label: "Grupo", icon: IconSettings },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Preserve month/year params when navigating between pages
  function hrefWithParams(base: string) {
    const m = searchParams.get("m");
    const y = searchParams.get("y");
    if (m && y) return `${base}?m=${m}&y=${y}`;
    return base;
  }

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  if (!session) return null;

  return (
    <>
      {/* Top bar */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4">
          <GroupSwitcher />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{session.user.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </nav>

      {/* FAB — New expense (mobile only, hidden on /expenses/new) */}
      {pathname !== "/expenses/new" && (
        <Link
          href="/expenses/new"
          className="md:hidden fixed right-5 bottom-20 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg bg-primary/90 text-primary-foreground hover:bg-primary transition-colors"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <IconPlus />
        </Link>
      )}

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-around px-2">
          {/* Nova — desktop only, first item */}
          <Link
            href="/expenses/new"
            className={`hidden md:flex flex-col items-center gap-1 py-2 px-3 ${
              pathname === "/expenses/new" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <IconPlus className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-medium">Nova</span>
          </Link>
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href === "/expenses" && pathname === "/expenses/new");
            const Icon = tab.icon;
            const href = (tab.href === "/expenses" || tab.href === "/summary") ? hrefWithParams(tab.href) : tab.href;

            return (
              <Link
                key={tab.href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2 px-3 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

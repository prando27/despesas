"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
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

const tabs = [
  { href: "/despesas", label: "Despesas", icon: IconList },
  { href: "/resumo", label: "Resumo", icon: IconChart },
  { href: "/grupos/config", label: "Grupo", icon: IconSettings },
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
          <span className="font-semibold">Racha Conta</span>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{session.user.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </nav>

      {/* FAB — Nova despesa (mobile only, hidden on /despesas/nova) */}
      {pathname !== "/despesas/nova" && (
        <Link
          href="/despesas/nova"
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
            href="/despesas/nova"
            className={`hidden md:flex flex-col items-center gap-1 py-2 px-3 ${
              pathname === "/despesas/nova" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <IconPlus className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-medium">Nova</span>
          </Link>
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href === "/despesas" && pathname === "/despesas/nova");
            const Icon = tab.icon;
            const href = (tab.href === "/despesas" || tab.href === "/resumo") ? hrefWithParams(tab.href) : tab.href;

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

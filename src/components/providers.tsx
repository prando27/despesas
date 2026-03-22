"use client";

import { GroupProvider } from "@/hooks/use-group";

export function Providers({ children }: { children: React.ReactNode }) {
  return <GroupProvider>{children}</GroupProvider>;
}

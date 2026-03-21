import { Suspense } from "react";
import { Navbar } from "@/components/navbar";

export default function GrupoConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <Navbar />
      </Suspense>
      <main className="mx-auto max-w-4xl px-4 py-4 pb-28">{children}</main>
    </>
  );
}

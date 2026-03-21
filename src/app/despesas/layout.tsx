import { Navbar } from "@/components/navbar";

export default function DespesasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-4 pb-28">{children}</main>
    </>
  );
}

"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useMonthNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const month = parseInt(searchParams.get("m") || "") || (now.getMonth() + 1);
  const year = parseInt(searchParams.get("y") || "") || now.getFullYear();

  const navigate = useCallback((m: number, y: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("m", String(m));
    params.set("y", String(y));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    navigate(m, y);
  }

  function setMonthYear(m: number, y: number) {
    navigate(m, y);
  }

  return { month, year, changeMonth, setMonthYear };
}

"use client";

import { useState } from "react";

export function useMonthNavigation() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }

  function setMonthYear(m: number, y: number) {
    setMonth(m);
    setYear(y);
  }

  return { month, year, changeMonth, setMonthYear };
}

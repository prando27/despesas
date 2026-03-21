"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONTH_NAMES } from "@/lib/types";

interface MonthPickerProps {
  month: number;
  year: number;
  onChangeMonth: (delta: number) => void;
  onSetMonthYear: (month: number, year: number) => void;
}

const SHORT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function MonthPicker({ month, year, onChangeMonth, onSetMonthYear }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  function handleOpen() {
    setPickerYear(year);
    setOpen(!open);
  }

  function handleSelect(m: number) {
    onSetMonthYear(m, pickerYear);
    setOpen(false);
  }

  function handleToday() {
    const now = new Date();
    onSetMonthYear(now.getMonth() + 1, now.getFullYear());
    setOpen(false);
  }

  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChangeMonth(-1)}>
          &lt;
        </Button>
        <button
          onClick={handleOpen}
          className="text-lg font-semibold px-3 py-1 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-1"
        >
          {MONTH_NAMES[month - 1]} {year}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <Button variant="outline" size="sm" onClick={() => onChangeMonth(1)}>
          &gt;
        </Button>
        {!isCurrentMonth && (
          <Button variant="ghost" size="sm" onClick={handleToday} title="Voltar ao mês atual">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border rounded-xl shadow-lg p-4 min-w-[280px]">
            {/* Year selector */}
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="sm" onClick={() => setPickerYear(pickerYear - 1)}>
                &lt;
              </Button>
              <span className="font-semibold text-lg">{pickerYear}</span>
              <Button variant="ghost" size="sm" onClick={() => setPickerYear(pickerYear + 1)}>
                &gt;
              </Button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-2">
              {SHORT_MONTHS.map((name, i) => {
                const m = i + 1;
                const isActive = m === month && pickerYear === year;
                return (
                  <button
                    key={m}
                    onClick={() => handleSelect(m)}
                    className={`py-2 px-1 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* Today button */}
            <button
              onClick={handleToday}
              className="w-full mt-3 text-xs text-center text-primary font-medium py-1"
            >
              Mês atual
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDisplayDate, getMonthMatrix, monthNames, toDateInputValue } from "../utils/date";

type DatePickerDrawerProps = {
  open: boolean;
  label: string;
  value: string;
  onClose: () => void;
  onChange: (value: string) => void;
};

export function DatePickerDrawer({ open, label, value, onClose, onChange }: DatePickerDrawerProps) {
  const selected = useMemo(() => new Date(`${value}T12:00:00`), [value]);
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [viewYear, setViewYear] = useState(selected.getFullYear());

  useEffect(() => {
    if (open) {
      setViewMonth(selected.getMonth());
      setViewYear(selected.getFullYear());
    }
  }, [open, selected]);

  const weeks = getMonthMatrix(viewYear, viewMonth);
  const years = Array.from({ length: 9 }, (_, index) => selected.getFullYear() - 4 + index);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
  };

  if (!open) return null;

  return (
    <div className="sheet-shell" role="dialog" aria-modal="true" aria-label={label}>
      <button className="sheet-backdrop" type="button" aria-label="Close date picker" onClick={onClose} />
      <section className="bottom-sheet">
        <div className="sheet-grabber" />
        <header className="sheet-header">
          <div>
            <p>{label}</p>
            <strong>{formatDisplayDate(value)}</strong>
          </div>
          <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="date-controls">
          <button className="icon-button" type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={20} />
          </button>
          <select value={viewMonth} onChange={(event) => setViewMonth(Number(event.target.value))}>
            {monthNames.map((month, index) => (
              <option value={index} key={month}>
                {month}
              </option>
            ))}
          </select>
          <select value={viewYear} onChange={(event) => setViewYear(Number(event.target.value))}>
            {years.map((year) => (
              <option value={year} key={year}>
                {year}
              </option>
            ))}
          </select>
          <button className="icon-button" type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="calendar-grid">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <span className="calendar-weekday" key={`${day}-${index}`}>
              {day}
            </span>
          ))}
          {weeks.flat().map((date, index) => {
            const dateValue = date ? toDateInputValue(date) : "";
            return (
              <button
                className={`calendar-day ${dateValue === value ? "calendar-day--active" : ""}`}
                disabled={!date}
                key={date ? dateValue : `empty-${index}`}
                type="button"
                onClick={() => {
                  onChange(dateValue);
                  onClose();
                }}
              >
                {date?.getDate() ?? ""}
              </button>
            );
          })}
        </div>

        <div className="sheet-shortcuts">
          <button
            type="button"
            onClick={() => {
              onChange(toDateInputValue(new Date()));
              onClose();
            }}
          >
            Today
          </button>
          <input
            aria-label={`${label} native date`}
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </section>
    </div>
  );
}

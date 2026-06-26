import type { TermPreset } from "../types/agreement";

export const toDateInputValue = (date: Date): string => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

export const todayInputValue = (): string => toDateInputValue(new Date());

export const addMonths = (dateValue: string, months: number): string => {
  const date = new Date(`${dateValue}T12:00:00`);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);

  if (date.getDate() < day) {
    date.setDate(0);
  }

  return toDateInputValue(date);
};

export const endDateForTerm = (startDate: string, term: TermPreset): string => {
  if (term === "6m") return addMonths(startDate, 6);
  if (term === "1y") return addMonths(startDate, 12);
  if (term === "2y") return addMonths(startDate, 24);
  return startDate;
};

export const formatDisplayDate = (value: string): string => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
};

export const getMonthMatrix = (year: number, month: number): Array<Array<Date | null>> => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: Array<Array<Date | null>> = [];
  let week: Array<Date | null> = Array(first.getDay()).fill(null);

  for (let day = 1; day <= last.getDate(); day += 1) {
    week.push(new Date(year, month, day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return weeks;
};

export const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2026, index, 1)),
);

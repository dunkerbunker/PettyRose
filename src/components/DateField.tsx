import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { formatDisplayDate } from "../utils/date";
import { isDrawerOpenSuppressed } from "../utils/mobileInteraction";
import { DatePickerDrawer } from "./DatePickerDrawer";

type DateFieldProps = {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export function DateField({ label, value, error, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  const openDrawer = () => {
    if (isDrawerOpenSuppressed()) return;
    setOpen(true);
  };

  return (
    <>
      <button className={`date-field ${error ? "date-field--error" : ""}`} type="button" onClick={openDrawer}>
        <span>
          <small>{label}</small>
          <strong>{formatDisplayDate(value)}</strong>
          {error && <em>{error}</em>}
        </span>
        <CalendarDays size={20} />
      </button>
      <DatePickerDrawer
        label={label}
        open={open}
        value={value}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

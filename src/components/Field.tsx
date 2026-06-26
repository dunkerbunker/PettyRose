import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  value?: string | number;
  error?: string;
  children: ReactNode;
  hint?: string;
};

export function Field({ label, error, children, hint }: FieldProps) {
  return (
    <label className={`field ${error ? "field--error" : ""}`}>
      <span className="field__top">
        <span>{label}</span>
        {hint && <span className="field__hint">{hint}</span>}
      </span>
      {children}
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}

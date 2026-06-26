type PillOption<T extends string> = {
  label: string;
  value: T;
};

type PillGroupProps<T extends string> = {
  label: string;
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
};

export function PillGroup<T extends string>({ label, options, value, onChange, scrollable }: PillGroupProps<T>) {
  return (
    <div className={`pill-group ${scrollable ? "pill-group--scroll" : ""}`} aria-label={label}>
      {options.map((option) => (
        <button
          className={`pill ${option.value === value ? "pill--active" : ""}`}
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

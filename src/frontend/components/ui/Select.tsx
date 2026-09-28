import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  /** Üres első választás felirata, pl. „Válassz…” */
  placeholder?: string;
  error?: string;
  hint?: string;
};

/** Legördülő lista felirattal és hibaüzenettel. */
export function Select({ label, name, options, placeholder, error, hint, id, ...props }: SelectProps) {
  const inputId = id ?? `field-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        className={`min-h-12 w-full rounded-lg border bg-surface px-4 outline-none focus:border-brass ${
          error ? "border-danger" : "border-line"
        }`}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-danger">{error}</p> : hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

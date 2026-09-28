import type { InputHTMLAttributes, ReactNode } from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  name: string;
  label: ReactNode;
  error?: string;
};

/** Jelölőnégyzet felirattal (pl. feltételek elfogadása, „egész napos”). */
export function Checkbox({ name, label, error, ...inputProps }: CheckboxProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name={name} className="mt-0.5 size-5 shrink-0 accent-[var(--color-brass)]" {...inputProps} />
        <span className="text-sm">{label}</span>
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

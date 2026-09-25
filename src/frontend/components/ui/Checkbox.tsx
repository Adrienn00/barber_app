import type { ReactNode } from "react";

type CheckboxProps = {
  name: string;
  label: ReactNode;
  error?: string;
  defaultChecked?: boolean;
};

/** Jelölőnégyzet felirattal (pl. feltételek elfogadása). */
export function Checkbox({ name, label, error, defaultChecked }: CheckboxProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="mt-0.5 size-5 shrink-0 accent-[var(--color-brass)]"
        />
        <span className="text-sm">{label}</span>
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

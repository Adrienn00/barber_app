import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  /** Hibaüzenet a mező alatt (piros) */
  error?: string;
  /** Segítő szöveg a mező alatt (szürke) */
  hint?: string;
  /** Rögzített előtag a mező elején, pl. „barber.app/b/” */
  prefix?: string;
};

/** Felirattal, hibaüzenettel és segítő szöveggel ellátott beviteli mező. */
export function TextField({ label, name, error, hint, prefix, id, className = "", ...inputProps }: TextFieldProps) {
  const inputId = id ?? `field-${name}`;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-center rounded-xl border bg-background focus-within:border-brass ${
          error ? "border-danger" : "border-line"
        }`}
      >
        {prefix && <span className="pl-4 text-muted">{prefix}</span>}
        <input
          id={inputId}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full bg-transparent px-4 py-3 outline-none placeholder:text-muted/60 ${prefix ? "pl-0.5" : ""} ${className}`}
          {...inputProps}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

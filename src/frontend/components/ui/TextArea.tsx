import type { TextareaHTMLAttributes } from "react";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

/** Többsoros szövegmező (pl. bemutatkozás, indoklás). */
export function TextArea({ label, name, error, hint, id, rows = 4, ...props }: TextAreaProps) {
  const inputId = id ?? `field-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={inputId}
        name={name}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-background px-4 py-3 outline-none placeholder:text-muted/60 focus:border-brass ${
          error ? "border-danger" : "border-line"
        }`}
        {...props}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

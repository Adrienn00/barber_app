type StatusRowProps = {
  ok: boolean;
  label: string;
  /** Kisebb, magyarázó szöveg a címke alatt */
  detail?: string;
};

/** Zöld/piros pöttyös állapotsor, pl. „Supabase kapcsolat rendben”. */
export function StatusRow({ ok, label, detail }: StatusRowProps) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${ok ? "bg-ok" : "bg-danger"}`} />
      <div>
        <p>{label}</p>
        {detail && <p className="text-sm text-muted">{detail}</p>}
      </div>
    </div>
  );
}

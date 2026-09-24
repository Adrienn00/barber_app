import { formatDateTimeHu } from "@/lib/datetime";
import { checkSupabaseHealth } from "@/lib/supabase/health";

export const dynamic = "force-dynamic";

// Ideiglenes kezdőoldal a 0. fázishoz: megmutatja, hogy az app fut és eléri a Supabase-t.
export default async function Home() {
  const health = await checkSupabaseHealth();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-brass">Időpontfoglalás</p>
        <h1 className="font-serif text-4xl font-bold">Barber</h1>
        <p className="text-muted">Az alkalmazás fejlesztés alatt áll (0. fázis).</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Rendszerállapot</h2>
        <StatusRow ok label="Next.js fut" />
        <StatusRow
          ok={health.ok}
          label={health.ok ? "Supabase kapcsolat rendben" : "Nincs Supabase kapcsolat"}
          detail={health.ok ? undefined : health.reason}
        />
        <p className="pt-2 text-sm text-muted">Szerver idő (Bukarest): {formatDateTimeHu(new Date())}</p>
      </section>
    </main>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={`mt-1.5 size-2.5 shrink-0 rounded-full ${ok ? "bg-ok" : "bg-danger"}`}
      />
      <div>
        <p>{label}</p>
        {detail && <p className="text-sm text-muted">{detail}</p>}
      </div>
    </div>
  );
}

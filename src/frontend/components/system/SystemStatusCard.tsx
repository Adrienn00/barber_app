import type { SupabaseHealth } from "@/backend/health/health.service";
import { Card } from "@/frontend/components/ui/Card";
import { StatusRow } from "@/frontend/components/ui/StatusRow";
import { formatDateTimeHu } from "@/shared/datetime/datetime";

type SystemStatusCardProps = {
  health: SupabaseHealth;
  serverTime: Date;
};

/** Rendszerállapot doboz (ideiglenes, a fejlesztés idejére): fut-e az app és él-e a Supabase kapcsolat. */
export function SystemStatusCard({ health, serverTime }: SystemStatusCardProps) {
  return (
    <Card title="Rendszerállapot">
      <StatusRow ok label="Next.js fut" />
      <StatusRow
        ok={health.ok}
        label={health.ok ? "Supabase kapcsolat rendben" : "Nincs Supabase kapcsolat"}
        detail={health.ok ? undefined : health.reason}
      />
      <p className="pt-2 text-sm text-muted">Szerver idő (Bukarest): {formatDateTimeHu(serverTime)}</p>
    </Card>
  );
}

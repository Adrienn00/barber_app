import { checkSupabaseHealth } from "@/backend/services/health.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { SystemStatusCard } from "@/frontend/components/system/SystemStatusCard";

export const dynamic = "force-dynamic";

// Kezdőlap – ideiglenes, a fejlesztés alatt a rendszerállapotot mutatja.
export default async function HomePage() {
  const health = await checkSupabaseHealth();

  return (
    <PageContainer>
      <PageHeader eyebrow="Időpontfoglalás" title="Barber" subtitle="Az alkalmazás fejlesztés alatt áll." />
      <SystemStatusCard health={health} serverTime={new Date()} />
    </PageContainer>
  );
}

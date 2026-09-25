import { checkSupabaseHealth } from "@/backend/health/health.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { SystemStatusCard } from "@/frontend/components/system/SystemStatusCard";

// /allapot – technikai ellenőrző oldal: fut-e az app és eléri-e az adatbázist
export default async function StatusPage() {
  const health = await checkSupabaseHealth();

  return (
    <PageContainer centered>
      <PageHeader eyebrow="Rendszer" title="Állapot" />
      <SystemStatusCard health={health} serverTime={new Date()} />
    </PageContainer>
  );
}

import { getAdminStats, listBarbersForAdmin } from "@/backend/admin/admin.service";
import { requireAdmin } from "@/backend/auth/auth.service";
import { BarberAdminCard } from "@/frontend/components/admin/BarberAdminCard";
import { StatsGrid } from "@/frontend/components/admin/StatsGrid";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { ROUTES } from "@/shared/config/routes";

// /platform – platform admin: függő jelentkezések, barberek, alapszámok
export default async function PlatformPage() {
  await requireAdmin(ROUTES.platform);
  const [stats, barbers] = await Promise.all([getAdminStats(), listBarbersForAdmin()]);

  const pending = barbers.filter((b) => b.status === "pending");
  const others = barbers.filter((b) => b.status !== "pending");

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Platform admin" title="Áttekintés" />
      {stats && <StatsGrid stats={stats} />}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Függő jelentkezések ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-muted">Nincs elbírálásra váró jelentkezés.</p>
        ) : (
          pending.map((barber) => <BarberAdminCard key={barber.id} barber={barber} />)
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Barberek ({others.length})</h2>
        {others.map((barber) => (
          <BarberAdminCard key={barber.id} barber={barber} />
        ))}
      </section>
    </PageContainer>
  );
}

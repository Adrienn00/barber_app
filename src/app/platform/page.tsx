import { getAdminStats, listBarbersForAdmin, listShopsForAdmin } from "@/backend/admin/admin.service";
import { requireAdmin } from "@/backend/auth/auth.service";
import { BarberAdminCard } from "@/frontend/components/admin/BarberAdminCard";
import { ShopAdminCard } from "@/frontend/components/admin/ShopAdminCard";
import { StatsGrid } from "@/frontend/components/admin/StatsGrid";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { ROUTES } from "@/shared/config/routes";

// /platform – platform admin: függő jelentkezések (barber + egység), barberek, egységek, alapszámok
export default async function PlatformPage() {
  await requireAdmin(ROUTES.platform);
  const [stats, barbers, shops] = await Promise.all([getAdminStats(), listBarbersForAdmin(), listShopsForAdmin()]);

  const pendingBarbers = barbers.filter((b) => b.status === "pending");
  const pendingShops = shops.filter((s) => s.status === "pending");
  const pendingCount = pendingBarbers.length + pendingShops.length;

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Platform admin" title="Áttekintés" />
      {stats && <StatsGrid stats={stats} />}

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Elbírálásra vár ({pendingCount})</h2>
        {pendingCount === 0 && <p className="text-muted">Nincs elbírálásra váró jelentkezés.</p>}
        {pendingShops.map((shop) => (
          <ShopAdminCard key={shop.id} shop={shop} />
        ))}
        {pendingBarbers.map((barber) => (
          <BarberAdminCard key={barber.id} barber={barber} />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Egységek ({shops.length - pendingShops.length})</h2>
        {shops
          .filter((s) => s.status !== "pending")
          .map((shop) => (
            <ShopAdminCard key={shop.id} shop={shop} />
          ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Barberek ({barbers.length - pendingBarbers.length})</h2>
        {barbers
          .filter((b) => b.status !== "pending")
          .map((barber) => (
            <BarberAdminCard key={barber.id} barber={barber} />
          ))}
      </section>
    </PageContainer>
  );
}

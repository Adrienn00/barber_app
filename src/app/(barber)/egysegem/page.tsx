import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { removeShopAvatarAction, uploadShopAvatarAction } from "@/backend/shops/shops.actions";
import { getShop, listMembers, listPendingInvites } from "@/backend/shops/shops.service";
import { AvatarUpload } from "@/frontend/components/barber/AvatarUpload";
import { CollapsibleSection } from "@/frontend/components/ui/CollapsibleSection";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { InviteForm } from "@/frontend/components/shops/InviteForm";
import { MembersList } from "@/frontend/components/shops/MembersList";
import { MembershipCard } from "@/frontend/components/shops/MembershipCard";
import { PendingInvitesList } from "@/frontend/components/shops/PendingInvitesList";
import { ShopCalendarOverview } from "@/frontend/components/shops/ShopCalendarOverview";
import { ShopForm } from "@/frontend/components/shops/ShopForm";
import { ShopStatusCard } from "@/frontend/components/shops/ShopStatusCard";
import { ROUTES } from "@/shared/config/routes";

// /egysegem – egység (üzlet): létrehozás; vezetőként csapat, meghívók, adatok, áttekintés; tagként kilépés
export default async function MyShopPage() {
  const user = await requireApprovedBarber(ROUTES.myShop);
  const owned = user.ownedShop;

  // Tag, de nem vezető → csak a tagság és a kilépés
  if (!owned && user.barber?.shopId) {
    const shop = await getShop(user.barber.shopId);
    return (
      <PageContainer>
        <PageHeader eyebrow="Egység" title="Egységem" />
        <MembershipCard shopName={shop?.name ?? "egy egység"} />
      </PageContainer>
    );
  }

  // Még nincs egysége → bemutató + létrehozás
  if (!owned) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Egység"
          title="Indíts egységet"
          subtitle="Ha többen dolgoztok egy üzletben, hozz létre egy egységet: közös oldal a csapattal, és te látod a csapat naptárát."
        />
        <ShopForm
          initial={{ name: "", slug: "", city: "", address: "", phone: user.phone ?? "", bio: "", instagram: "" }}
          submitLabel="Egység létrehozása"
        />
      </PageContainer>
    );
  }

  const [shop, members, invites] = await Promise.all([
    getShop(owned.id),
    owned.status === "approved" ? listMembers(owned.id) : Promise.resolve([]),
    owned.status === "approved" ? listPendingInvites(owned.id) : Promise.resolve([]),
  ]);
  const canEdit = owned.status === "pending" || owned.status === "rejected" || owned.status === "approved";

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Egység" title="Egységem" />
      <ShopStatusCard name={owned.name} status={owned.status} rejectReason={owned.rejectReason} />

      {owned.status === "approved" && (
        <>
          <MembersList members={members} />
          <InviteForm />
          <PendingInvitesList invites={invites} />
          <ShopCalendarOverview />
        </>
      )}

      {shop && canEdit && (
        <CollapsibleSection
          id="egyseg-adatai"
          title="Az egység adatai"
          summary={`${shop.name} · ${shop.city} · /u/${shop.slug}`}
          defaultOpen={owned.status === "rejected"}
        >
          <AvatarUpload
            url={shop.avatarUrl}
            name={shop.name}
            uploadAction={uploadShopAvatarAction}
            removeAction={removeShopAvatarAction}
            label="Logó"
            hint="Az egység logója vagy egy fotó az üzletről. A barberlistában és az egység oldalán látszik."
          />
          <ShopForm
            initial={shop}
            submitLabel={owned.status === "rejected" ? "Javítás és újraküldés" : "Adatok mentése"}
          />
        </CollapsibleSection>
      )}
    </PageContainer>
  );
}

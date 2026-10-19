import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { listMyCustomers, listMyServices } from "@/backend/calendar/calendar.service";
import { getSetupStatus } from "@/backend/schedule/schedule.service";
import { SetupChecklist } from "@/frontend/components/barber/SetupChecklist";
import { ShareLinkButton } from "@/frontend/components/barber/ShareLinkButton";
import { InstallAppButton } from "@/frontend/components/system/InstallAppButton";
import { BarberCalendar } from "@/frontend/components/calendar/BarberCalendar";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { ROUTES, barberPath } from "@/shared/config/routes";

// /naptar – a barber naptára: foglalások, magánprogramok, gyors szünet, kézi foglalás.
// Új barbernél fölötte a „Kezdő lépések” (szolgáltatások, munkaidő), amíg nem foglalható.
// ?uj=foglalas → rögtön a kézi foglalás űrlapja a mostani időponttal.
export default async function CalendarPage({ searchParams }: PageProps<"/naptar">) {
  const user = await requireApprovedBarber(ROUTES.barberCalendar);
  const barberId = user.barber!.id;
  const [services, customers, setup] = await Promise.all([
    listMyServices(barberId),
    listMyCustomers(barberId),
    getSetupStatus(barberId),
  ]);
  const publicPath = barberPath(user.barber!.slug);
  // ?uj=foglalas: rögtön a kézi foglalás űrlapja (indulóoldal, vagy gyors link)
  const openNewBooking = (await searchParams).uj === "foglalas";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-3 py-8 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow="Barber felület" title="Naptáram" />
        <div className="flex flex-wrap items-start gap-3">
          <InstallAppButton />
          {setup.isReady && <ShareLinkButton path={publicPath} />}
        </div>
      </div>
      <SetupChecklist status={setup} publicPath={publicPath} />
      <BarberCalendar barberId={barberId} services={services} customers={customers} openNewBooking={openNewBooking} />
    </main>
  );
}

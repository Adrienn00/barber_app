import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { listMyCustomers, listMyServices } from "@/backend/calendar/calendar.service";
import { BarberCalendar } from "@/frontend/components/calendar/BarberCalendar";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { ROUTES } from "@/shared/config/routes";

// /naptar – a barber naptára: foglalások, magánprogramok, gyors szünet, kézi foglalás
export default async function CalendarPage() {
  const user = await requireApprovedBarber(ROUTES.barberCalendar);
  const barberId = user.barber!.id;
  const [services, customers] = await Promise.all([listMyServices(barberId), listMyCustomers(barberId)]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-3 py-8 sm:px-5">
      <PageHeader eyebrow="Barber felület" title="Naptáram" />
      <BarberCalendar services={services} customers={customers} />
    </main>
  );
}

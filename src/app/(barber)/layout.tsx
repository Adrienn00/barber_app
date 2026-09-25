import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { ROUTES } from "@/shared/config/routes";

// A (barber) csoport minden oldala (/naptar, később /keresek, /beallitasok) csak jóváhagyott barbernek.
// A zárójeles mappanév nem jelenik meg az URL-ben.
export default async function BarberLayout({ children }: LayoutProps<"/">) {
  await requireApprovedBarber(ROUTES.barberCalendar);
  return children;
}

import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/backend/auth/auth.service";
import { countPendingRequests } from "@/backend/requests/requests.service";
import { countUnreadNotifications } from "@/backend/notifications/notifications.service";
import { ServiceWorkerRegistrar } from "@/frontend/components/system/ServiceWorkerRegistrar";
import { AppHeader } from "@/frontend/components/layout/AppHeader";
import { sansFont, displayFont } from "@/frontend/styles/fonts";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/shared/config/app";
import "@/frontend/styles/globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} – ${APP_TAGLINE}`, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  // A linkelőnézet képeinek teljes címe (élesben APP_URL; nélküle a Vercel a saját címét használja)
  ...(process.env.APP_URL ? { metadataBase: new URL(process.env.APP_URL) } : {}),
  // Telepített appként (iPhone kezdőképernyő) is a saját nevével, sötét állapotsorral
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#17120e",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  // A barber menüjében a függő kérések száma
  const [pendingCount, unreadNotifications] = await Promise.all([
    user?.isApprovedBarber && user.barber ? countPendingRequests(user.barber.id) : 0,
    user ? countUnreadNotifications(user.id) : 0,
  ]);

  return (
    <html lang="hu" className={`${sansFont.variable} ${displayFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppHeader
          barberId={user?.isApprovedBarber ? (user.barber?.id ?? null) : null}
          user={
            user && {
              name: user.fullName ?? user.email,
              isAdmin: user.isAdmin,
              isApprovedBarber: user.isApprovedBarber,
              pendingCount,
              id: user.id,
              unreadNotifications,
            }
          }
        />
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

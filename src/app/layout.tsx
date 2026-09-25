import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/backend/auth/auth.service";
import { AppHeader } from "@/frontend/components/layout/AppHeader";
import { sansFont, serifFont } from "@/frontend/styles/fonts";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/shared/config/app";
import "@/frontend/styles/globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} – ${APP_TAGLINE}`, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  themeColor: "#17120e",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="hu" className={`${sansFont.variable} ${serifFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppHeader
          user={
            user && {
              name: user.fullName ?? user.email,
              isAdmin: user.isAdmin,
              isApprovedBarber: user.isApprovedBarber,
            }
          }
        />
        {children}
      </body>
    </html>
  );
}

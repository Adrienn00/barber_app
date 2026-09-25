import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/backend/auth/auth.service";
import { AppHeader } from "@/frontend/components/layout/AppHeader";
import { sansFont, serifFont } from "@/frontend/styles/fonts";
import "@/frontend/styles/globals.css";

export const metadata: Metadata = {
  title: "Barber – időpontfoglalás",
  description: "Foglalj időpontot a barberedhez néhány kattintással.",
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

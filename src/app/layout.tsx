import type { Metadata, Viewport } from "next";
import { sansFont, serifFont } from "@/frontend/styles/fonts";
import "@/frontend/styles/globals.css";

export const metadata: Metadata = {
  title: "Barber – időpontfoglalás",
  description: "Foglalj időpontot a barberedhez néhány kattintással.",
};

export const viewport: Viewport = {
  themeColor: "#17120e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hu" className={`${sansFont.variable} ${serifFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

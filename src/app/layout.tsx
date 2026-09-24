import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Barber – időpontfoglalás",
  description: "Foglalj időpontot a barberedhez néhány kattintással.",
};

export const viewport: Viewport = {
  themeColor: "#17120e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hu" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

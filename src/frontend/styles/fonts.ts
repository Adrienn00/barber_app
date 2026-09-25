import { Inter, Oswald } from "next/font/google";

/** Szövegtörzs betűtípusa */
export const sansFont = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

/** Címek betűtípusa: magas, keskeny, erős – férfias, barber shop hangulat */
export const displayFont = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

import { Inter, Playfair_Display } from "next/font/google";

/** Szövegtörzs betűtípusa */
export const sansFont = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

/** Címek betűtípusa (klasszikus „barber shop” hangulat) */
export const serifFont = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
});

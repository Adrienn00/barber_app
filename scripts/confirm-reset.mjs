// A `npm run db:reset` előtt rákérdez – a reset a HELYI adatbázis minden adatát törli
// (a kód és a GitHub nem érintett). Gépi futtatáshoz: RESET_CONFIRM=igen
import { createInterface } from "node:readline/promises";

if (process.env.RESET_CONFIRM === "igen") process.exit(0);

const rl = createInterface({ input: process.stdin, output: process.stdout });
console.log("\n  FIGYELEM: a reset a helyi adatbázis MINDEN adatát törli (fiókok, foglalások, képek),");
console.log("  és visszaállítja a kiinduló tesztadatokat. A kód és a GitHub nem érintett.\n");
const answer = (await rl.question('  Biztosan folytatod? Írd be: igen  → ')).trim().toLowerCase();
rl.close();
if (answer !== "igen") {
  console.log("\n  Megszakítva – nem történt semmi.\n");
  process.exit(1);
}

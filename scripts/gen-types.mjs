// Supabase típusok generálása a helyi adatbázisból (npm run db:types).
// Csak sikeres futás után írja felül a fájlt – ha a Docker/Supabase nem fut, a régi típusok megmaradnak.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const TARGET = "src/shared/types/database.types.ts";

let output;
try {
  output = execSync("npx supabase gen types typescript --local", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 20 * 1024 * 1024,
  });
} catch {
  console.error("Nem sikerült a típusgenerálás. Fut a Docker és a helyi Supabase? (npm run db:start)");
  process.exit(1);
}

if (!output.includes("export type Database")) {
  console.error("Váratlan kimenet, a típusfájl nem változott.");
  process.exit(1);
}
writeFileSync(TARGET, output);
console.log(`Típusok frissítve: ${TARGET}`);

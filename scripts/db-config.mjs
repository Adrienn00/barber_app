// Az adatbázis beállítása: hová és milyen titkos kulccsal szóljon a push-küldőnek.
// Minden db:reset után kell (a reset törli). A kulcsokat a .env.local-ból olvassa, nem írja ki.
//   npm run db:config
// Élesben (egyszer, az éles kulcsokkal egy külön, gitbe nem kerülő fájlból):
//   node scripts/db-config.mjs --env .env.production.local
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envIndex = process.argv.indexOf("--env");
const ENV_FILE = envIndex > 0 ? process.argv[envIndex + 1] : ".env.local";

const env = Object.fromEntries(
  readFileSync(ENV_FILE, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
);

const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "NOTIFY_DISPATCH_URL", "NOTIFY_DISPATCH_SECRET"].filter(
  (name) => !env[name],
);
if (missing.length) {
  console.error(`Hiányzik a(z) ${ENV_FILE} fájlból: ${missing.join(", ")} – futtasd: npm run notifications:setup`);
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
for (const [key, value] of [
  ["dispatch_url", env.NOTIFY_DISPATCH_URL],
  ["dispatch_secret", env.NOTIFY_DISPATCH_SECRET],
]) {
  const { error } = await db.rpc("set_app_config", { p_key: key, p_value: value });
  if (error) {
    console.error(`Nem sikerült beállítani (${key}): ${error.message}`);
    process.exit(1);
  }
}
console.log(`Adatbázis beállítva: a push-küldő címe ${env.NOTIFY_DISPATCH_URL}`);

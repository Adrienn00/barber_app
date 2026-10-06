// Élesítéshez: új (az éles oldalhoz tartozó) titkos kulcsok generálása a .env.production.local fájlba.
// Ez a fájl SOHA nem kerül gitbe. Innen másolod be az értékeket a Vercelbe (Settings → Environment Variables).
// A kulcsokat ne küldd el senkinek, chatbe se másold.
//   npm run prod:secrets -- chairtime.vercel.app      (vagy később a saját domain, pl. chairtime.ro)
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import webpush from "web-push";

const FILE = ".env.production.local";
const host = (process.argv[2] ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
if (!host) {
  console.error("Add meg az app címét, pl.: npm run prod:secrets -- chairtime.vercel.app");
  process.exit(1);
}
if (existsSync(FILE)) {
  console.error(`A ${FILE} már létezik – nem írom felül (a kulcsok már élhetnek). Ha tényleg újat akarsz, töröld előbb.`);
  process.exit(1);
}

const vapid = webpush.generateVAPIDKeys();
const lines = [
  "# ÉLES kulcsok – SOHA ne kerüljön gitbe, ne küldd el senkinek.",
  "# A Supabase-értékeket a Supabase Dashboard → Project Settings → API Keys oldalról másold be.",
  "NEXT_PUBLIC_SUPABASE_URL=",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=",
  "SUPABASE_SECRET_KEY=",
  "",
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}`,
  `VAPID_PRIVATE_KEY=${vapid.privateKey}`,
  `VAPID_SUBJECT=https://${host}`,
  `NOTIFY_DISPATCH_SECRET=${randomBytes(32).toString("hex")}`,
  `NOTIFY_DISPATCH_URL=https://${host}/api/notifications/dispatch`,
  "",
  "# E-mail – Brevo (domain nélkül is): Brevo → SMTP & API → API keys",
  "EMAIL_ENABLED=true",
  "EMAIL_PROVIDER=brevo",
  "BREVO_API_KEY=",
  "# A Brevóban igazolt feladó cím (Senders) – pl. ChairTime <chairtime.ertesites@gmail.com>",
  "EMAIL_FROM=ChairTime <IDE-A-FELADO-CIM>",
  `APP_URL=https://${host}`,
  "",
];
writeFileSync(FILE, lines.join("\n"));
console.log(`Kész: ${FILE} (új push-kulcsok és titkos kulcs a ${host} címhez).`);
console.log("Töltsd ki benne a Supabase-kulcsokat, a Brevo API kulcsot és a feladó címet, majd másold be az összeset a Vercelbe.");

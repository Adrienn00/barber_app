// Élesítéshez: új (az éles oldalhoz tartozó) titkos kulcsok generálása a .env.production.local fájlba.
// Ez a fájl SOHA nem kerül gitbe. Innen másolod be az értékeket a Vercelbe (Settings → Environment Variables).
// A kulcsokat ne küldd el senkinek, chatbe se másold.
//   npm run prod:secrets -- chairtime.ro
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import webpush from "web-push";

const FILE = ".env.production.local";
const domain = (process.argv[2] ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
if (!domain) {
  console.error("Add meg a domaint, pl.: npm run prod:secrets -- chairtime.ro");
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
  `VAPID_SUBJECT=mailto:ertesites@${domain}`,
  `NOTIFY_DISPATCH_SECRET=${randomBytes(32).toString("hex")}`,
  `NOTIFY_DISPATCH_URL=https://${domain}/api/notifications/dispatch`,
  "",
  "# E-mail (Resend) – a domain igazolása után",
  "EMAIL_ENABLED=true",
  "RESEND_API_KEY=",
  `EMAIL_FROM=ChairTime <ertesites@${domain}>`,
  `APP_URL=https://${domain}`,
  "",
];
writeFileSync(FILE, lines.join("\n"));
console.log(`Kész: ${FILE} (új push-kulcsok és titkos kulcs a ${domain} domainhez).`);
console.log("Töltsd ki benne a Supabase- és a Resend-kulcsokat, majd másold be az összeset a Vercelbe.");

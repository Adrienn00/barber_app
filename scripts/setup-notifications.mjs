// Egyszeri beállítás helyi fejlesztéshez: a push-értesítések kulcsai a .env.local-ba.
// Csak a hiányzó sorokat írja be, a meglévőket nem bántja, és semmilyen kulcsot nem ír ki a képernyőre.
//   npm run notifications:setup
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import webpush from "web-push";

const ENV = ".env.local";
if (!existsSync(ENV)) {
  console.error("Nincs .env.local – előbb másold le a .env.example-t.");
  process.exit(1);
}
let text = readFileSync(ENV, "utf8");
const has = (name) => new RegExp(`^${name}=`, "m").test(text);
const added = [];
function add(name, value, comment) {
  if (has(name)) return;
  text += `${text.endsWith("\n") ? "" : "\n"}${comment ? `# ${comment}\n` : ""}${name}=${value}\n`;
  added.push(name);
}

const isLocal = /^NEXT_PUBLIC_SUPABASE_URL=http:\/\/(127\.0\.0\.1|localhost)/m.test(text);

if (!has("NEXT_PUBLIC_VAPID_PUBLIC_KEY") || !has("VAPID_PRIVATE_KEY")) {
  const keys = webpush.generateVAPIDKeys();
  add("NEXT_PUBLIC_VAPID_PUBLIC_KEY", keys.publicKey, "Push-értesítés (VAPID) – a nyilvános kulcs a böngészőbe is eljut");
  add("VAPID_PRIVATE_KEY", keys.privateKey, "TITKOS – csak szerveroldalon");
}
// Kapcsolattartó a push-szolgáltatóknak; élesítéskor (8. fázis) a saját domain e-mail címére cseréljük
add("VAPID_SUBJECT", "mailto:ertesites@chairtime.local");
add("NOTIFY_DISPATCH_SECRET", randomBytes(32).toString("hex"), "TITKOS – az adatbázis ezzel szól a push-küldőnek");
// Helyben az adatbázis (Docker) a gépen futó fejlesztői szervert így éri el
add("NOTIFY_DISPATCH_URL", "http://host.docker.internal:3000/api/notifications/dispatch");

if (!has("SUPABASE_SECRET_KEY") && isLocal) {
  // A helyi Supabase saját, nyilvánosan ismert fejlesztői kulcsa (nem éles titok)
  const status = JSON.parse(execSync("npx supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString());
  add("SUPABASE_SECRET_KEY", status.SECRET_KEY, "Helyi Supabase titkos kulcsa (csak szerveroldalon)");
}

writeFileSync(ENV, text);
console.log(added.length ? `Beírva a .env.local-ba: ${added.join(", ")}` : "Minden kulcs megvolt, nem változott semmi.");

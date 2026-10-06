# Élesítés – lépésről lépésre

Ez az útmutató végigvisz azon, hogyan kerül fel a ChairTime az internetre.
**Saját domain nem kell hozzá**: az app ingyenes `…vercel.app` címen fut, az e-maileket a Brevo küldi.
Később saját domainre váltani csak beállítás (lásd a végén).

> **Biztonsági szabály:** titkos kulcsot (Supabase secret key, Brevo API kulcs, SMTP kulcs, VAPID private key,
> jelszavak) **soha ne másolj chatbe**, e-mailbe vagy a kódba. Csak a Vercel / Supabase / Brevo beállításaiba és a
> gépeden lévő `.env.production.local` fájlba kerülnek (ez a fájl nem kerül fel a GitHubra).

## Mire lesz szükség

| Mi | Mire | Költség |
| --- | --- | --- |
| Supabase (már megvan) | adatbázis, belépés, képek | ingyenes csomag |
| Vercel (GitHub-fiókkal) | az app futtatása, `…vercel.app` cím | ingyenes (Hobby) |
| Brevo (már ismered) | e-mailek: értesítés, regisztráció megerősítése, elfelejtett jelszó | ingyenes, napi 300 levél |
| Egy e-mail-cím feladónak | pl. egy külön Gmail-fiók: `chairtime.ertesites@gmail.com` | ingyenes |

---

## 1. Az éles adatbázis (Supabase)

A projekt már létezik a Supabase-fiókodban. Nézd meg a régióját (Project Settings → General): az EU-s
(pl. Frankfurt) a jó. Ha nem EU-s, szólj.

A saját gépeden, a projekt mappájában (PowerShell):

```
npx supabase login
npx supabase link --project-ref xtpdoxjbtfbtziwuojhm
npx supabase db push
```

- A `link` bekéri az adatbázis jelszavát – ezt a terminálba írd, ne a chatbe.
- A `db push` feltölti az összes táblát, szabályt és időzítőt. (A teszt-fiókok – Peti, Anna stb. – NEM kerülnek fel.)

## 2. Az app feltöltése (Vercel) – első kör

1. vercel.com → *Sign up with GitHub* → **Add New → Project** → válaszd a GitHub-repót → *Import*.
2. A projekt neve legyen pl. `chairtime` – ebből lesz a cím: `chairtime.vercel.app`
   (ha foglalt, a Vercel mást ajánl; jegyezd fel a végleges címet).
3. Egyelőre **ne** állíts be semmit, csak *Deploy* – ez még hibás lesz (nincsenek kulcsok), de megkapod a címet.

## 3. E-mail (Brevo)

1. Brevo → **Senders, Domains & Dedicated IPs → Senders → Add a sender**: név `ChairTime`, cím a feladó
   e-mail (pl. `chairtime.ertesites@gmail.com`) → igazold a kapott levéllel.
2. **SMTP & API → API keys → Generate a new API key** – a kulcsot csak egyszer mutatja.
3. **SMTP & API → SMTP**: itt látod az SMTP-belépést (Login) és létrehozhatsz **SMTP key**-t – ez a Supabase-hez kell.

## 4. Éles kulcsok

A projekt mappájában (a 2. lépésben kapott címmel):

```
npm run prod:secrets -- chairtime.vercel.app
```

Ez létrehozza a `.env.production.local` fájlt új, csak az éles oldalhoz tartozó kulcsokkal. Nyisd meg, és töltsd ki:
- a három Supabase-értéket (Dashboard → Project Settings → API Keys: URL, publishable key, secret key),
- a Brevo API kulcsot,
- a feladó címet (`EMAIL_FROM=ChairTime <chairtime.ertesites@gmail.com>`).

## 5. Vercel – kulcsok és újra feltöltés

1. Vercel → a projekt → **Settings → Environment Variables** → másold be a `.env.production.local` **összes**
   sorát (egyben is beilleszthető: kattints az első mezőbe és illeszd be a teljes szöveget) → *Save*.
2. **Deployments** → a legutóbbi → ⋯ → **Redeploy**. Pár perc múlva megnyílik a `https://chairtime.vercel.app`.

## 6. Supabase belépési beállítások

**Authentication → URL Configuration**
- Site URL: `https://chairtime.vercel.app`
- Redirect URLs: `https://chairtime.vercel.app/**`

**Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
- Host: `smtp-relay.brevo.com`, Port: `587`
- Username: a Brevo SMTP Login, Password: a Brevo **SMTP key**
- Sender email: a feladó cím (ugyanaz, mint a Brevóban), Sender name: `ChairTime`

**Authentication → Sign In / Providers → Email**
- *Confirm email*: **bekapcsolva**

**Authentication → Email Templates**
- *Confirm signup*: tárgy `Erősítsd meg a regisztrációd – ChairTime`, tartalom: a `supabase/templates/confirmation.html` teljes szövege
- *Reset password*: tárgy `Új jelszó beállítása – ChairTime`, tartalom: a `supabase/templates/recovery.html` teljes szövege

## 7. Az adatbázis összekötése a push- és e-mail-küldővel

```
node scripts/db-config.mjs --env .env.production.local
```

## 8. Admin fiók

1. Regisztrálj az éles oldalon a saját e-mail-címeddel (megerősítő levelet kapsz).
2. Supabase Dashboard → **SQL Editor** → futtasd (a saját e-mail-címeddel):

```sql
update public.profiles set is_admin = true
 where id = (select id from auth.users where email = 'sajat@email.cim');
```

3. Lépj ki és be: megjelenik a „Platform admin” menüpont.

## 9. Próba telefonon (ellenőrzőlista)

- [ ] Megnyílik a `https://chairtime.vercel.app`
- [ ] Regisztráció → megerősítő levél megérkezik (nézd a spam mappát is) → a link beléptet
- [ ] Elfelejtett jelszó → levél → új jelszó beállítható
- [ ] Barberként jelentkezés → adminként jóváhagyás → a barber értesítést kap → beállító varázsló
- [ ] Telepítés: Android/Chrome „Alkalmazás telepítése”, iPhone/Safari „Főképernyőhöz adás”
- [ ] Értesítések bekapcsolása → „Próba értesítés” megérkezik a telefonra
- [ ] Foglalás → a barber push-t és e-mailt kap → jóváhagyás → a vendég is
- [ ] Profilkép feltöltése telefonról
- [ ] Jogi oldalak: `/aszf`, `/adatvedelem` (valódi felhasználók előtt: üzemeltető adatai kitöltve)

## Később: saját domain

1. Domain vásárlása (pl. `chairtime.ro`), Vercel → Settings → Domains → hozzáadás, DNS-bejegyzés a regisztrátornál.
2. A Vercel környezeti változóiban és a Supabase URL Configurationben a cím cseréje (`APP_URL`, `NOTIFY_DISPATCH_URL`,
   Site URL), majd `node scripts/db-config.mjs --env .env.production.local` az új címmel.
3. E-mail: a Brevóban a domain igazolása, és a feladó lehet `ertesites@chairtime.ro` (vagy Resend:
   `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`).
4. Google-belépés (nem kötelező): Google Cloud Console OAuth-kliens, majd Supabase → Authentication → Providers → Google.

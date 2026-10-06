# Élesítés – lépésről lépésre

Ez az útmutató végigvisz azon, hogyan kerül fel a ChairTime az internetre saját címmel.
Becsült idő: 1–2 óra (a domain és az e-mail igazolása néha pár órát vár).

> **Biztonsági szabály:** titkos kulcsot (Supabase secret key, Resend API key, VAPID private key,
> jelszavak) **soha ne másolj chatbe**, e-mailbe vagy a kódba. Csak a Vercel beállításaiba és a
> gépeden lévő `.env.production.local` fájlba kerülnek (ez a fájl nem kerül fel a GitHubra).

## Mire lesz szükség

| Mi | Mire | Költség |
| --- | --- | --- |
| Domain (pl. `chairtime.ro`) | az app címe, és innen mennek az e-mailek | kb. 10–15 €/év |
| Supabase (már megvan) | adatbázis, belépés, képek | ingyenes csomag |
| Vercel (GitHub-fiókkal) | az app futtatása | ingyenes (Hobby) |
| Resend | e-mail értesítések, jelszó-visszaállító levelek | ingyenes (napi 100 levél) |

---

## 0. Döntsd el

- **A domaint** (pl. `chairtime.ro` vagy `chairtime.app`). Előbb nézd meg, szabad-e.
- **Az üzemeltető adatait** a jogi oldalakhoz: név (magánszemély / PFA / cég), cím, kapcsolattartó e-mail.
  Ezeket a `src/shared/config/legal.ts` fájlba írjuk be (szólj, és beírom).

## 1. Domain vásárlása

1. `.ro` domaint romániai regisztrátornál vehetsz (pl. ROMARG, Hostico), `.com`/`.app` domaint pl. a Namecheapnél.
2. Vásárlás után keresd meg a **DNS-beállításokat** (DNS records / Zone editor) – ide kell majd bejegyzéseket írni
   a Vercelhez és a Resendhez.

## 2. Az éles adatbázis (Supabase)

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

Ezután a Supabase Dashboardon:

**Authentication → URL Configuration**
- Site URL: `https://<domain>`
- Redirect URLs: `https://<domain>/**`

**Authentication → Sign In / Providers → Email**
- *Confirm email*: **bekapcsolva** (élesben kötelező)

**Authentication → Email Templates**
- *Confirm signup*: tárgy: `Erősítsd meg a regisztrációd – ChairTime`, tartalom: a `supabase/templates/confirmation.html` fájl teljes szövege
- *Reset password*: tárgy: `Új jelszó beállítása – ChairTime`, tartalom: a `supabase/templates/recovery.html` fájl teljes szövege

## 3. E-mail küldés (Resend)

1. Regisztrálj a resend.com oldalon.
2. **Domains → Add domain** → add meg a domaint → a Resend kiír néhány DNS-bejegyzést (TXT, MX).
   Ezeket írd be a domain DNS-beállításaiba. Pár perc–pár óra múlva „Verified” lesz.
3. **API Keys → Create API key** (Sending access) – a kulcsot csak egyszer mutatja, rögtön tedd be a
   `.env.production.local` fájlba (lásd 4. lépés).
4. Supabase Dashboard → **Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
   - Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: a Resend API kulcs
   - Sender email: `ertesites@<domain>`, Sender name: `ChairTime`

## 4. Éles kulcsok

A projekt mappájában:

```
npm run prod:secrets -- <domain>
```

Ez létrehozza a `.env.production.local` fájlt új, csak az éles oldalhoz tartozó kulcsokkal.
Nyisd meg, és töltsd ki benne:
- a három Supabase-értéket (Dashboard → Project Settings → API Keys: URL, publishable key, secret key),
- a Resend API kulcsot.

## 5. Az app feltöltése (Vercel)

1. vercel.com → *Sign up with GitHub* → **Add New → Project** → válaszd a GitHub-repót → *Import*.
2. **Environment Variables**: másold be a `.env.production.local` **összes** sorát (a Vercel egyben is
   beilleszthetőnek fogadja: kattints a mezőbe és illeszd be a teljes szöveget).
3. **Deploy**. Pár perc múlva kapsz egy `…vercel.app` címet – már működik.
4. **Settings → Domains → Add** → a domain. A Vercel kiírja, milyen DNS-bejegyzés kell (A vagy CNAME) –
   írd be a domain DNS-beállításaiba.

## 6. Az adatbázis összekötése a push-küldővel

Amikor a domain már működik (megnyílik a böngészőben):

```
node scripts/db-config.mjs --env .env.production.local
```

Ettől küld az éles adatbázis push-értesítést és e-mailt.

## 7. Admin fiók

1. Regisztrálj az éles oldalon a saját e-mail-címeddel.
2. Supabase Dashboard → **SQL Editor** → futtasd (a saját e-mail-címeddel):

```sql
update public.profiles set is_admin = true
 where id = (select id from auth.users where email = 'sajat@email.cim');
```

3. Lépj ki és be: megjelenik a „Platform admin” menüpont.

## 8. Próba telefonon (ellenőrzőlista)

- [ ] Megnyílik a `https://<domain>`, a lakat ikon látszik
- [ ] Regisztráció → megerősítő levél megérkezik (magyarul) → a link beléptet
- [ ] Elfelejtett jelszó → levél → új jelszó beállítható
- [ ] Barberként jelentkezés → adminként jóváhagyás → a barber értesítést kap → beállító varázsló
- [ ] Telepítés: Android/Chrome „Alkalmazás telepítése”, iPhone/Safari „Főképernyőhöz adás”
- [ ] Értesítések bekapcsolása → „Próba értesítés” megérkezik a telefonra
- [ ] Foglalás → a barber push-t és e-mailt kap → jóváhagyás → a vendég is
- [ ] Profilkép feltöltése telefonról
- [ ] Jogi oldalak: `/aszf`, `/adatvedelem` – nincs „Tervezet” figyelmeztetés

## Később (nem kötelező)

- **Google-belépés:** Google Cloud Console-ban OAuth-kliens, majd Supabase → Authentication → Providers → Google.
- **Natív app** (Google Play / App Store): 9. fázis, ha bevált.

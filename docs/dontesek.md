# Döntések a specifikáció (v1.1) mellé

Egyeztetve: 2026-09-24. Ahol ez eltér a PDF-től, ez az érvényes.

1. **Anonimizált foglalás:** fióktörléskor `bookings.is_anonymized = true`, a `customer_id` null lesz; a CHECK ezt megengedi.
2. **Nincs `profiles.role`:** helyette `profiles.is_admin`. Barber az, akinek van `approved` sora a `barbers` táblában. Bárki foglalhat, a barberek is.
3. **Nincs korlát** a vendégenkénti függő kérések számára.
4. **`is_listed`** csak a nyilvános listát szabályozza; a barber a saját linkjén (`/b/[slug]`) kikapcsolt kapcsolóval is foglalható.
5. **Felfüggesztéskor** a barber jövőbeli foglalásai automatikusan lemondódnak (`cancelled_by = 'barber'`), a vendégek értesítést kapnak.
6. **Kézi foglalás** (barber) munkaidőn kívülre és a min/max szabályoktól függetlenül is lehetséges; a foglalások közti ütközést (pufferrel) az adatbázis ekkor is tiltja.
7. **A puffernek nem kell beleférnie** a munkaidőbe (17:30-as 30 perces foglalás 18:00-s zárásnál rendben van).
8. **Vendég fióktörlésekor** a jövőbeli foglalásai lemondódnak, a barber értesítést kap.
9. **Nincs barberenkénti időzóna:** csak romániai barberek, fixen Europe/Bucharest.
10. Elutasított barber újra jelentkezhet; a slug módosítható (a régi link megszűnik); a 18:00 után leadott, másnapi foglalás azonnal kap emlékeztetőt.
11. **Az app neve: ChairTime** (2026-09-25). Továbbra is csak barbereknek szól (más szépségipari szakma nem);
    a felület nyelve magyar, a „barber” szó marad.

## Egységek (üzletek) – 2026-09-25

12. **Egység (üzlet):** a barber dolgozhat **önállóan** vagy egy **egység** tagjaként. Az egység saját nyilvános oldalt kap, rajta a csapatával.
13. **Csatlakozás meghívással:** az egység vezetője meghívja a barbert, a barber elfogadja. Csatlakozás után a barber **nem jelenik meg önállóként** a listában, csak az egység oldalán.
14. **Barberenkénti árlista:** az egységen belül is minden barber a saját szolgáltatásait és árait adja meg.
15. **A vezető csak látja** a tagjai naptárát (áttekintés); a foglalásokat mindenki maga kezeli. Magánprogramok tartalmát a vezető sem látja, csak hogy az idő foglalt.
16. **Kilépéskor** a barber újra önálló lesz, a jövőbeli foglalásai nála maradnak.

## Áthelyezés – 2026-10-06

17. **A barber áthelyezheti** a megerősített, jövőbeli foglalást (a naptárban rákattintva vagy áthúzva), kétféleképpen:
    - **javaslattal:** a vendég elfogadja vagy elutasítja; a válaszra annyi ideje van, mint a barbernek a jóváhagyásra
      (legkésőbb a régi / új időpont kezdetéig). Addig az új időpont foglalt, és a régi is megmarad.
      Ha a vendég **nem fogadja el vagy nem válaszol**, a régi időpont marad, és a **barber dönt**: marad a régi, vagy lemondja (indoklással).
    - **közvetlenül** („már megbeszéltük telefonon”): egy „Biztos?” lépés után azonnal átkerül, a vendég nem kap kérdést,
      csak a foglalásainál látja: „Áthelyezve (korábban: …)”. Fiók nélküli (kézi) vendégnél csak ez a mód van.
    - Az áthelyezés – a kézi foglaláshoz hasonlóan – munkaidőn kívülre is lehet, de más foglalással nem ütközhet.

## Értesítések – 2026-10-06

18. **Az értesítéseket az adatbázis hozza létre** (triggerek és percenkénti időzítő), így minden eseményről szólnak –
    az időzítő által kiváltottakról (lejárat, emlékeztető) is. **A push-t a Next.js szerver küldi**
    (`/api/notifications/dispatch`), nem Supabase Edge Function: az adatbázis pg_net-tel szól neki titkos kulccsal, és percenként
    újrapróbálja. Így helyben is működik külön szolgáltatás nélkül, élesben pedig a Vercelen fut (a spec 9. fejezetében írt
    Edge Function helyett). Az e-mail csatorna előkészítve, kikapcsolva (8. fázis).
19. **Értesítést kapnak a spec 9. táblázatán felül:** az áthelyezés minden lépése (javaslat, elfogadás, elutasítás, lejárat,
    közvetlen áthelyezés), a megbízható vendég azonnal megerősített foglalása (a barber is), és az egység-jelentkezések.
    A barber kézi foglalásáról senki nem kap értesítést. Az aznapra szóló (aznap megerősített) foglalás nem kap emlékeztetőt.
20. **Kijelentkezéskor** az adott eszköz push-feliratkozása törlődik (a közös telefonon a következő felhasználó ne kapja
    az előző értesítéseit); ha ugyanazon az eszközön más lép be és bekapcsolja, a feliratkozás az övé lesz.

## Natív app – 2026-10-06

21. **Az app webappként (PWA) indul**, a weboldalról telepíthető a kezdőképernyőre. Áruházi (natív) változat csak az
    élesítés után, ha bevált: **9. fázis** – először Android (Google Play, a webapp becsomagolásával), igény esetén iPhone
    (App Store; évi díj, Apple-ellenőrzés, natív push). Ugyanabból a kódból készül, a mostani munka megmarad.

## Élesítés – 2026-10-06

22. **Fióktörlés** a Profilom oldalon („TÖRLÉS” beírásával): a jövőbeli foglalások lemondódnak (a másik fél
    értesítést kap), a múltbeliek anonimizálódnak, a fiók és minden saját adat (barberprofil, képek, naptár) törlődik.
    Admin fiók itt nem törölhető.
23. **Elfelejtett jelszó** e-mailes linkkel; az e-mailes linkek (megerősítés, visszaállítás) bármelyik böngészőben
    működnek (`/auth/confirm`), nem csak abban, ahol kérték. A levelek magyarok (`supabase/templates/`).
24. **E-mail értesítés**: minden értesítés e-mailben is (a próba értesítés kivételével), egyszer. **Domain nélkül a Brevo
    küldi** (napi 300 ingyen, a Brevóban igazolt feladó címről) – az auth-levelek (megerősítés, elfelejtett jelszó) is a
    Brevo SMTP-n mennek. Saját domainnel később Brevo vagy Resend. Az app a `vercel.app` címen indul (2026-10-06).
25. **Jogi szövegek**: tervezet a tényleges működés alapján; az üzemeltető adatai a `src/shared/config/legal.ts`-ben,
    amíg hiányoznak, „Tervezet” figyelmeztetés látszik. Élesítés előtt jogásszal átnézetni javasolt.
26. A `npm run db:reset` előtt megerősítés kell („igen”), mert a helyi adatokat törli.

## Élesítés előtti átnézés – 2026-10-07

27. **Az egység logója** feltölthető az Egységem oldalon (csak a vezető); a listában, az egység oldalán és a megosztott
    link előnézetében látszik. A barber- és egységoldal linkelőnézetében a profilkép/logó jelenik meg.
28. **Biztonsági szigorítás:** a látogató nem látja a barberek/egységek belső azonosítóját és az admin indoklását;
    jóváhagyáskor (visszaállításkor) a régi indoklás törlődik. A feltöltött képnél a szerver a fájl tartalmából
    ellenőrzi a típust (JPG/PNG/WebP), nem a böngésző állításából.

## Adminok – 2026-10-09

29. **Admin jogot a felületről lehet adni** (Platform admin → Adminok): e-mail-cím alapján, a személynek előbb regisztrálnia
    kell. Admin jogot csak admin adhat és vehet el; saját magától senki nem veheti el, így mindig marad legalább egy admin.
    Aki admin jogot kap, értesítést kap róla. (Ez felülírja a korábbi „az admin szerepet kézzel állítjuk be” megoldást.)

## Naptár – 2026-10-12

30. **Kézi foglalásnál a telefonszám nem kötelező** – a fiók nélküli vendégnél elég a név (ha megadják a telefont,
    érvényesnek kell lennie).
31. **Egy foglalás időtartama módosítható** (függő és megerősített): a naptárban a foglalás végét húzva (telefonon: hosszan
    nyomva kijelölni, majd az arany fogantyút húzni), vagy a foglalás ablakában a „Befejezés” időpont beírásával (percre
    pontosan, 5 perc – 8 óra). Érintésnél a legfeljebb 10 perces véletlen elmozdulás nem számít áthelyezésnek. A kezdés marad, a puffer vele megy;
    ütközésnél nem engedi. A vendég nem kap róla külön értesítést (a foglalásainál a frissített idő látszik).

## Visszatérő vendégek – 2026-10-14

32. **Vágásnapló:** a barber a lezajlott (megerősített, már elkezdődött) foglaláshoz fotót és rövid jegyzetet menthet
    (a naptárban, a foglalás ablakában). Legközelebb ugyanott látja a vendég korábbi vágásait nála. A vendég a
    „Foglalásaim” oldalon látja (a jegyzet nem titkos – ezt a barber a mezőnél olvassa), és „Ugyanezt kérem újra” gombbal
    egy koppintással újra foglalhat. Más barber nem látja. A fotók privát tárban vannak, csak rövid ideig érvényes linkkel
    nyithatók meg; fióktörléskor (vendég vagy barber) a fotók és jegyzetek is törlődnek.
33. **„Ideje vágatni” emlékeztető:** ha a vendég szokásos ideje (az utolsó legfeljebb 5 látogatás közti idő átlaga,
    legalább 2 hét; egyetlen látogatásnál 4 hét) letelt egy barbernél, és nincs nála új foglalása, értesítést kap a
    legközelebbi szabad időponttal (2 héten belül, ugyanarra a szolgáltatásra) – a koppintás egyenesen a foglalás
    megerősítéséhez visz. Látogatásonként legfeljebb egyszer, napközben (10–20 óra), és csak a szokásos idő utáni
    3 hétben; aki 10 hétnél ritkábban jár, nem kap. A Profilom oldalon kikapcsolható.

## Kezdőlap – 2026-10-15

34. **„Ma még szabad”** a kezdőlapon: a listázott, foglalható barberek (egységtagok is) közül a ma még ráérők, a
    legkorábban ráérő elöl (legfeljebb 9 barber, barberenként 4 időpont), a fő szolgáltatásukra (az árlista első aktív
    tétele). Ha ma már senki nem ér rá, a holnapiak („Holnap szabad”); ha holnap sincs, a rész nem látszik. Egy
    időpontra koppintva a foglalás egyből a megerősítéssel indul. Ugyanazok a szabályok, mint a foglalásnál
    (munkaidő, foglalások, magánprogramok, legkorábbi foglalhatóság). A kimaradó vendégek külön kezelése nem kell
    (a barber úgyis jóváhagyja a kéréseket).

## Naptár – 2026-10-19

35. **Kézi foglalásnál a befejezés is megadható:** a „Befejezés” magától kitöltődik (kezdés + a szolgáltatás
    hossza), de a barber átírhatja (percre pontosan, 5 perc – 8 óra, ugyanazon a napon); a „vissza a szokásosra”
    linkkel visszaállítható. A pufferidő a megadott befejezés után jön; ütközésnél nem engedi.

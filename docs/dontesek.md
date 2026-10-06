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

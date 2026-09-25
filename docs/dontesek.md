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

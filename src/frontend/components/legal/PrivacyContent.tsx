import { APP_NAME } from "@/shared/config/app";
import { LEGAL, legalValue } from "@/shared/config/legal";
import { LegalSection } from "./LegalSection";

/** Adatvédelmi tájékoztató (GDPR 13. cikk) – a ChairTime ténylegesen kezelt adatai alapján. */
export function PrivacyContent() {
  const operator = legalValue(LEGAL.operatorName, "Üzemeltető neve");
  const email = legalValue(LEGAL.contactEmail, "kapcsolattartó e-mail");
  return (
    <div className="space-y-8">
      <LegalSection title="1. Ki kezeli az adataidat?">
        <p>
          Az adatkezelő: <strong>{operator}</strong>, {legalValue(LEGAL.operatorAddress, "cím")}
          {LEGAL.operatorRegistration && `, ${LEGAL.operatorRegistration}`}. Kapcsolat (adatvédelmi kérésekhez is):{" "}
          <strong>{email}</strong>.
        </p>
        <p>
          A {APP_NAME} időpontfoglaló platform: összeköti a vendégeket a barberekkel. A foglalások tartalmáért (pl. a
          szolgáltatásért, az árért) az adott barber felel.
        </p>
      </LegalSection>

      <LegalSection title="2. Milyen adatokat kezelünk, és miért?">
        <ul>
          <li>
            <strong>Fiókadatok</strong> – név, e-mail-cím, telefonszám, jelszó (titkosítva): a fiók működtetéséhez és
            ahhoz, hogy a barber elérhessen, ha változik az időpont. Jogalap: a szerződés teljesítése (GDPR 6. cikk
            (1) b).
          </li>
          <li>
            <strong>Foglalások</strong> – barber, szolgáltatás, időpont, a megjegyzésed, a foglalás állapota: az
            időpontfoglalás lebonyolításához. Jogalap: szerződés teljesítése.
          </li>
          <li>
            <strong>Barberek adatai</strong> – megjelenített név, város, cím, telefonszám, bemutatkozás, Instagram,
            profilkép, szolgáltatások, munkaidő: a nyilvános barberoldalhoz. Ezek nyilvánosak. A barber magánprogramjait
            csak ő maga látja.
          </li>
          <li>
            <strong>Értesítések</strong> – az appon belüli értesítések, a push-értesítéshez szükséges eszközazonosító
            (ha bekapcsolod), e-mail-értesítések: hogy tudj a foglalásaid változásairól. Jogalap: szerződés
            teljesítése; a push-értesítés a te döntésed, bármikor kikapcsolhatod.
          </li>
          <li>
            <strong>Technikai adatok</strong> – a bejelentkezéshez szükséges sütik (cookie-k). Nem használunk
            reklám- vagy követő sütiket, és nem adunk el adatot senkinek.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Ki látja az adataidat?">
        <ul>
          <li>
            <strong>A barber, akinél foglalsz:</strong> a neved, telefonszámod, a foglalásod és a megjegyzésed. Más
            barber nem látja a vendégeit.
          </li>
          <li>
            <strong>Az üzemeltető:</strong> csak a működtetéshez szükséges mértékben (pl. barberjelentkezés
            elbírálása). Magánprogramokat az üzemeltető sem lát.
          </li>
          <li>
            <strong>Adatfeldolgozók</strong> (a szolgáltatás működtetéséhez, szerződés alapján): Supabase (adatbázis,
            bejelentkezés, tárhely – EU-s szerver), Vercel (a weboldal futtatása), Resend (e-mail küldés), valamint a
            böngésződ push-szolgáltatója (Google, Apple, Microsoft vagy Mozilla) a push-értesítés kézbesítéséhez. Ha
            valamelyik az EU-n kívül is kezel adatot, az Európai Bizottság általános szerződési feltételei (SCC)
            alapján teszi.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Meddig őrizzük?">
        <ul>
          <li>A fiókadatokat, amíg a fiókod létezik.</li>
          <li>
            Ha törlöd a fiókodat, a neved, e-mail-címed és telefonszámod azonnal törlődik, a jövőbeli foglalásaid
            lemondódnak. A korábbi foglalások név nélkül (anonimizálva) maradnak meg a barber nyilvántartásában.
          </li>
          <li>Az értesítéseket legfeljebb a fiók törléséig.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Milyen jogaid vannak?">
        <p>
          Kérhetsz tájékoztatást az adataidról, kérheted a helyesbítésüket, törlésüket, a kezelés korlátozását, az
          adataid átadását (adathordozhatóság), és tiltakozhatsz a kezelés ellen. A nevedet és telefonszámodat a
          Profilom oldalon bármikor módosíthatod, a fiókodat ugyanott törölheted. Egyéb kéréssel írj a{" "}
          <strong>{email}</strong> címre – legkésőbb 30 napon belül válaszolunk.
        </p>
        <p>
          Panaszt tehetsz a román adatvédelmi hatóságnál (Autoritatea Națională de Supraveghere a Prelucrării Datelor cu
          Caracter Personal – ANSPDCP, www.dataprotection.ro), vagy annál az EU-s hatóságnál, ahol élsz.
        </p>
      </LegalSection>

      <LegalSection title="6. Biztonság">
        <p>
          Az adatokat titkosított kapcsolaton (HTTPS) keresztül továbbítjuk. Az adatbázis szabályai garantálják, hogy
          mindenki csak a hozzá tartozó adatokat érje el (pl. egy barber csak a saját vendégeit).
        </p>
      </LegalSection>

      <LegalSection title="7. Változások">
        <p>
          Ha a tájékoztató lényegesen változik, az appban jelezzük. Hatályos: {legalValue(LEGAL.effectiveDate, "dátum")}.
        </p>
      </LegalSection>
    </div>
  );
}

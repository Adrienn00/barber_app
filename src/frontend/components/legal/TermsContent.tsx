import Link from "next/link";
import { APP_NAME } from "@/shared/config/app";
import { LEGAL, legalValue } from "@/shared/config/legal";
import { ROUTES } from "@/shared/config/routes";
import { LegalSection } from "./LegalSection";

/** Felhasználási feltételek – a ChairTime tényleges működése alapján (foglalás, lemondás, barberek). */
export function TermsContent() {
  const operator = legalValue(LEGAL.operatorName, "Üzemeltető neve");
  return (
    <div className="space-y-8">
      <LegalSection title="1. A szolgáltatás">
        <p>
          A {APP_NAME} („az app”) online időpontfoglaló platform barberek és vendégeik számára. Üzemeltető:{" "}
          <strong>{operator}</strong>, {legalValue(LEGAL.operatorAddress, "cím")}, kapcsolat:{" "}
          {legalValue(LEGAL.contactEmail, "kapcsolattartó e-mail")}.
        </p>
        <p>
          Az app közvetít: a hajvágási és egyéb szolgáltatást a barber nyújtja, ő határozza meg a szolgáltatásait, az
          árakat, a munkaidejét és a foglalási szabályait. A szolgáltatás minőségéért, az árért és a helyszíni
          fizetésért a barber felel. Az app használata a vendégeknek ingyenes.
        </p>
      </LegalSection>

      <LegalSection title="2. Fiók">
        <ul>
          <li>A regisztrációhoz valós név, működő e-mail-cím és telefonszám szükséges.</li>
          <li>A jelszavadat ne add ki másnak; a fiókodban történtekért te felelsz.</li>
          <li>
            A fiókodat bármikor törölheted a Profilom oldalon (a részleteket az{" "}
            <Link href={ROUTES.privacy} className="text-brass underline">
              adatvédelmi tájékoztató
            </Link>{" "}
            írja le).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Foglalás vendégként">
        <ul>
          <li>
            A foglalás <strong>kérés</strong>: akkor érvényes, ha a barber jóváhagyta (a megbízható vendég kérése
            azonnal érvényes). Ha a barber a megadott időn belül nem dönt, a kérés lejár.
          </li>
          <li>
            A megerősített foglalást a barber által beállított határidőig (alapból 24 órával előtte) az appban
            lemondhatod. Utána már csak a barbert felhívva.
          </li>
          <li>
            Kérjük, ha mégsem tudsz menni, mondd le időben – a barber ideje is érték. Az ismételten meg nem jelenő
            vendéget a barber elutasíthatja.
          </li>
          <li>
            A barber indokolt esetben (pl. betegség) lemondhatja vagy – egyeztetve – áthelyezheti a foglalást; erről
            értesítést kapsz.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Barbereknek">
        <ul>
          <li>Barberként jelentkezni lehet; a profilt az üzemeltető hagyja jóvá.</li>
          <li>
            A barber felel azért, hogy az oldalán szereplő adatok (név, cím, árak, munkaidő, kép) valósak legyenek, és
            hogy a képek felhasználására joga legyen.
          </li>
          <li>
            A vendégek adatait (név, telefonszám) csak a foglalások lebonyolítására használhatja, másnak nem adhatja
            ki, és nem küldhet nekik kéretlen reklámot.
          </li>
          <li>
            Az üzemeltető a szabályokat megszegő vagy félrevezető profilt felfüggesztheti; ilyenkor a barber jövőbeli
            foglalásai lemondódnak, és a vendégek értesítést kapnak.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Felelősség">
        <p>
          Az üzemeltető mindent megtesz az app folyamatos működéséért, de nem garantálja a hibamentes, megszakítás
          nélküli működést. Nem felel a barber és a vendég közötti jogviszonyból (pl. a szolgáltatás minőségéből, el
          nem végzett munkából) eredő károkért.
        </p>
      </LegalSection>

      <LegalSection title="6. Változások, irányadó jog">
        <p>
          A feltételek változásáról az appban értesítünk. A feltételekre a román jog irányadó; a fogyasztók jogait ez
          nem korlátozza. Hatályos: {legalValue(LEGAL.effectiveDate, "dátum")}.
        </p>
      </LegalSection>
    </div>
  );
}

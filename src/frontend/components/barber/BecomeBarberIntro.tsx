const STEPS = [
  "Kitöltöd a barberprofilodat (név, egyedi link, cím).",
  "Az admin átnézi és jóváhagyja a jelentkezésed.",
  "Felveszed a szolgáltatásaidat és a munkaidődet.",
  "Megosztod a linkedet – a vendégek foglalási kérést küldenek, te jóváhagyod.",
];

/** A „Barber vagyok” oldal magyarázó része: hogyan működik a csatlakozás. */
export function BecomeBarberIntro() {
  return (
    <ol className="space-y-3">
      {STEPS.map((step, i) => (
        <li key={step} className="flex gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brass text-sm font-bold text-background">
            {i + 1}
          </span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

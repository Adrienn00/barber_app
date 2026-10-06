// =============================================================================
// Az üzemeltető adatai a jogi oldalakhoz (/aszf, /adatvedelem).
// ÉLESÍTÉS ELŐTT KITÖLTENDŐ – amíg valamelyik üres, az oldalakon figyelmeztetés látszik.
// =============================================================================

export const LEGAL = {
  /** Az üzemeltető (magánszemély / PFA / cég) neve */
  operatorName: "",
  /** Székhely / lakcím */
  operatorAddress: "",
  /** Cégjegyzékszám / CUI (ha van) */
  operatorRegistration: "",
  /** Kapcsolattartó e-mail (adatvédelmi kérésekhez is) */
  contactEmail: "",
  /** A szöveg hatálybalépése */
  effectiveDate: "",
} as const;

export function isLegalInfoComplete(): boolean {
  return Boolean(LEGAL.operatorName && LEGAL.operatorAddress && LEGAL.contactEmail && LEGAL.effectiveDate);
}

/** Kitöltetlen mező helyett jól látható jelölés a szövegben */
export function legalValue(value: string, placeholder: string): string {
  return value || `[${placeholder}]`;
}

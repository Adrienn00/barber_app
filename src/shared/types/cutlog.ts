// =============================================================================
// Vágásnapló: egy lezajlott foglaláshoz mentett fotó és jegyzet (dontesek.md 32.)
// =============================================================================

export type CutEntry = {
  bookingId: string;
  startsAt: string;
  serviceName: string;
  note: string | null;
  /** Rövid ideig érvényes (aláírt) link a fotóhoz */
  photoUrl: string | null;
};

/** Egy foglalás vágásnaplója a barber naptárában */
export type CutLog = {
  /** Írhat-e most (megerősített, már elkezdődött foglalás) */
  canEdit: boolean;
  /** Ehhez a foglaláshoz mentett bejegyzés */
  current: CutEntry | null;
  /** Ugyanennek a vendégnek a korábbi vágásai ennél a barbernél (legújabb elöl) */
  history: CutEntry[];
};

/** A jegyzet hossza legfeljebb */
export const CUT_NOTE_MAX = 500;

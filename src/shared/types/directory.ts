// =============================================================================
// Nyilvános oldalak adatai (frontend és backend is használja)
// =============================================================================

/** Egy sor a barberlistában: egység vagy önálló barber */
export type DirectoryEntry = {
  kind: "shop" | "barber";
  slug: string;
  name: string;
  city: string;
  address: string;
  bio: string | null;
  /** Profilkép (vagy egység logója) nyilvános címe */
  avatarUrl: string | null;
  memberCount: number;
  minPrice: number | null;
};

export type PublicService = { id: string; name: string; durationMin: number; price: number };

/** Nyitvatartás egy napra, pl. { label: "Hétfő", ranges: ["09:00–13:00", "14:00–18:00"] } */
export type OpeningDay = { weekday: number; label: string; ranges: string[] };

export type PublicBarber = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  city: string;
  address: string;
  phone: string;
  instagram: string | null;
  services: PublicService[];
  openingHours: OpeningDay[];
  /** Ha egy egység tagja: az egység oldalára mutató link adatai */
  shop: { slug: string; name: string } | null;
  /** Van aktív szolgáltatása és munkaideje → lehet nála foglalni */
  bookable: boolean;
};

export type PublicShop = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  city: string;
  address: string;
  phone: string;
  instagram: string | null;
  members: PublicBarber[];
};

/** Egy szabad kezdési időpont */
export type Slot = { startsAt: string; time: string };

import type { Database } from "./database.types";

/** Az adatbázis felsorolás-típusai rövid néven (frontend és backend is használja) */
export type BarberStatus = Database["public"]["Enums"]["barber_status"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];

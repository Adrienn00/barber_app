# frontend/ – amit a felhasználó lát

| Mappa | Mi van benne |
| --- | --- |
| `components/ui/` | Általános építőkockák, bárhol használhatók: `Button`/`LinkButton`, `SubmitButton`, `TextField`, `TextArea`, `Checkbox`, `Alert`, `Badge`, `Card`, `Divider`, `ConfirmActionButton` (kétlépéses „Biztosan?” gomb), `Dialog` (felugró ablak), `Select` (legördülő lista), `Eyebrow` (kis arany felirat), `Icon` (ikonok), `StatusRow`, `Avatar` (profilkép vagy kezdőbetűk), `StepIndicator` (lépésjelző, kitöltődő vonallal), `Reveal` (görgetésre beúszó tartalom), `CollapsibleSection` (összecsukható rész összefoglalóval; mentés után visszacsukódik) |
| `components/layout/` | Oldalkeretek: `AppHeader` (felső sáv), `Logo`, `UserMenu` (lenyíló menü; kijelentkezéskor az eszköz push-feliratkozását is törli), `NotificationBell` (harang számjelzővel), `PageContainer` (tartalom oszlop), `PageHeader` (cím) |
| `components/home/` | Kezdőlap: `HomeHero` (nyitó rész), `OpenSlotsSection` („Ma még szabad” – egy kattintással a foglalás megerősítéséhez), `FeatureRow` (ikonos információs sor) |
| `components/auth/` | Belépés/regisztráció: `LoginForm`, `RegisterForm`, `GoogleSignInButton`, `TermsCheckbox`, `ForgotPasswordForm`, `NewPasswordForm` |
| `components/profile/` | `ProfileForm` (név, telefon), `DeleteAccount` (fiók törlése „TÖRLÉS” beírásával) |
| `components/legal/` | Jogi oldalak: `TermsContent`, `PrivacyContent`, `LegalSection`, `DraftNotice` (amíg az üzemeltető adatai hiányoznak) |
| `components/barber/` | Barberjelentkezés: `BarberApplicationForm`, `ApplicationStatusCard`, `BarberStatusBadge`, `BecomeBarberIntro`; új barbernek `SetupChecklist` („Kezdő lépések”), `ShareLinkButton` (foglalási link másolása); profil: `AvatarUpload` (barber profilképe és egység logója is), `ListingToggle`; beállító varázsló: `SetupWizardNav`, `SetupDone` |
| `components/cutlog/` | Vágásnapló: `CutLogPanel` (a naptár foglalás-ablakában: mentés + a vendég korábbi vágásai), `CutNoteForm` (fotó + jegyzet), `CutEntryView` (egy bejegyzés – a vendég „Foglalásaim” oldalán is) |
| `components/customers/` | A barber vendégei: `CustomerList` (kereséssel), `CustomerRow` (megbízható kapcsoló) |
| `components/calendar/` | Barber naptár: `BarberCalendar` (fő komponens, FullCalendar; „+ Foglalás” és „+ Szünet / program” gomb, `?uj=foglalas`), `QuickBreakBar` („Szünet most” gombok), `NewEntryPanel`, `PrivateEventForm`, `ManualBookingForm` (kezdés + átírható befejezés), `BookingDetails`, `PrivateEventDetails`, `CalendarLegend`, `BookingEndTime` (foglalás befejezése, időtartam) |
| `components/pricelist/` | Árlista szerkesztése: `PriceListEditor` (lista + ablak), `ServiceForm` (név, saját időtartam, ár), `ServiceRow` (egy sor gombokkal) |
| `components/schedule/` | `WorkingHoursEditor` (heti munkaidő sávokkal, hétfő másolása), `BookingRulesForm` (foglalási szabályok), `StartPagePicker` (mi nyíljon meg az app megnyitásakor) |
| `components/directory/` | Nyilvános oldalak: `DirectoryCard`, `DirectorySearch`, `ProfileHero` (barber/egység nyitó rész), `ServicePriceList`, `OpeningHours`, `TeamMemberCard` |
| `components/booking/` | Foglalás: `BookingWizard` (3 lépés), `ServicePicker`, `DayPicker`, `SlotGrid`, `MyBookingCard`, `CancelMyBooking`, `AlternativeSlots` (2–3 másik időpont, egy kattintásos újrafoglalás), `ProposalResponse` (a vendég válasza az áthelyezési javaslatra); lezajlott foglalásnál vágásnapló és „Ugyanezt kérem újra” |
| `components/requests/` | Döntések: `RequestCard` (függő kérés), `BookingDecision` (jóváhagyás / elutasítás / lemondás gombok – a naptárban is), `RescheduleForm` (áthelyezés: javaslat vagy közvetlen, „Biztos?” lépéssel), `RescheduleCard` (javaslat állapota, döntés utána), `ProposalDetails`, `WithdrawProposalButton`, `LiveRefresh` (élő frissítés) |
| `components/admin/` | Platform admin: `StatsGrid`, `BarberAdminCard`, `ShopAdminCard`, `BarberDetails`, `StatusActions` (jóváhagyás/elutasítás/felfüggesztés gombok), `AdminManager` (adminok listája, admin jog megadása / elvétele) |
| `components/shops/` | Egységek: `ShopForm`, `ShopStatusCard`, `MembersList`, `InviteForm` (link másolással), `PendingInvitesList`, `ShopCalendarOverview` (a vezető áttekintése), `MembershipCard` (tagként kilépés), `InviteAnswer` (meghívó elfogadása) |
| `components/system/` | `SystemStatusCard` (az `/allapot` oldalhoz), `ServiceWorkerRegistrar` (a service worker betöltése), `InstallAppButton` („Telepítsd a telefonodra” – Androidon egy koppintás, iPhone-on útmutató) |
| `components/notifications/` | Értesítések: `NotificationItem`, `PushSettings` (be-/kikapcsolás ezen az eszközön, próba, iPhone-útmutató), `MarkAllRead` |
| `styles/` | `globals.css` (**az összes szín egy helyen**), `calendar.css` (a naptár kinézete, színkódok), `fonts.ts` (Oswald címekhez, Inter szöveghez), `motion.css` (animációk, „ct-” osztályok; animáció-kikapcsolásnál nem futnak) |
| `lib/` | Böngészőben futó segédkód: `calendarEvents.ts` (naptáradat → naptár-események, tesztelve), `useOnActionResult.ts`, `useFullPageRedirect.ts`, `useSubmitWithoutReset.ts` (beküldés alaphelyzetbe állítás nélkül – élő mezős űrlapokhoz), `useBookingChanges.ts` (Realtime: foglalások, javaslatok, értesítések figyelése), `push.ts` (push-támogatás, feliratkozás, iPhone-felismerés), `installPrompt.ts` (telepíthetőség figyelése), `resizeImage.ts` (kép kicsinyítése feltöltés előtt), `useCollapseOnSave.ts` (sikeres mentés után összecsukja a részt), `supabase-browser.ts` |

**Szabályok**
- Egy fájl = egy komponens, a fájl neve = a komponens neve (`Card.tsx` → `Card`).
- A komponens nem kér le adatot közvetlenül: az oldal (`app/`) adja át neki props-ként.
  Űrlapoknál a komponens a backend `*.actions.ts` függvényét hívja.
- A `"use client"` a fájl elején azt jelenti, hogy a komponens a böngészőben is fut (gépelésre, kattintásra reagál).
- Minden felirat magyar.

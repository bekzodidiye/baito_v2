# UI inventory — Baito

Built from the router (`src/components/AppRoutes.tsx`) and the admin tab list
(`src/features/admin/AdminSidebar.tsx`), not by wandering the app (§9.1).
This file is the **coverage denominator**. An element that could not be reached
is `BLOCKED` with a reason — never dropped to improve the fraction.

## Screens

| ID | Route | Component | Who can reach it |
|---|---|---|---|
| SCR-01 | `/` | LandingScreen | public |
| SCR-02 | `/jobs` | JobSearchScreen | worker |
| SCR-03 | `/jobs/:id` | JobSearchScreen | worker |
| SCR-04 | `/calendar` | CalendarScreen | worker |
| SCR-05 | `/messages` | MessagesScreen | any-signed-in |
| SCR-06 | `/chat` | ChatScreen | any-signed-in |
| SCR-07 | `/chats/:id` | ChatScreen | any-signed-in |
| SCR-08 | `/notifications` | NotificationsScreen | any-signed-in |
| SCR-09 | `/profile` | ProfileScreen | worker |
| SCR-10 | `/applications` | ApplicationsScreen | worker |
| SCR-11 | `/reviews` | ReviewsScreen | worker |
| SCR-12 | `/payments` | PaymentsScreen | worker,employer |
| SCR-13 | `/payments/my-cards` | MyCardsScreen | worker,employer |
| SCR-14 | `/payments/add-card` | AddCardScreen | worker,employer |
| SCR-15 | `/payments/top-up` | TopUpScreen | worker,employer |
| SCR-16 | `/payments/success` | PaymentResult | worker |
| SCR-17 | `/payments/error` | PaymentResult | worker |
| SCR-18 | `/taxes` | TaxesScreen | worker |
| SCR-19 | `/verification` | VerificationPendingScreen | any-signed-in |
| SCR-20 | `/login` | ? | guest-only |
| SCR-21 | `/register` | ? | guest-only |
| SCR-22 | `/settings` | SettingsLayout | any-signed-in |
| SCR-23 | `/security` | SettingsLayout | any-signed-in |
| SCR-24 | `/help` | SettingsLayout | any-signed-in |
| SCR-25 | `/faq` | SettingsLayout | public |
| SCR-26 | `/guide` | SettingsLayout | public |
| SCR-27 | `/terms` | SettingsLayout | public |
| SCR-28 | `/privacy` | SettingsLayout | public |
| SCR-29 | `/support-chat` | SettingsLayout | any-signed-in |
| SCR-30 | `/employer-dashboard` | EmployerPanel | employer |
| SCR-31 | `/employer-jobs` | EmployerPanel | employer |
| SCR-32 | `/employer-applicants` | EmployerPanel | employer |
| SCR-33 | `/employer-chats` | EmployerPanel | employer |
| SCR-34 | `/employer-profile` | EmployerPanel | employer |
| SCR-35 | `/employer-analytics` | EmployerPanel | employer |
| SCR-36 | `/employer-post` | EmployerPanel | employer |
| SCR-37 | `/admin` | AdminPanel | admin |
| SCR-38 | `*` | NotFoundScreen | public |

Routes: **38**

## Admin sub-screens

`/admin` renders one of these at a time, selected from the sidebar. Each is a
screen for sweep purposes: it has its own data, controls and empty state.

| ID | Tab | Reached by |
|---|---|---|
| ADM-01 | `analytics` | admin only, sidebar |
| ADM-02 | `audit_logs` | admin only, sidebar |
| ADM-03 | `auto_escrow_docs` | admin only, sidebar |
| ADM-04 | `auto_matching` | admin only, sidebar |
| ADM-05 | `auto_moderation` | admin only, sidebar |
| ADM-06 | `auto_reports` | admin only, sidebar |
| ADM-07 | `broadcast` | admin only, sidebar |
| ADM-08 | `categories` | admin only, sidebar |
| ADM-09 | `daily_jobs` | admin only, sidebar |
| ADM-10 | `disputes` | admin only, sidebar |
| ADM-11 | `jobs` | admin only, sidebar |
| ADM-12 | `notification_rules` | admin only, sidebar |
| ADM-13 | `overview` | admin only, sidebar |
| ADM-14 | `payouts` | admin only, sidebar |
| ADM-15 | `promotions` | admin only, sidebar |
| ADM-16 | `regions` | admin only, sidebar |
| ADM-17 | `settings` | admin only, sidebar |
| ADM-18 | `support` | admin only, sidebar |
| ADM-19 | `transactions` | admin only, sidebar |
| ADM-20 | `users` | admin only, sidebar |
| ADM-21 | `verifications` | admin only, sidebar |

Admin sub-screens: **21**

## Denominator

Screens in inventory: **59** (38 routes + 21 admin sub-screens).

## State variants to reach per screen (§9.1.2)

empty · loading · populated · error · permission-denied · offline ·
no-results-after-filtering

Recorded per screen in `ui-sweep.md` where reached; where a variant could not
be produced, that is stated rather than omitted.

## Element enumeration

Element counts are taken from the live DOM during the sweep (every focusable
and clickable control on the rendered screen, per role), because conditional
rendering, modals and role gates make a static count from JSX unreliable.
The method is stated here so the denominator is auditable; per-screen counts
are in `ui-sweep.md`.

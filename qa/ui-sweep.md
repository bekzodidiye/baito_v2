# UI sweep — Baito

**Mode run this pass (§9.4):** automated crawl at 100% of reachable routes,
plus a targeted deep pass on the money, permission and deep-link paths.
A hand-click of all 1,423 individual controls was **not** performed in this
pass and is not claimed — see *Not exercised* at the end.

Every row below was observed in a live browser against the local stack.
For each screen the crawl recorded: did it land on the route asked for, did it
crash into the error boundary, did the console log an error, did any request
fail, and did the body scroll sideways.

## Worker (23 screens)

| Screen | Elements | Landed | Crash | Console | Failed req | Overflow | Status |
|---|---|---|---|---|---|---|---|
| `/jobs` | 42 | ✓ | none | clean | none | 0 | **PASS** |
| `/calendar` | 51 | ✓ | none | clean | none | 0 | **PASS** |
| `/messages` | 20 | ✓ | none | clean | none | 0 | **PASS** |
| `/notifications` | 21 | ✓ | none | clean | none | 0 | **PASS** |
| `/profile` | 25 | ✓ | none | clean | none | 0 | **PASS** |
| `/applications` | 20 | ✓ | none | clean | none | 0 | **PASS** |
| `/reviews` | 15 | ✓ | none | clean | none | 0 | **PASS** |
| `/payments` | 26 | ✓ | none | clean | none | 0 | **PASS** |
| `/payments/my-cards` | 16 | ✓ | none | clean | none | 0 | **PASS** |
| `/payments/add-card` | 22 | ✓ | none | clean | none | 0 | **PASS** |
| `/payments/top-up` | 14 | ✓ | none | clean | none | 0 | **PASS** |
| `/taxes` | 5 | ✓ | none | clean | none | 0 | **PASS** |
| `/verification` | 9 | ✓ | none | clean | none | 0 | **PASS** |
| `/settings` | 16 | ✓ | none | clean | none | 0 | **PASS** |
| `/security` | 17 | ✓ | none | clean | none | 0 | **PASS** |
| `/help` | 18 | ✓ | none | clean | none | 0 | **PASS** |
| `/faq` | 17 | ✓ | none | clean | none | 0 | **PASS** |
| `/guide` | 12 | ✓ | none | clean | none | 0 | **PASS** |
| `/terms` | 12 | ✓ | none | clean | none | 0 | **PASS** |
| `/privacy` | 23 | ✓ | none | clean | none | 0 | **PASS** |
| `/support-chat` | 14 | ✓ | none | clean | none | 0 | **PASS** |
| `/chat` | 20 | ✓ | none | clean | none | 0 | **PASS** |
| `/` | 70 | ✓ | none | clean | none | 0 | **PASS** |

Worker elements observed: **505**

## Employer (8 screens)

| Screen | Elements | Landed | Crash | Console | Failed req | Overflow | Status |
|---|---|---|---|---|---|---|---|
| `/employer-dashboard` | 52 | ✓ | none | clean | none | 0 | **PASS** |
| `/employer-jobs` | 17 | ✓ | none | clean | none | 0 | **PASS** |
| `/employer-applicants` | 13 | ✓ | none | clean | none | 0 | **PASS** |
| `/employer-chats` | 10 | ✓ | none | clean | none | 0 | **PASS** |
| `/employer-profile` | 16 | ✓ | none | clean | none | 0 | **PASS** |
| `/employer-analytics` | 11 | ✓ | none | clean | none | 0 | **PASS** |
| `/employer-post` | 35 | ✓ | none | clean | none | 0 | **PASS** |
| `/payments` | 27 | ✓ | none | clean | none | 0 | **PASS** |

Employer elements observed: **181**

## Admin (21 sub-screens of `/admin`)

| Sub-screen | Elements | Crash | Console | Failed req | Overflow | Status |
|---|---|---|---|---|---|---|
| Umumiy Statistika | 29 | none | clean | none | 0 | **PASS** |
| Foydalanuvchilar | 49 | none | clean | none | 0 | **PASS** |
| Ishlar | 49 | none | clean | none | 0 | **PASS** |
| E'lonlar va Vakansiyalar | 47 | none | clean | none | 0 | **PASS** |
| Kategoriyalar | 31 | none | clean | none | 0 | **PASS** |
| Avto-Shtraf & Spam Bot | 41 | none | clean | none | 0 | **PASS** |
| AI Avto-Matching | 36 | none | clean | none | 0 | **PASS** |
| Avto-Hisobot & Telegram | 35 | none | clean | none | 0 | **PASS** |
| Avto-Escrow Daloatnoma | 35 | none | clean | none | 0 | **PASS** |
| Auto-Xabarnoma Qoidalari | 32 | none | clean | none | 0 | **PASS** |
| Escrow va Tranzaksiyalar | 32 | none | clean | none | 0 | **PASS** |
| To'lovlar va Escrow | 32 | none | clean | none | 0 | **PASS** |
| Nizolar va Shikoyatlar | 29 | none | clean | none | 0 | **PASS** |
| Hujjatlarni Tasdiqlash | 29 | none | clean | none | 0 | **PASS** |
| Audit Loglar Stream | 32 | none | clean | none | 0 | **PASS** |
| Promokodlar | 30 | none | clean | none | 0 | **PASS** |
| Hududlar & Geofencing | 31 | none | clean | none | 0 | **PASS** |
| Support Ticketlar | 33 | none | clean | none | 0 | **PASS** |
| Ommaviy Xabarnoma | 35 | none | clean | none | 0 | **PASS** |
| Chuqur Analitika | 31 | none | clean | none | 0 | **PASS** |
| Tizim Sozlamalari | 39 | none | clean | none | 0 | **PASS** |

Admin elements observed: **737**

## Coverage

Screens in inventory: **59** · visited: **59** (100%)
Interactive elements observed across visited screens: **1513**
Roles swept: worker · employer · admin · (guest, via the login and register screens)

The last seven were swept in a follow-up pass to meet §15's "100% of the §9.1
inventory accounted for". They needed seeded data rather than new access: a job
and a chat were created through the API so the two parameterised routes had a
real id to resolve.

| Screen | Controls | Console | Network | Overflow | Result |
|---|---|---|---|---|---|
| `/login` | 7 | clean | clean | none | **PASS** — 1 control still unnamed (the password-visibility toggle) |
| `/register` | 6 | clean | clean | none | **PASS** — 0 unnamed |
| `*` (catch-all) | 2 | clean | clean | none | **PASS** — renders a real 404 with a way back |
| `/jobs/:id` | 27 | clean | clean | none | **PASS** — deep link resolves, the seeded posting renders |
| `/chats/:id` | 18 | clean | clean | none | **PASS** — deep link resolves, the seeded message renders |
| `/payments/success` | 15 | clean | clean | none | **FAIL** — BUG-006 |
| `/payments/error` | 15 | clean | clean | none | **FAIL** — BUG-006 |

Follow-up elements observed: **90**. One defect found: **BUG-006**, Russian
rendered to an English interface on both payment result screens — which is
precisely why the seven mattered. The earlier locale fix could not reach a
screen nobody had opened.

Checked and **not** a defect: the login screen's "Orqaga" button carries
`type="submit"`, but it sits outside the form, so it submits nothing. Recorded
so the next reader does not re-open it.

## Not exercised — named, not omitted (§9.1)

The seven screens that stood here are now swept; see the table above. What
remains is one limit, and it is a limit of depth rather than of reach.

| Item | Why |
|---|---|
| Individual control clicks | 1,423 controls were enumerated and their screens verified; each control was **not** individually clicked in this pass. The money, permission, deep-link and destructive paths were deep-passed; the rest is breadth only. |

## State variants reached

| Variant | Reached | Where |
|---|---|---|
| populated | yes | all three roles, seeded jobs and accounts |
| empty | yes | `/applications`, `/reviews`, `/taxes`, employer chats, admin disputes and tickets |
| loading | partially | observed in transit; not held open deliberately |
| error | yes | forced 4xx on the permission and deep-link probes |
| permission-denied | yes | 15 admin endpoints as worker, 8 as employer |
| offline | yes | tested in a prior session; not re-run this pass |
| no-results-after-filtering | yes | search for a term with no match |

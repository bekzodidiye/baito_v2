# Baito V3 — Frontend & Mobile Architecture Audit

**Document:** `04_FRONTEND_MOBILE_AUDIT.md`  
**Scope:** Deep inspection of `frontend/src/` (React 19 + Vite) and `mobile/src/` (Ionic + Capacitor), state management, routing, component duplication, divergence analysis, and accessibility.

---

## 1. Executive Frontend & Mobile Assessment

The Baito platform operates two distinct client frontends:
1. **Web Client (`frontend/`):** Built with **React 19**, **Vite**, **Tailwind CSS v4**, **Motion**, and **Zustand**. It is served as static pre-compiled assets via Nginx.
2. **Mobile Client (`mobile/`):** Built with **Ionic React**, **Capacitor**, and **React 18/19**, wrapped into a native Android application container (`mobile/android/`).

```
[Dimension]                     [Web Frontend]    [Mobile Client]   [Key Finding]
Framework & Modernity            A (React 19)      B (React 18/19)   Web uses React 19; Mobile has mixed dependencies.
State Management Cohesion        B-                C                 Dual state models: React Context + Zustand in both.
Component Reusability            B                 F (Duplicated)    27 components copy-pasted into mobile with zero sharing.
Routing & Navigation             B+                C-                Mobile mixes Ionic routing with web AppRoutes.
Dead Code & Hygiene              A-                D                 Mobile contains dead Ionic starter templates and empty folders.
Accessibility (WCAG 2.1 AA)      B+                B                 Solid aria-labels and focus traps; minor contrast gaps.
CI/CD Quality Gates              A (Typecheck+E2E) F (0 CI Jobs)     Mobile completely missing from GitHub Actions CI.
```

---

## 2. The Core Problem: Diverged Codebase Forking (`ARCH-001`)

The mobile client (`mobile/src/`) was created by **copying the web frontend codebase wholesale** rather than extracting shared components and utilities into a shared monorepo package.

### 2.1 Component Duplication Inventory
Out of 29 components in `frontend/src/components/`, **27 components are duplicated identically or near-identically in `mobile/src/components/`**:

```
Shared / Copied Components (27):
├── AppRoutes.tsx            ├── LanguageSelector.tsx      ├── common/
├── BottomNav.tsx            ├── Logo.tsx                  ├── job-details/
├── Drawer.tsx               ├── MenuModals.tsx            ├── landing/
├── DrawerMenuItem.tsx       ├── NotFoundScreen.tsx        ├── login/
├── ErrorBoundary.tsx        ├── OnboardingTour.tsx        ├── map/
├── GatedLockScreen.tsx      ├── RegionSelector.tsx        ├── menu/
├── Header.tsx               ├── RegionSelectorList.tsx    ├── messages/
├── Sidebar.tsx              ├── ToastContainer.tsx        ├── notifications/
└── chat/                    └── settings/                 └── ui/
```

### 2.2 Proof of Divergence
Because there is no symlink or package reference, changes made to the web client have drifted away from the mobile client.

**Example: `Header.tsx` Divergence**
- In [`frontend/src/components/Header.tsx`](file:///home/Bekzod/Desktop/baito-v3-/frontend/src/components/Header.tsx#L1-L25):
  Refactored to cleanly consume state from Zustand:
  ```typescript
  import { useUIStore } from "../store/useUIStore";
  import { useAuthStore } from "../store/useAuthStore";
  ...
  const language = useAuthStore(s => s.language);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  ```
- In [`mobile/src/components/Header.tsx`](file:///home/Bekzod/Desktop/baito-v3-/mobile/src/components/Header.tsx#L1-L25):
  Still bound to legacy `AppContext`:
  ```typescript
  import { useApp } from '../context/AppContext';
  import { useUIStore } from '../store/useUIStore';
  ```

**Impact:** Every bugfix, security patch, translation improvement, or UI adjustment made to the web application must be manually backported to mobile. In practice, developers forget, leading to silent mobile bugs, broken flows, and inconsistent user experiences.

---

## 3. State Management Fragmentation: Context vs. Zustand

Both `frontend/` and `mobile/` suffer from **state fragmentation across two competing state patterns**:

1. **Zustand Stores (`src/store/`):**
   - `useAuthStore.ts`: Manages `token`, `userProfile`, `isLoggedIn`, and active `language`.
   - `useUIStore.ts`: Manages modal visibilities, active drawer, unread notification counts, and map view filters.
2. **React Context (`src/context/`):**
   - `AppContext.tsx`: A 200+ line God Context that re-implements `user`, `role`, `unreadCount`, `activeJob`, and re-exports duplicate functions.
   - `useJobsData.ts`: Manages job lists, pagination, and map viewport state inside Context.
   - `useChatsData.ts`: Manages WebSocket messages and chat lists inside Context.

### Why this is an architectural defect:
- **Excessive Re-renders:** When `AppContext` updates an unrelated property, every consumer component re-renders because React Context lacks fine-grained selector subscriptions (unlike Zustand).
- **Dual Source of Truth:** `useAuthStore.getState().userProfile` can hold a different state than `useApp().user` if one updates without notifying the other.
- **Cognitive Load:** Developers writing new features must constantly guess whether to put state into Zustand or React Context.

**Remediation:** Consolidate all global state into Zustand stores (`useAuthStore`, `useJobsStore`, `useChatStore`, `useUIStore`). Completely eliminate `AppContext.tsx`.

---

## 4. Mobile Dead Code & Starter Boilerplate

The mobile application contains untouched template artifacts left over from the initial `ionic start` scaffolding:

1. **`mobile/src/pages/Home.tsx` & `Home.css`:**
   ```typescript
   import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
   import ExploreContainer from '../components/ExploreContainer';
   ...
   <IonTitle>Blank</IonTitle>
   <ExploreContainer />
   ```
   This component is **never imported, never routed, and never rendered**.
2. **`mobile/src/components/ExploreContainer.tsx` & `ExploreContainer.css`:**
   Starter UI with hardcoded documentation links ("UI Components", "Ready to create an app?"). Completely dead code.
3. **Empty Folder Hierarchy:**
   - `mobile/src/pages/auth/`
   - `mobile/src/pages/common/`
   - `mobile/src/pages/employer/`
   - `mobile/src/pages/worker/`
   - `mobile/src/types/`
   These folders were created on August 26, 2026, and have remained 100% empty.

**Remediation:** Delete `Home.tsx`, `ExploreContainer.tsx`, and the empty directory shells.

---

## 5. UI Architecture, Styling & Accessibility (WCAG 2.1 AA)

### 5.1 Design System & Semantic Tokens
- The web frontend leverages **Tailwind CSS v4** with brand tokens declared in `frontend/src/index.css`:
  - `bg-brand-primary`, `text-brand-primary`, `border-brand-primary/20`
  - Slate neutral scale (`text-slate-900`, `text-slate-600`, `bg-slate-50`)
- **Compliance:** Components largely adhere to semantic tokens. Random hardcoded colors (like `bg-blue-600`) were audited and mostly replaced during recent refactoring passes.

### 5.2 Accessibility Evaluation
- **Focus Management:** Custom focus trap hook ([`frontend/src/components/common/useFocusTrap.test.tsx`](file:///home/Bekzod/Desktop/baito-v3-/frontend/src/components/common/useFocusTrap.test.tsx)) ensures accessible keyboard trapping inside modals and dialogs.
- **Accessible Names:** Interactive buttons and icon buttons carry explicit `aria-label` attributes (e.g. `aria-label="Menyu"`, `aria-label="Xabarlar"`).
- **Decorative SVGs:** Lucide React icons include `aria-hidden="true"`.
- **Keyboard Navigation:** Forms support Tab traversal, Enter to submit, and Esc to dismiss modals.

---

## 6. Frontend Build & Performance

- **Bundler:** Vite 6 with `@vitejs/plugin-react` and gzip compression enabled.
- **Code Splitting:** React routes are lazily loaded (`React.lazy()`) in `AppRoutes.tsx`, ensuring that heavy screens (Admin Panel, Leaflet Map, Chat Screen) are only downloaded when accessed.
- **Static Assets:** Served via Nginx with long-term cache headers (`Cache-Control: public, max-age=31536000, immutable`) for hashed assets in `/assets/`.

---

## 7. Concrete Frontend & Mobile Remediation Roadmap

1. **Immediate (Sprint 1):**
   - Delete dead boilerplate in `mobile/`: `pages/Home.tsx`, `components/ExploreContainer.tsx`, and empty folders.
   - Synchronize diverged components (`Header.tsx`, `useAuthStore.ts`) so mobile shares the same state model as web.
2. **Medium-Term (Sprint 2 - 3):**
   - Migrate `AppContext.tsx` properties into dedicated Zustand stores (`useChatStore`, `useJobsStore`).
   - Eliminate `AppContext.tsx` completely.
3. **Target Architecture (Phase 2):**
   - Extract `components/` and `translations/` into `packages/shared-ui` and `packages/shared-i18n`.
   - Configure npm/pnpm workspaces so both web and mobile import identical component definitions.

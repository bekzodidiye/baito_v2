# 07 — FRONTEND AND MOBILE AUDIT: REACT 19, CAPACITOR & WCAG

## 1. Web Frontend Architecture (React 19 & Vite)

- **UI Component Foundation**:
  - React 19 with concurrent rendering features.
  - Tailwind CSS v4 utilizing CSS variables and semantic design tokens defined in `frontend/src/index.css`.
  - Brand Token Standard: Primary brand `#000666` maps to `bg-brand-primary`, `text-brand-primary`, `border-brand-primary`, `bg-brand-primary/10`, and `border-brand-primary/20`.
- **State Management & Data Fetching**:
  - TanStack Query v5 with query key normalization:
    - Bounding box queries use stable serialized keys: `['jobs', 'map', { minLat, maxLat, minLng, maxLng, clustered }]`.
    - Prevents cache fragmentation and unneeded re-fetches when panning within minor viewport thresholds.
  - Zustand stores (`useAuthStore`, `useChatStore`) handle authentication tokens, active role switching, and unread badge counters.

---

## 2. Mobile Client (Ionic & Capacitor 8)

- **Capacitor Lifecycle & Offline Recovery**:
  - Leaflet map tiles employ an automatic fallback handler (`mapTileRecovery.test.ts`). If OpenStreetMap or CartoDB tile servers drop or time out, the client falls back to alternate tile servers without crashing the WebGL or DOM layer.
  - Chat WebSocket on native platforms passes the JWT in the connection query parameter (`?token=`) since HTTP-only cookies are not uniformly shared between Android WebView native storage and cross-origin endpoints.
- **Mobile Lint & Code Quality Findings**:
  - 336 linting issues exist in `mobile/` (`eslint`). The primary cause is inclusion of compiled Android bridge files (`mobile/android/app/build/intermediates/.../native-bridge.js`) in the ESLint scan path, along with unused utility imports (`unused-imports/no-unused-imports`).
  - Action taken: Cleaned up types in shared definitions; `.eslintignore` must exclude `android/app/build/`.

---

## 3. Accessibility (WCAG 2.1 AA) & Design System Compliance

Audit conducted against [AGENTS.md](file:///home/Bekzod/AGENTS.md) and WCAG 2.1 AA standards:

1. **Accessible Control Names**:
   - Icon-only buttons (such as map locate button, close modals, and search triggers) are outfitted with explicit `aria-label` tags (e.g., `<button aria-label="Mening joylashuvim">`).
2. **Keyboard Navigation & Focus Traps**:
   - Modals (`FinishJobModal`, `PayoutModal`, `MandatoryReviewModal`) utilize focus traps (`useFocusTrap.test.tsx`) to keep keyboard tab navigation confined within the dialog until dismissed.
3. **Decorative SVGs**:
   - Lucide icons purely serving decorative purposes include `aria-hidden="true"`.
4. **Color Contrast & Interactive Targets**:
   - Interactive buttons have minimum touch target dimensions of $44 \times 44$ pixels on mobile screens.
   - Text contrast on `bg-brand-primary` (`#000666`) with white text (`#FFFFFF`) exceeds 14:1, vastly exceeding the WCAG 4.5:1 minimum threshold.

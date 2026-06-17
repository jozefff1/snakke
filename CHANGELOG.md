# Changelog

All notable changes to Snakke will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (June 17, 2026 - AAC vocabulary expansion pack)

- Added 11 high-frequency AAC vocabulary icons to the built-in collection:
  `who`, `what`, `where`, `when`, `this`, `that`, `here`, `there`, `can`,
  `cannot`, `because`.
- Expanded EN/NO matcher keyword maps for the new entries to improve
  text-to-icon conversion and search quality for question words, demonstratives,
  and sentence connectors.
- Added icon-label translations for the new entries in EN, NO, ES, FR, and DE
  to keep icon-label coverage consistent across all supported languages.
- Tuned EN/NO keyword synonyms for the new entries to reduce overly broad
  matches and improve precision in text-to-icon conversion/search.
- Fixed a malformed Norwegian keyword alias for `ball` in the NO mapping.

### Fixed (June 17, 2026 - pairing safety and lint hardening)

- Moved the `/communicate` `Pairing` button inline with sentence action
  controls (next to `Send`) for signed-in users, keeping the QR-style icon and
  direct link to `/dashboard/patients`.
- Stabilized chat history auto-scroll in `CommunicateThread` and `ChatDrawer`
  so refresh/new data keeps the viewport anchored at the latest messages
  instead of intermittently jumping to the top.
- Added demo-only family cross-chat authorization behind `DEMO_FAMILY_CROSS_CHAT`.
  When enabled, connected accepted-pairing graphs up to 5 members can
  communicate across the group for real-life demo testing; when disabled (or if
  the graph is larger), legacy direct pairing chat behavior is preserved.
- Chat room/user list previews now show the latest message plus a compact
  relative timestamp (for example `2m siden`) in both `CommunicateThread`
  and `ChatDrawer`, improving scanability of recent conversations.
- Chat UI labels and sender/status text are now language-aware (EN/NO) in both
  thread and drawer views.
- Chat icon sentence rendering now uses translated icon labels (`tIcon`) with
  custom label override priority, preventing English fallback names while the
  app language is Norwegian.
- In the Type tab, quick phrases now remain visible after selecting a phrase,
  so users can tap multiple quick phrases in sequence without the strip
  disappearing.
- Link and QR pairing are available in both legacy and demo modes.
- In legacy mode, invite email is optional for link pairing; when provided,
  acceptance remains account-locked to that email.
- Pairing invite modal now surfaces backend and network errors so users get
  clear feedback when invite creation fails.
- Pairing invite modal now includes a helper note that explains open link/QR
  pairing (empty email) versus email-locked legacy invite behavior.
- Settings voice panel now shows an Android-specific Norwegian TTS hint when no
  matching Norwegian voice is detected, guiding users to install voice data in
  system text-to-speech settings.
- Added a local-test alternate communication skin on `/communicate` using
  `?view=alt`, preserving all existing communication behavior while changing
  only presentation.
- Expanded functional AAC vocabulary with additional pronoun and positional
  icons (`i`, `my`, `iam`, `on`, `under`, `at`, `in`, `over`) and keyword maps
  in English/Norwegian.
- Hardened icon search ranking to include keyword mappings (EN+NO) instead of
  relying only on icon id/name substring matches.
- Updated chat icon sentence rendering to rebuild sentence text from local icon
  labels so messages display in the currently selected language.
- Excluded generated service worker output (`public/sw.js`) from ESLint to
  avoid false positives from minified generated code.
- Removed current lint blockers in source code:
  - eliminated `any` cast in `communicate/page.tsx` via `IconCategory` guard
  - fixed unescaped apostrophe and unused prop in phrases dashboard page
  - adjusted `useFetch` loading flow to satisfy `set-state-in-effect` rule

### Added (June 16, 2026 - TTS voice selection hardening)

- Added a browser voice picker in dashboard settings with language-aware filtering
  and one-tap voice preview.
- Added local per-language voice preference persistence in localStorage
  (`snakke-speech-voice-preferences`) to avoid live DB migration risk.
- Improved Web Speech voice loading reliability by waiting for `voiceschanged`
  with a timeout fallback when browsers delay voice registration.
- Expanded speech tests to cover Norwegian alias behavior (`nb/no/nn`) and
  preferred voice URI resolution fallbacks.
- Switched Norwegian speech locale requests from `nb-NO` to `no-NO` in runtime
  TTS callers (settings test, sentence speak, learning mode) to improve Android
  voice-engine compatibility.

### Added (June 16, 2026 - paired user presence in chat)

- Enhanced room listing in `GET /api/messages/room` to return accepted paired
  users with relationship, pairing role, last activity timestamp, and
  activity-window online status.
- Updated communicate chat UI (`CommunicateThread`) to show participant online
  indicators and last-active fallback text.
- Updated side chat drawer (`ChatDrawer`) to list approved paired users from
  the room endpoint and display selectable online/offline participant status.

### Added (June 16, 2026 - demo open pairing flag)

- Added `DEMO_OPEN_PAIRING` environment flag for presentation/demo scenarios.
- With `DEMO_OPEN_PAIRING=true`, pairing invites are not recipient-email bound,
  acceptance bypasses invited-email account lock, and join preview hides email
  mismatch warnings.

### Fixed (June 16, 2026 - pairing participant list stability)

- Pairing acceptance now blocks reciprocal duplicate accepted pairings (A->B and
  B->A duplicates).
- `GET /api/messages/room` now deduplicates participant entries by user ID to
  prevent repeated users in chat room lists.
- `GET /api/sessions/paired-users` now deduplicates users to keep selector
  lists stable when legacy duplicate pairings exist.

### Documentation (June 14, 2026 — regulatory brief alignment)

- Added `docs/PROJECT_BRIEF.md` as the authoritative dated regulatory and
  market-validation brief.
- Added `docs/DOCUMENTATION_ALIGNMENT.md` comparing every project document
  against the brief.
- Clarified selected offline persistence versus complete offline sync.
- Marked compliance, accessibility, medical-device, AI, NAV, procurement, and
  production-readiness statements as validation targets rather than established
  conformity.
- Archived the obsolete `next-intl` portion of `MULTILINGUAL_SETUP.md` in favor
  of the maintained `docs/i18n.md` guide.

### Fixed (June 14, 2026 — auth compatibility before tenant migration)

- Fixed login failure introduced when nullable `users.tenant_id` was added to
  the Drizzle schema before the matching database migration was applied.
- Credentials login now selects only the user columns required for
  authentication, avoiding staged/unmigrated columns.
- Login, registration, and forgot-password email lookups now trim and normalize
  email addresses and use case-insensitive SQL matching.
- Registration uses an explicit SQL column list so it remains compatible with
  databases that do not yet contain `users.tenant_id`.
- Documented that tenant/RLS definitions are staged in code and require a
  reviewed, verified migration before being treated as deployed.

### Added (June 13, 2026 — session 19: information pages, RLS foundation, full nav localisation)

#### Information Pages
- **`/research` page** (`src/app/research/page.tsx` + `src/components/features/ResearchPageContent.tsx`)
  - Bilingual EN/NO content using `LanguageContext`
  - Covers: consent-first data model, institutional multi-tenancy, clinical/educational use, compliance roadmap, planned research capabilities
  - Gradient CTA banner linking to `/plans` and `/about`
  - Accessible footer with translated links
  - Server wrapper page (for `metadata`) + client content component (for language switching)
- **`/plans` page** (`src/app/plans/page.tsx` + `src/components/features/PlansPageContent.tsx`)
  - Bilingual EN/NO content using `LanguageContext`
  - Summarises all 9 roadmap phases in plain language for non-technical stakeholders
  - "What is next" section explains current compliance-first sprint focus
  - Links to `/research` and `/about`
  - Same server/client split pattern as `/research`

#### Navigation — full localisation
- **5 new translation keys** added to `LanguageContext.tsx` (both EN and NO dictionaries):
  - `nav.about` → About / Om
  - `nav.research` → Research / Forskning
  - `nav.plans` → Plans / Planer
  - `nav.signIn` → Sign In / Logg inn
  - `nav.signUp` → Sign Up / Registrer deg
- **`Header.tsx`** (public pages) — all hardcoded English nav labels replaced with `t()` calls: Learn, About, Research, Plans, Sign In, Sign Up, Sign Out, Communicate (desktop + mobile menu)
- **`AppHeader.tsx`** (authenticated pages) — identical localisation applied to all nav labels in both desktop and mobile menus
- Navigation now switches language instantly when the user toggles EN/NO — no hardcoded strings remain in either header

#### DB — staged RLS foundation (Phase 9 Sprint 1 groundwork)
- **`tenants` table definition** added to `src/lib/db/schema.ts`
  - Fields: `id`, `name`, `type` (school/clinic/hospital/university/research_center), `country`, `tier` (free/professional/institutional/research), `adminUserId`, timestamps
  - `pgPolicy('tenant_self_isolation')` applied using `set_config('app.current_tenant_id', ...)` runtime context — activates SQL-layer tenant isolation for this table
  - `tenantsRelations` wired to `users`
- **`tenantId`** column definition (nullable UUID) added to the `users` schema
  - Nullable by design: individual family users have no tenant; institutional users receive a `tenantId` at org onboarding
  - `tenant` relation added to `usersRelations`
- **`withTenantContext(tenantId, operation)`** added to `src/lib/db/client.ts`
  - Uses `Pool` + transaction from `@neondatabase/serverless` (lazy-initialised)
  - Sets `app.current_tenant_id` inside transaction before executing the operation — activates all `pgPolicy` rules on RLS-protected tables
  - Pool is lazy-initialised (no cold-start overhead on non-tenant routes)
  - Existing `db` (neon-http) export is unchanged — all current API routes continue to work without modification
  - **Note**: `pgPolicy` on existing tables (`pairings`, `messages`, etc.) deferred to Phase 9 Sprint 1 migration to avoid breaking current routes
- **Deployment note**: these definitions are staged in code; the corresponding
  database migration has not yet been applied or policy-tested in every environment

### Fixed (June 12, 2026 — session 18: documentation audit & UX improvement)
- **Icon count verification** — Updated all documentation to reflect actual 101 built-in icons (was 89/95 in various docs)
  - Files updated: `README.md`, `PROJECT_OVERVIEW.md`, `PLAN.md`, `SUGGESTIONS.md`
- **Supervisor direct communication redirect** (`/api/pairings/accept`, `/join/[token]`)
  - API now returns `requesterId` in accept response alongside `isSupervisorRole`
  - When supervisor (guardian/therapist/teacher) accepts a pairing, they are redirected to `/dashboard/patients/[requesterId]` (direct communication view) instead of the patient list
  - Non-supervisor acceptors continue to redirect to `/dashboard/patients` (list view)
  - Improves UX: supervisors can start communicating immediately after accepting
  - Feature only takes effect after pairing acceptance; no change to invite generation or acceptance flow logic

### Refactored (May 23, 2026 — session 6: deduplication)
- **Shared utility: `src/lib/auth/requireAuth.ts`**
  - Extracted repeated 3-line auth guard (`auth()` + null check + 401 response) into a single helper
  - Applied to all 10 protected API route files: `preferences`, `profile`, `icons`, `icons/[id]`, `pairings`, `pairings/[id]`, `pairings/accept`, `sessions`, `sessions/paired-users`, `patients/[id]/sessions`
- **Shared utility: `src/lib/api/errorHandler.ts`**
  - Extracted repeated `console.error + NextResponse 500` two-liner into `handleApiError(error, context)`
  - Applied to 6 route files (11 catch blocks): `icons`, `icons/[id]`, `preferences`, `profile`, `sessions`, `sessions/paired-users`
- **Shared utility: `src/lib/utils/formatters.ts`**
  - Extracted `formatDate(iso)` and `formatTime(iso)` from inline functions in `history/page.tsx`
  - Applied to `dashboard/history/page.tsx` (removed local functions) and `dashboard/patients/[id]/page.tsx` (replaced inline expressions)
- **Hook: `src/hooks/useFlashMessage.ts`**
  - Extracted auto-reset boolean flag pattern (`useState(false)` + `setTimeout(() => setX(false), 2000)`) into `useFlashMessage(duration?)`
  - Applied to `SentenceBuilder.tsx`, `dashboard/profile/page.tsx`, `dashboard/settings/page.tsx`
- **Hook: `src/hooks/useFetch.ts`**
  - Created generic GET-on-mount fetch hook with `data`, `loading`, `error`, `refetch`
  - Applied to `dashboard/profile/page.tsx` (replaces manual loading state + fetch useEffect)
- **Shared utility: `src/lib/utils/labels.ts`** (from prior session)
  - `RELATIONSHIP_LABELS`, `ROLE_LABELS`, `ROLE_COLORS`, `getInitials` extracted from 3 files
  - Applied to `patients/page.tsx`, `join/[token]/page.tsx`, `profile/page.tsx`

### Added (session — i18n dashboard pages)
- **Full EN/NO translation for all dashboard pages**
  - `dashboard/page.tsx` — Converted to client component; translated 8 strings (role, cards, nav)
  - `dashboard/profile/page.tsx` — Translated loading, error, labels, buttons, quick links
  - `dashboard/settings/page.tsx` — Translated voice settings, accessibility, text-size controls
  - `dashboard/patients/page.tsx` — Translated full invite modal, badges, action buttons, access section
  - `dashboard/history/page.tsx` — Translated title, back button, viewing-for label, empty states, replay button
- **80+ new translation keys** added to `LanguageContext.tsx` for both EN and NO
  - Sections: `profile.*`, `settings.*`, `patients.*`, `history.*`, extended `dashboard.*`, `nav.*`
- **Navigation header fixes**
  - `communicate/layout.tsx` — Added Dashboard + Learn links to the communicator header
  - `(app)/layout.tsx` — Added 💬 Communicate + Learn links to the dashboard header

### Added (May 17, 2026 — session 4)
- **Premium landing page redesign** (`src/app/page.tsx`)
  - Dark glassmorphism hero (`from-slate-900 via-blue-950`) with animated floating emoji icons
  - Stats strip originally displayed: 101 icons · 2 languages · 100% offline · Free; the offline and licensing claims were later corrected
  - Live demo preview: mock communication board showing 8 icon tiles
  - 6-column feature grid with coloured icon backgrounds
  - Persona cards for Children, Parents & Guardians, Therapists & Teachers
  - Full-width gradient CTA banner with "Create Free Account" button
  - Dark footer with GitHub link
- **Icon press animation** (`src/components/features/IconGrid.tsx`, `src/app/globals.css`)
  - `@keyframes icon-tap` — spring-feel scale snap (0.87 → 1.07 → 1) over 300 ms
  - `tappedId` state in `IconGrid` triggers `icon-tapped` class; resets after 350 ms
  - Animation skipped automatically when `.reduce-motion` class is present
- **Page enter transition** (`src/app/globals.css`, `src/app/(app)/layout.tsx`)
  - `@keyframes page-enter` — 220 ms fade + 10 px upward slide
  - `page-enter` class applied to `<main>` in the authenticated app shell
  - Disabled under `.reduce-motion` and `prefers-reduced-motion`
- **Floating hero animation** (`globals.css`)
  - `@keyframes float-drift` — gentle 6 s ease-in-out drift for background emoji icons on landing page

### Added (May 17, 2026 — session 3)
- **Dark mode toggle button** (`src/components/common/DarkModeToggle.tsx`)
  - Sun/moon SVG button in both app header and public landing header
  - Toggles `dark` / `light` class on `<html>` element; persists to `localStorage['snakke-theme']`
  - FOUC-prevention inline script in `src/app/layout.tsx` applies class before first paint
  - `DarkModeToggle` uses `mounted` guard to avoid hydration mismatch
- **Icon search bar** on `/communicate`
  - Searches across all 89 built-in icons + user's custom icons by name
  - Hides category tabs and recently-used strip while search is active
  - `×` clear button; empty-state localised message (`communicate.searchEmpty`)
  - New translation keys added to `LanguageContext.tsx`: `communicate.searchPlaceholder`, `communicate.searchEmpty`

### Fixed (May 17, 2026 — session 3)
- **Dark mode not working (Tailwind v4 regression)**
  - Root cause: `darkMode: 'class'` in `tailwind.config.ts` is a Tailwind v3 option ignored by v4
  - Fix: added `@custom-variant dark (&:where(.dark, .dark *));` to `globals.css` so `dark:` utilities respond to the `.dark` class
  - CSS variable overrides moved from `@media (prefers-color-scheme: dark) { :root }` to a `.dark {}` selector; system preference retained as fallback via `:root:not(.dark):not(.light)`
  - `DarkModeToggle.toggle()` now also adds/removes the `light` class to prevent the system-preference fallback from overriding an explicit light-mode choice
- **LanguageSwitcher hydration mismatch**
  - `useState` initialiser now always returns `'en'` (safe for SSR); `useEffect` reads `localStorage` and `navigator.language` client-side
  - Removed unused `t` import; added `aria-pressed` to EN/NO buttons

### Fixed (May 17, 2026 — session 2)
- **Build errors** (three TypeScript errors)
  - `communicate/page.tsx` — `icon.label` → `icon.name`
  - `indexedDB.ts` — `MetadataValue` union extended with `unknown[]`
  - `baseApi.ts` — removed dead `state.auth.token` reference

  - Client-side internationalization using React Context API
  - English and Norwegian language support
  - 90+ icon name translations
  - Category label translations (Needs, Actions, Feelings, People, Places, Custom)
  - Full UI text translation coverage
  - Language switcher component in top navigation (🇬🇧 EN / 🇳🇴 NO)
  - localStorage persistence for language preference
  - Speech synthesis support in selected language
  
- **Text-to-Icons Auto-Conversion** (2026-02-11)
  - Automatic icon conversion on space key press
  - Text remains visible while icons build up in sentence builder
  - Confidence threshold matching (0.3 minimum)
  - Real-time icon suggestions while typing
  
- **Communication Interface** (2026-02-10)
  - Icon grid with category filtering
  - Sentence builder with visual icon display
  - Text-to-Icons mode
  - Speech-to-Icons mode (placeholder)
  - Click icon to remove from sentence
  - Speak button with text-to-speech
  - Clear sentence button

### Changed
- **i18n Architecture Decision** (2026-02-12)
  - Abandoned next-intl after 200+ messages of debugging failures
  - Implemented simple client-side React Context solution instead
  - Removed middleware.ts and [locale] routing structure
  - URLs remain clean: `/communicate` instead of `/en/communicate`

### Fixed
- **Text-to-Icons UX Issues** (2026-02-11)
  - Fixed auto-conversion blocking input after first letter
  - Fixed icons not appearing in sentence builder
  - Fixed text visibility during typing
  - Lowered confidence threshold to accept more matches
  
- **Build Errors** (2026-02-11)
  - Fixed corrupted console.log causing parsing errors
  - Fixed missing module imports
  - Cleaned up duplicate navigation headers

### Removed
- **next-intl Integration** (2026-02-12)
  - Removed next-intl package
  - Removed src/middleware.ts
  - Removed src/i18n.ts configuration
  - Removed src/app/[locale] routing structure
  - Removed src/components/features/LanguageSwitcher.tsx (old version)
  - Removed messages/en.json and messages/no.json

### Security
- No security updates in this version

## [0.1.0] - 2026-02-08

### Added
- Initial Next.js 15 project setup with App Router
- TypeScript configuration
- Tailwind CSS styling
- Redux Toolkit state management
- NextAuth.js v5 authentication
- Drizzle ORM with Neon Postgres
- Database schema (8 tables)
- PWA configuration with offline support
- IndexedDB for offline storage
- Dark mode support
- Basic icon database with emoji symbols
- Icon matching algorithm with keyword mappings
- Dashboard page structure
- Authentication pages (login, register)

### Technical Decisions

#### Why Client-Side i18n Instead of next-intl?

**Problem**: 
After 200+ messages of attempting to integrate next-intl with Next.js 15 App Router, we encountered persistent failures:
- Routing conflicts with `[locale]` dynamic segments
- Middleware configuration incompatibilities
- Server-side rendering issues with App Router
- Build failures and cache corruption
- Complex URL structure (`/en/communicate` vs `/communicate`)

**Solution**: 
Implemented simple client-side React Context for translations:
- Instant language switching without page reload
- No routing complexity or middleware
- localStorage persistence
- Perfect for AAC apps requiring quick language changes
- More reliable with Next.js 15 App Router

**Files Created**:
- `src/contexts/LanguageContext.tsx` - Complete i18n implementation
- `src/components/common/LanguageSwitcher.tsx` - Language toggle UI
- `docs/i18n.md` - Comprehensive i18n documentation

**Lesson Learned**:
For authenticated PWAs with Next.js 15 App Router where SEO isn't a priority, client-side i18n is simpler, more reliable, and better suited than server-side solutions like next-intl.

---

## Version History

- **v0.1.0** (2026-02-08) - Initial setup with auth and database
- **Unreleased** - Multilingual support, communication interface, text-to-icons

---

## Future Roadmap

### v0.2.0 (Planned)
- [ ] Complete Speech-to-Icons integration
- [ ] Device pairing with QR codes
- [ ] Offline sync engine
- [ ] Custom icon upload
- [ ] Session logging

### v0.3.0 (Planned)
- [ ] Additional languages (Spanish, French, German)
- [ ] Advanced icon matching with ML
- [ ] Analytics dashboard
- [ ] Therapist portal

### v1.0.0 (Planned)
- [ ] Production-ready release
- [ ] Full offline functionality
- [ ] Native app wrappers (iOS/Android)
- [ ] ARASAAC icon integration
- [ ] Multi-user support

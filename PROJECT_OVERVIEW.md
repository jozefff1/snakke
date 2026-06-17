# Snakke — Project Overview

> **Snakke** is a source-available Augmentative and Alternative Communication
> (AAC) Progressive Web App prototype designed for children and adults with communication
> challenges. It provides icons, text-to-icon conversion, speech features, and
> selected offline persistence. Complete offline synchronization is not yet
> implemented.

> **Authority note:** For regulatory, compliance, market, funding, accessibility,
> medical-device, AI, NAV, and procurement claims, see
> [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md).

---

## What is AAC?

Augmentative and Alternative Communication (AAC) refers to all forms of communication outside of oral speech that are used to express thoughts, needs, wants, and ideas. Snakke is a digital AAC tool that translates words and speech into visual symbol-based communication boards.

---

## Who Is This For?

| User Role | Description |
|---|---|
| **Child** | Primary AAC user. Communicates via icons. |
| **Guardian** | Parent or caregiver who monitors and configures the child's board. |
| **Therapist** | Speech-language therapist who sets up boards and reviews progress. |
| **Teacher** | School-based support who may configure classroom-specific icons. |

---

## Current Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router, webpack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| State | Redux Toolkit + RTK Query |
| Auth | NextAuth.js v5 |
| Database | Neon Serverless Postgres |
| ORM | Drizzle ORM ^0.45.2 |
| Storage | Vercel Blob |
| Offline | IndexedDB (via `idb`) |
| PWA | `@serwist/next` v9.5.11 + `serwist` |
| Deployment | Vercel (auto-deploy from `snakke` remote) |
| i18n | Custom React Context (client-side, **not** next-intl) |
| Languages | EN, NO, ES, FR, DE |
| Email | Resend |
| Email templates | Resend (verification + password reset + invite links) |
| Inbound email | Resend inbound + `svix` webhook signature verification |

---

## Architecture

```
Root
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Login, Register, Verify-email, Forgot/Reset-password pages
│   │   ├── about/                   # About Snakke — bilingual EN/NO (uses AboutContent.tsx)
│   │   ├── research/                # Research & Institutional page — bilingual EN/NO (ResearchPageContent.tsx)
│   │   ├── plans/                   # Roadmap plans page — bilingual EN/NO (PlansPageContent.tsx)
│   │   ├── communicate/             # Public AAC board (guest + authenticated)
│   │   │   └── layout.tsx           # Communicate-specific layout (header + guest banner)
│   │   ├── (app)/                   # Protected routes (redirect to /login if unauthenticated)
│   │   └── dashboard/               # User dashboard + settings
│   │       ├── icons/               # Custom icon upload
│   │       └── phrases/             # My phrases — save/load/use favourite sentence sets
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   │   ├── auth/register/       # Registration API
│   │   │   ├── auth/verify-email/   # Email token verification API
│   │   │   ├── auth/forgot-password/ # Request password reset email
│   │   │   ├── auth/reset-password/  # Validate token + save new password
│   │   │   ├── icons/               # Custom icon API (Blob + DB)
│   │   │   ├── messages/            # POST send message, GET fetch history
│   │   │   │   └── room/            # GET merged thread between paired users (?since= for incremental polling)
│   │   │   ├── sessions/            # Communication session log API
│   │   │   ├── preferences/         # Voice + theme preferences API
│   │   │   ├── profile/             # User profile read/update API
│   │   │   └── webhooks/resend/     # Resend inbound email webhook (svix signature verified)
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Landing page
│   ├── components/
│   │   ├── features/
│   │   │   ├── CategorySelector     # AAC category tabs
│   │   │   ├── IconGrid             # Icon display grid
│   │   │   ├── SentenceBuilder      # Built sentence + TTS, drag-to-reorder
│   │   │   ├── TextToIcons          # Type → icons
│   │   │   ├── SpeechToIcons        # Speak → icons
│   │   │   ├── CustomIconUpload     # Upload personal icons
│   │   │   ├── LandingPage.tsx      # Client-side landing page
│   │   │   ├── AboutContent.tsx     # Client component: bilingual about page body (EN+NO)
│   │   │   ├── AboutContactForm.tsx # Contact form with useLanguage
│   │   │   ├── communication/
│   │   │   │   ├── CommunicateThread.tsx  # Live pictogram chat thread (3s polling, collapsible, sound+visual notifications)
│   │   │   │   └── ChatDrawer.tsx         # Reusable chat side panel (used in dashboard/patients/[id])
│   │   │   └── learning/
│   │   │       ├── LearnPage.tsx        # /learn page wrapper
│   │   │       ├── LanguagePicker.tsx   # Pick learnFrom / learnTarget
│   │   │       └── FlashcardDeck.tsx    # Flashcard/Writing/Speaking modes
│   │   ├── common/
│   │   │   ├── LanguageSwitcher.tsx # Language selector (EN/NO/ES/FR/DE)
│   │   │   └── DarkModeToggle.tsx   # Sun/moon toggle
│   │   └── layout/
│   │       ├── Header.tsx           # Top nav (all public pages) — fully localised via t() including About, Research, Plans, Learn
│   │       └── AppHeader.tsx        # Client header for (app) + communicate layouts — fully localised via t()
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── iconMatcher.ts       # Text → icon matching engine
│   │   │   └── keywordMappings/
│   │   │       ├── en.ts            # English keyword map
│   │   │       └── no.ts            # Norwegian keyword map
│   │   ├── api/
│   │   │   └── errorHandler.ts      # handleApiError(error, context) — shared 500 helper
│   │   ├── auth/
│   │   │   ├── config.ts            # NextAuth v5 config
│   │   │   └── requireAuth.ts       # Auth guard for API routes → { userId } | 401 response
│   │   ├── data/icons.ts            # Built-in icon database
│   │   ├── db/
│   │   │   ├── client.ts            # Neon Drizzle client
│   │   │   └── schema.ts            # All DB table definitions
│   │   ├── offline/indexedDB.ts     # Offline storage utilities
│   │   ├── services/speechService   # Web Speech API wrapper
│   │   └── utils/
│   │       ├── cn.ts                # Tailwind class merge helper
│   │       ├── constants.ts         # App-wide constants
│   │       ├── formatters.ts        # formatDate / formatTime helpers
│   │       ├── labels.ts            # RELATIONSHIP_LABELS, ROLE_LABELS, ROLE_COLORS, getInitials
│   │       └── validators.ts        # Zod schemas / validation helpers
│   ├── hooks/
│   │   ├── useFlashMessage.ts       # Auto-reset boolean for transient UI feedback
│   │   ├── useFetch.ts              # Generic GET-on-mount fetch hook
│   │   ├── useIconLabels.ts         # Per-icon custom label overrides (localStorage + event bus)
│   │   ├── useIconRegistry.ts       # Unified icon registry: ICON_DATABASE + custom icons + labels; getByCategory / getById / search
│   │   ├── usePinnedBottomScroll.ts # Shared chat bottom-anchor behavior with layout/resize handling
│   │   └── usePreferences.ts        # User preferences (voice, a11y) + Redux sync
│   ├── contexts/
│   │   └── LanguageContext.tsx      # i18n: EN/NO full UI (all pages incl. auth+about), ES/FR/DE icons only
│   ├── store/
│   │   ├── slices/
│   │   │   ├── communicationSlice   # Icons, sentence, favoritePhrases, customIcons (add/update/remove/reorder actions)
│   │   │   ├── pairingSlice         # Device pairing state
│   │   │   └── uiSlice             # Theme, modals
│   │   └── index.ts                 # Redux store setup
│   └── types/                       # Shared TypeScript types
├── public/
│   └── manifest.json                # PWA manifest
├── drizzle.config.ts                # Drizzle Kit config
├── next.config.ts                   # Next.js + PWA config
└── tailwind.config.ts               # Tailwind config
```

---

## Database Schema (10 Code Definitions)

```
tenants              → Staged Phase 9 institutional isolation unit; migration pending
users                → All user accounts; nullable tenantId is staged in code and migration pending
devices              → Registered devices per user
pairings             → Guardian ↔ Child relationships
pairing_requests     → Invite tokens (link + QR in both modes; optional email lock in legacy mode, open in demo mode, rate-limited, expiring)
messages             → Communication history between users
communication_sessions → Icon sentence session logs
user_preferences     → Per-user settings (theme, language, TTS)
custom_icons         → User-uploaded icon images (Blob URL + metadata)
password_history     → Last 5 password hashes per user (prevents password reuse)
```

The connected database can remain on the pre-tenant schema while Phase 9 is
being prepared. Declaring a column in Drizzle does not add it to Postgres until
the migration is applied. During this compatibility window, auth routes use
explicit projections/inserts so login and registration do not request the
staged `users.tenant_id` column.

---

## Key Features (Current)

| Feature | Status |
|---|---|
| Email/password registration and login | ✅ |
| Email verification + password reset (Resend) | ✅ |
| Password history — prevent reuse of last 5 | ✅ |
| Role-based accounts (child/guardian/teacher/therapist) | ✅ |
| AAC icon board — 101 icons, 6 categories | ✅ |
| ARASAAC pictograms (static CDN, CC BY-NC-SA 4.0) | ✅ |
| Text → Icon auto-conversion (keyword matcher) | ✅ |
| Speech → Icon conversion (Web Speech API) | ✅ |
| Sentence builder with TTS playback | ✅ |
| Drag-and-drop sentence icon reordering (`@dnd-kit/react`) | ✅ |
| Custom icon upload (Vercel Blob, MIME/size validated) | ✅ |
| Custom icons in matcher + manage (rename/delete) | ✅ |
| Recently used icons row | ✅ |
| Icon search bar | ✅ |
| Favourite phrases (IDB-persisted) | ✅ |
| My phrases — dashboard page to create/manage/load phrase sets | ✅ |
| Communication session history | ✅ |
| Multilingual UI — EN + NO full, ES/FR/DE icon labels | ✅ |
| Language switcher in header (all pages) | ✅ |
| 5-language learning mode — Flashcard / Writing / Speaking | ✅ |
| Dark mode (Tailwind v4 class-based, FOUC-free) | ✅ |
| PWA — installable, service worker (Serwist) | ✅ |
| Selected IndexedDB-backed local persistence | ✅ |
| Complete conflict-safe offline synchronization | ❌ Not started |
| Voice settings UI (speed, pitch, test) | ✅ |
| User profile page (view / edit name) | ✅ |
| Accessibility preferences (high contrast, reduce motion, text size, haptic) | ✅ |
| Premium landing page (translated, glassmorphism) | ✅ |
| Security headers (CSP-ready, X-Frame, Referrer-Policy) | ✅ |
| Fully translated dashboard — all pages (EN + NO) | ✅ |
| Supervisor pairing — invite via link or email | ✅ |
| Pairing security — email-bound invites, rate limiting, recipient validation | ✅ |
| Pending invites inbox (accept/decline from dashboard) | ✅ |
| Email mismatch warning on /join/[token] page | ✅ |
| Supervisor history with patient selector | ✅ |
| Pairing access control (accept/revoke, privacy settings) | ✅ |
| Branded PWA icons + favicon (black bg, brand blue) | ✅ |
| Resend inbound email webhook (`/api/webhooks/resend`) | ✅ |
| AI search engine visibility (robots.txt, llms.txt, sitemap, OG) | ✅ |
| Norwegian as default language (browser + server snapshot) | ✅ |
| Real-time pictogram messaging between paired users (3s polling) | ✅ |
| Collapsible chat thread on communicate page with unread badge | ✅ |
| Sound chime (Web Audio API) + visual effects on new messages | ✅ |
| Compact communicate page — icon board dominates, slim toolbar | ✅ |
| Device pairing (QR code) — generate, display, auto-refresh, 5-min expiry, rate-limited; supervisor redirects to `/dashboard/patients/[requesterId]` on accept | ✅ |
| `/about` page — bilingual EN/NO, table of contents, contact form | ✅ |
| `/research` page — institutional/research information, bilingual EN/NO | ✅ |
| `/plans` page — roadmap summary for all stakeholders, bilingual EN/NO | ✅ |
| Navigation fully localised (EN/NO) — all nav labels in Header + AppHeader use `t()` | ✅ |
| Tenant/RLS schema foundation defined in code | ✅ |
| Tenant/RLS migration applied and policy-tested in every environment | ❌ Not started |
| `withTenantContext()` in DB client — transaction wrapper for Phase 9 RLS routes | ✅ |
| Guardian real-time dashboard | ❌ Not started |
| Dynamic ARASAAC API search (30,000+ symbols) | ❌ Not started |

---

## Known Decisions & Constraints

- **No `next-intl`**: Attempted and abandoned after persistent failures with Next.js App Router (routing conflicts, middleware issues, build failures). Client-side React Context i18n is used instead. **Do NOT reintroduce `next-intl`.**
- **Build flags**: Must use `next build --webpack` and `next dev --webpack` — Serwist (PWA) is incompatible with Next.js 16's default Turbopack.
- **Nav localisation**: All navigation labels in `Header.tsx` and `AppHeader.tsx` use `t()` from `LanguageContext`. Do not add hardcoded English strings to either header. New nav keys follow the `nav.*` namespace.
- **Information pages pattern**: `/about`, `/research`, `/plans` use a server page wrapper (for `metadata` export) + a `'use client'` content component (for `useLanguage()`). Do not add `'use client'` or `useLanguage()` directly to a page file that also exports `metadata`.
- **RLS migration state**: `tenants`, nullable `users.tenant_id`, and the tenant policy are defined in `src/lib/db/schema.ts`, but must be treated as staged until a reviewed migration is applied and verified in each environment.
- **RLS pattern**: Use `withTenantContext(tenantId, tx => ...)` from `src/lib/db/client.ts` for any query on RLS-protected tables once Phase 9 migrations enable policies. Never add `pgPolicy` to existing tables without first wrapping all their API routes.
- **QR code pairing**: Fully implemented and working — `GET /api/pairings/qr` generates a 5-minute `nanoid` token stored in `pairing_requests` (not email-bound), rate-limited at 10/hour. `QRCodeModal.tsx` renders a `QRCodeSVG`, counts down, auto-refreshes 10 s before expiry, and shows a manual URL fallback. Triggered from a "QR Code" button in `/dashboard/patients`. Recipient scans with their device camera → opens `/join/[token]` where they review and **accept** the pairing invite — access is not granted automatically on scan. Optional enhancement: `html5-qrcode` is installed for a future in-app scanner (scan from within Snakke itself).
- **Cross-communication participant list**: `GET /api/messages/room` (without `roomUserId`) returns accepted paired users with `pairingRole`, `relationship`, `lastActiveAt`, and activity-window `isOnline` for chat-room selection in both `CommunicateThread` and `ChatDrawer`.
- **Chat history scroll anchor**: room threads in `CommunicateThread` and
  `ChatDrawer` auto-anchor to the latest message across initial refresh and
  delayed layout passes, preventing the viewport from drifting to the top.
- **Communicate pairing shortcut**: `/communicate` shows a direct `Pairing` button (with QR-style icon) inline with sentence action controls for signed-in users, linking to `/dashboard/patients` for fast invite/QR entry.
- **Demo family cross-chat mode**: when `DEMO_FAMILY_CROSS_CHAT=true`, chat authorization expands from direct pair-only to the connected accepted-pairing graph for small demo groups (max 5 members). Legacy direct pairing behavior remains unchanged when the flag is off, and also remains the safety fallback for larger graphs.
- **Demo pairing mode**: When `DEMO_OPEN_PAIRING=true`, pairing is intentionally relaxed for presentations: invite creation does not bind recipient email, invite acceptance bypasses invited-email lock, and join preview omits email-target mismatch warnings.
- **Git remote**: `origin` → `https://github.com/jozefff1/snakke.git`.
- **NextAuth v5**: Uses `AUTH_SECRET` env var (not `NEXTAUTH_SECRET`) and `AUTH_URL` (not `NEXTAUTH_URL`). `trustHost: true` required for Vercel. Auth state is owned by NextAuth — no Redux `authSlice`. Credential emails are trimmed and normalized to lowercase, then matched case-insensitively.
- **Auth/schema compatibility**: Until `users.tenant_id` exists in every database, auth routes must use explicit user column projections/inserts. Avoid `.select()` or full schema-driven inserts on `users`, because Drizzle will include staged columns that older databases do not have.
- **Forgot-password validates email**: `/api/auth/forgot-password` returns 404 if the email is not registered. Reset links are only sent to verified, existing accounts.
- **Password history**: `password_history` table stores last 5 hashes per user. Reuse returns "You cannot reuse a previous password."
- **Offline scope**: IndexedDB persists selected state such as favourite phrases
  and local session data. Complete queued synchronization, retries, conflict
  handling, and verified offline capability remain planned.
- **Compliance status**: Existing controls and roadmap items are not a
  declaration of GDPR, WCAG, medical-device, AI Act, CRA, NAV, or procurement
  conformity. Use `docs/PROJECT_BRIEF.md` as the dated regulatory baseline.
- **ARASAAC pictograms**: Built-in icons use `https://static.arasaac.org/pictograms/{id}/{id}_500.png`. Emoji symbol is the fallback on image error. License: CC BY-NC-SA 4.0.
- **Keyword-based icon matching**: `iconMatcher.ts` is keyword/string based. ML embeddings planned for Phase 6.
- **Language learning**: `learnFrom` / `learnTarget` are any two of EN/NO/ES/FR/DE, freely swappable. Persisted in `localStorage`. ES/FR/DE currently only have icon-label translations — UI strings remain English for those languages until professional translators contribute.
- **`Permissions-Policy`**: `microphone=(self)` is set in security headers — required for the speaking mode in the learning feature.
- **Default language**: Norwegian (`'no'`) is the default for both server-side snapshot and new users with no saved preference. Uses `useSyncExternalStore` with server/client snapshots — no `mounted` guard needed.
- **TTS voice preference scope**: Selected voices are persisted per language in browser localStorage (`snakke-speech-voice-preferences`) to avoid schema changes in the live Neon environment. Browser default voice remains the fallback when a stored voice is unavailable.
- **Resend inbound webhook**: `/api/webhooks/resend` receives `email.received` events, verifies signature via `svix`, and forwards to `admin@arken.pro`. Requires `RESEND_WEBHOOK_SECRET` env var. Contact form sender is `contact@snakke.arken.pro` (verified domain).
- **AI visibility**: `robots.txt` allows `OAI-SearchBot`, `Applebot-Extended`, `Meta-ExternalAgent`, `Amazonbot`, `Bytespider`, `YouBot`. `llms.txt` includes app description, language, pricing, and contact. OG locale is `nb_NO` with `en_US` alternate.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Lazyculture is a Nuxt 4 (SSR) trivia/quiz platform ("plateforme compétitive de quiz et culture générale") with realtime multiplayer modes, XP/ranking systems, adventures, and PWA support. Backend runs on Nuxt's Nitro server with Prisma/PostgreSQL, and Supabase for auth.

## Toolchain (Vite+)

This project uses **Vite+** (`vp`), a unified toolchain wrapping Vite, Vitest, and Oxlint — not raw `vite`/`vitest`/`eslint` commands.

- `vp install` — install dependencies (run after pulling remote changes).
- `vp run dev` — start the Nuxt dev server.
- `vp run build` — production build.
- `vp check` — format, lint, and type-check (auto-fix runs on staged files via `vite.config.ts`).
- `vp test` — run the Vitest suite (tests use `vite-plus/test` imports, e.g. `server/utils/rankHelper.test.ts`). Use standard Vitest CLI filters to target a single test, e.g. `vp test rankHelper`.
- `vp env doctor` — diagnose toolchain/runtime issues.
- `npm run typecheck` (`vue-tsc --noEmit`) also works standalone.

Prisma (not wrapped by `vp`):

- `npx prisma generate` — regenerate the Prisma client after schema changes.
- `npx prisma migrate dev --name MigrationName` — create/apply a migration.

Always run `vp check` and `vp test` before considering a change complete.

## Architecture

**Directory layout** (Nuxt 4 `app/` convention + Nitro `server/`):

- `app/` — Vue frontend: `pages/`, `components/`, `composables/`, `stores/` (Pinia), `middleware/`, `layouts/`.
- `server/api/**/*.{get,post}.ts` — Nitro API routes, grouped by domain (`battle-royale/`, `adventure/`, `ranking/`, `series/`, `theme/`, `question/`, `user/`, `follow/`, `notifications/`, `admin/`, `import/`, `brainrun/`).
- `server/services/` — domain service classes (`QuestionService`, `SeriesService`, `RankingService`, `AdventureService`, etc.) that API routes delegate to.
- `server/utils/` — server-only helpers: `prisma.ts` (Prisma client singleton), `auth.ts` (auth guards), `battleRoyaleManager.ts` / `showdownManager.ts` (in-memory match/session managers for realtime modes), `rankHelper.ts` / `showdownRankHelper.ts` (ranking/LP logic), `pushNotification.ts`, `achievementHelper.ts`, `userProgressHelper.ts`.
- `shared/` — code isomorphic between client and server: DTOs (`shared/DTO/`), domain types (`question.ts`, `theme.ts`, `series.ts`), and `series/seriesAscension.ts`.
- `prisma/schema.prisma` — single source of truth for the data model; `prisma/migrations/` holds generated migrations.

**Auth flow**: `server/middleware/auth.ts` runs on every request, resolves the Supabase user via `serverSupabaseClient(event)`, and stores `event.context.user` / `event.context.supabaseClient`. Route handlers then call `getAuthenticatedUser(event)` / `getSupabaseClient(event)` from `server/utils/auth.ts` to enforce auth, `assertAdmin(userId)` for admin-only routes, or `assertApiKeyOrAdmin(event)` for routes callable both by admins and via `x-api-key`. Client-side route protection uses `app/middleware/admin.ts` and Nuxt route rules in `nuxt.config.ts` (several routes are forced `ssr: false`, e.g. `/admin/**`, `/adventure/**`, `/series/battle-royale`, `/series/showdown`).

**Realtime multiplayer (Battle Royale / Showdown)**: no external pub/sub — `battleRoyaleManager.ts` / `showdownManager.ts` hold match state and connected clients in-memory on the Nitro server. Clients subscribe via Server-Sent Events (`server/api/battle-royale/events.get.ts` calls `createEventStream(event)` and registers a push callback with the manager); actions (join/ready/submit/emote) are separate POST endpoints that mutate manager state and broadcast to registered clients. Because state is in-memory, it does not survive multiple server instances/restarts — keep this in mind for any changes affecting scaling.

**Ranking**: `rankHelper.ts` / `showdownRankHelper.ts` implement LP (league points) gain/loss and division/demotion protection logic per game mode; `BattleRoyaleRank` and `ShowdownRank` Prisma models store per-user standings separately from generic `UserProgress`/XP leveling.

**Series game modes** (`app/pages/series/`: `daily.vue`, `battle-royale.vue`, `showdown.vue`, `ascent.vue`): variants built on the generic `QuestionSeries` / `QuestionSeriesResponse` Prisma models served through `SeriesService`. Mode-specific data lives in the generic `data: Json` field, typed per mode in `shared/series/*.ts` (e.g. `shared/series/seriesAscension.ts` extends the base series/response types with `healthPoint` and an `ended` flag for the "Ascension" roguelite-style mode: sequential questions, lose a life on each wrong answer, run ends at 0 HP).

**Adventures**: sequential stage-based content (`AdventureStage.type` = `STEP`/`CONTROL`/`EXAM`) tracked per user via `UserAdventureProgress` (`currentStage`, `completed`, `stageScores`).

**Brainrun** (`app/pages/series/brainrun/`, `app/components/brainrun/`): solo roguelite mode — 3 acts (`BRAINRUN_TOTAL_ACTS`), each with 7 rooms (6 choice points + a boss) tracked via the `BrainrunRun` / `BrainrunRoom` Prisma models; `server/services/BrainrunService.ts` holds all game logic (room resolution, combat, shop, events, bonuses), delegating pure rules to `server/utils/brainrunLogic.ts` and constants to `server/utils/brainrunConfig.ts`. Content catalogs are defined in code (not DB) under `shared/`: `brainrunItems.ts` (relics/consumables/events), `brainrunTalents.ts` (persistent meta-progression unlocks), `brainrunEnemies.ts` (named Standard/Elite enemies per act, each with 2-3/4-5 question themes — `BrainrunRoom.enemyId` records which was drawn; themes bias question selection via `QuestionService.getRandomIdsByDifficulty`'s optional `themes` param, widening difficulty upward rather than dropping the theme filter if a combo is too thin). `BrainrunMetaProgress` stores cross-run currency (Points de Savoir) and unlocked talents. Before adding new theme/difficulty-gated content, check actual question volume per theme/difficulty combo (e.g. via a one-off Prisma query) rather than assuming — niche "universe" themes (Star Wars, LOTR, Nintendo, etc.) have almost no questions above difficulty 3.

**Notifications**: `Notification` + `PushSubscription` Prisma models. Real-time delivery is push-based over Server-Sent Events, same pattern as Battle Royale/Showdown: `server/api/notifications/stream.get.ts` calls `createEventStream(event)` and registers the connection with `server/utils/notificationStreamManager.ts` (in-memory, keyed by userId, supports multiple tabs per user); `sendToUser()` also resolves dynamic invite statuses (Battle Royale/Showdown) at send time. `server/utils/pushNotification.ts` (web-push) still handles OS/browser push for offline devices. Client-side state lives in `app/stores/notificationStore.ts`.

**PWA**: configured via `@vite-pwa/nuxt` in `nuxt.config.ts` (manifest, workbox, `public/sw-push.js` import for push notifications); `app/components/pwa/` and `app/composables/usePwaInstall.ts` / `usePushSubscription.ts` handle install/subscribe UX.

## Conventions

- Path aliases: `~~/` refers to the project root (used for `server/` and `shared/` imports from anywhere, including server code).
- UI copy and code comments are predominantly in French; match this when editing existing files.
- Prefer delegating business logic from `server/api/**` route handlers into the corresponding `server/services/*Service.ts` class rather than inlining it in the handler.

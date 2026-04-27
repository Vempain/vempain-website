# AGENTS.md

## Big picture

- This repo is a content site monorepo: a Slim/Doctrine PHP backend under `backend/` and a Vite/React frontend under
  `frontend/`, with Docker/Traefik wiring at the repo root.
- Production traffic is split by path, not by host: `/api`, `/file`, and `/health` go to the backend; everything else
  goes to the SPA (`docker-compose*.yml`, `docs/PRODUCTION_SETUP.md`).
- Backend bootstrap lives in `backend/src/bootstrap.php`: middleware order matters. `CorsMiddleware` is added last so it
  executes first, then `JwtMiddleware`, then `ResourceResolverMiddleware`.
- `ResourceResolverMiddleware` is the bridge between website paths and services: `/file/...` is served by `FileService`,
  non-API page paths are resolved by `PageService`, and only then does Slim routing continue.
- Page bodies are not just stored HTML. `backend/src/Application/Service/PageCacheEvaluator.php` may `eval()` PHP-ish
  page content, load helper shims from `backend/legacy/shims/lib`, and persist rendered cache + legacy embed metadata
  back to the DB. When adding page-related features, prefer evaluated/cache content over raw `body` when the UI needs
  what users actually see.
- Most public REST endpoints are defined inline in `backend/src/Infrastructure/Routing/Routes.php`; keep route changes
  paired with the corresponding service/repository change instead of hiding logic in closures.

## Frontend structure

- Frontend boot is `frontend/src/main.tsx`: `BrowserRouter` wraps `AuthProvider` and `ThemeProvider`, then renders
  `App.tsx`.
- `App.tsx` is the application shell only: top bar, side bar, login/search modals, and route mounting. Put feature
  screens in `frontend/src/pages/` and reusable UI in `frontend/src/components/`.
- UI routes are frontend-only. Use helpers from `frontend/src/tools/routes.ts` (`toFrontendPagePath`,
  `toBackendPagePath`, `toDirectoryIndexFrontendPath`) and never send `/pages/...` to backend APIs.
- The page tree/sidebar flow is: top-level directories from `pageAPI.getPublicPageDirectories()` in `App.tsx`, then
  per-directory tree data from `pageAPI.getDirectoryTree()` inside `SideBar.tsx`.
- Page rendering is driven by `frontend/src/components/PageView.tsx` plus `frontend/src/tools/embedParser.ts`. Embed
  parsing supports both literal comments like `<!--vps:embed:...-->` and HTML-encoded comments like
  `&lt;!--vps:embed:...--&gt;`.
- If you add a new embed type, update both `embedParser.ts` and `PageView.tsx`; preserve the `placeholder` field because
  `PageView` replaces embeds by cursor position in the original body.

## Auth/session conventions

- Auth is cookie-based but mirrored in local storage key `jwt_token` (`frontend/src/services/AuthenticationAPI.ts`,
  `frontend/src/services/AbstractAPI.ts`). Keep both in sync when changing session behavior.
- A backend `401` is special: `AbstractAPI` clears `jwt_token` and notifies listeners through `onSessionExpired()`, and
  `AuthProvider` updates the top bar state + warning message.
- Backend JWT handling is intentionally permissive for missing/invalid tokens on public ACL-free content, but expired
  tokens trigger a `401` + cookie clearing in `backend/src/Application/Auth/JwtMiddleware.php`.

## API/data-shape gotchas

- Preserve existing DTO casing; it is intentionally mixed by legacy history. Examples: pages use `file_path`, files use
  `filePath`, galleries use `galleryId`, ACL fields appear as both `acl_id` and `aclId` depending on endpoint.
- `frontend/src/services/PageAPI.ts` instantiates APIs with `import.meta.env.VITE_APP_API_URL`, while
  `frontend/src/services/AbstractAPI.ts` also knows about `VITE_API_BASE_URL`. Prefer following the existing service
  constructors instead of introducing a third env name.
- Page last-items cards rely on evaluated page body content returned by `PageService::getLastItems()`, not just
  metadata.

## Files, theme, and map specifics

- Public file bytes are served from backend `/file/...`; the frontend container separately exposes mounted `/files/...`
  via `frontend/nginx.conf`. Check which path a component needs before changing asset URLs.
- Global theme data is fetched from backend configuration/files; a default seed file exists at
  `deploy/document/site/default-style.json` and must also exist in the mounted file root + DB metadata in production.
- Leaflet CSS is imported once in `frontend/src/main.tsx`; map components are lazy-loaded so avoid moving Leaflet
  imports back into eager top-level bundles.

## Developer workflows

- Root helpers are in `Makefile`: `make install`, `make up`, `make down`, `make logs`, `make backend-dev`,
  `make frontend-dev`.
- Frontend uses Yarn 4 (`frontend/package.json`) and Node >=18. Main checks are `yarn lint`, `yarn typecheck`,
  `yarn test`, and `yarn build:production`.
- Backend checks are Composer-based: `composer lint`, or individually `vendor/bin/phpstan analyse src --memory-limit=1G`
  and `vendor/bin/phpcs src` from `backend/`.
- `frontend/generateBuildInfo.js` writes `frontend/src/buildInfo.json` during builds. Treat `src/buildInfo.json` as
  generated output, not hand-edited source.

## GPS time-series embed

- The `GpsTimeSeriesEmbed` component renders a Leaflet map with a polyline track, cluster markers, and expanded-point
  markers for the GPS dataset identified by the embed tag `<!--vps:embed:gps_timeseries:<identifier>-->`.
- Data is fetched via three backend endpoints: `/api/public/embeds/gps/{id}/overview`, `/track`, and `/clusters`.
- **Critical**: `onViewportChange` passed to `MapViewportBridge` **must be a stable (memoized) callback**. The
  `MapViewportBridge` effect lists `onViewportChange` as a dependency; if the prop is a new inline arrow function on
  every render, the effect re-fires on each cluster fetch, causing an infinite request loop. Always pass the
  `useCallback`
  reference directly (e.g. `onViewportChange={loadClusters}`) rather than wrapping it in `() => {}`.

## Editing guidance specific to this repo

- Keep changes small and local; this codebase mixes modern code with legacy compatibility layers, especially around page
  rendering and ACL behavior.
- When changing routing, verify both the client route helper usage and the backend `file_path` expectation.
- When changing page/gallery/file access rules, trace through repository query -> service -> route -> frontend
  service -> component, because ACL filtering is enforced in several layers.
- Do not normalize API field names, path conventions, or embed comment syntax unless you update every dependent consumer
  in both backend and frontend.

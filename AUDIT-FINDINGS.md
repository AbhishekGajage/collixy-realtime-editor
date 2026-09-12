# Collixy Realtime Editor — Audit Findings

Scan date: 2026-08-26. Static review of all 43 source files under `backend/src` and `frontend/src`, plus package manifests and configs.

## Verification status

ESLint on the frontend passes with **0 errors** (2 `react-hooks/exhaustive-deps` warnings, at `CreateRoom.jsx:397` and `LoginPage.jsx:160`). `node --check` on every backend `src/**/*.js` file passes — there are no syntax errors anywhere. `vite build` could not complete in the audit sandbox because the checked-in `node_modules` was installed on Windows and is missing the Linux rollup binary (`@rollup/rollup-linux-x64-gnu`); this is an artifact of the audit environment, not a defect in the project.

The important consequence: **every defect below is a runtime or logic defect that the linter and the compiler cannot see.** The build being green is not evidence that the app works.

---

## Tier 1 — breaks a real user flow

### 1. The entire realtime collaboration layer is dead

`frontend/src/utils/Actions.js` is a truncated copy of `backend/src/utils/Actions.js`. The backend map has 26 keys, the frontend has 16. Twelve keys are missing from the frontend: `USER_JOINED`, `USER_LEFT`, `CODE_UPDATED`, `CODE_SYNCED`, `LANGUAGE_UPDATED`, `USER_TYPING`, `TYPING`, `NEW_CHAT_MESSAGE`, `GET_ROOM_INFO`, `ROOM_INFO`, `PING`, `PONG`.

This produces two distinct failures at once.

The backend broadcasts on the `*_UPDATED` names — `code-updated`, `language-updated`, `new-chat-message`, `user-joined`, `user-left`. The frontend subscribes to the *inbound* names instead: `socketRef.current.on(ACTIONS.CODE_CHANGE, …)` at `CreateRoom.jsx:258`, `on(ACTIONS.LANGUAGE_CHANGE, …)` at `:289`, `on(ACTIONS.CHAT_MESSAGE, …)` at `:325`. Those are the names the *client sends to the server*; the server never emits them back. So a remote peer's keystrokes, language switches, and chat messages never arrive. `JoinRoom.jsx` has the same mismatch.

Separately, where the frontend does reference a correct name, the constant does not exist locally and silently evaluates to `undefined`. `on(ACTIONS.USER_JOINED, …)` (`CreateRoom.jsx:202`) registers a listener for the event literally named `undefined`, and `emit(ACTIONS.GET_ROOM_INFO, { roomId })` (`CreateRoom.jsx:375`) emits an event named `undefined`. Socket.IO accepts both without complaint.

Nothing throws. The editor loads, the connection succeeds, the user list may even populate from `JOINED` — and collaboration simply never happens. This is the headline bug.

Fix: make `frontend/src/utils/Actions.js` a byte-for-byte port of the backend map (same keys, ESM export), then point each `.on()` at the name the server actually emits rather than the name the client sends.

### 2. Every hard refresh on a protected route logs the user out

`frontend/src/components/ProtectedRoute.jsx:6` destructures `isLoading`:

```js
const { user, isLoading } = useAuth();
if (isLoading) { return <div>Loading...</div>; }
if (!user) { return <Navigate to="/login" state={{ from: location.pathname }} replace />; }
```

`hooks/useAuth.js` returns the raw `UserContext` value, and `Context/userContext.jsx:86` puts **`loading`** on that value — not `isLoading`. So `isLoading` is `undefined`, the loading gate never fires, and the component falls through to the `!user` check on first render. Because localStorage hydration happens in an effect (after commit), `user` is still `null` at that moment. Result: `/dashboard`, `/dashboard/room/create`, and `/dashboard/room/join` all bounce a fully authenticated user to `/login` on every page reload.

Fix: rename the destructured field to `loading` (or expose both from the context).

### 3. `POST /api/users/login` always returns 500

`backend/src/controllers/userController.js:68`:

```js
const isPasswordMatch = await user.matchPassword(password);
```

`models/User.js:314` defines `userSchema.methods.comparePassword`. There is no `matchPassword` anywhere in the codebase. Every request that reaches this line throws `TypeError: user.matchPassword is not a function`, hits `next(error)`, and returns 500 — so the failure is indistinguishable from a server crash rather than surfacing as "invalid credentials".

Note that `authController.js:549` calls `comparePassword` correctly, so only the `/api/users` route is affected. Worth deciding which of the two login endpoints is canonical.

### 4. Registration sends two HTTP responses

`backend/src/controllers/authController.js:467–470`:

```js
sendTokenResponse(user, 201, res, true);   // sets status, cookie, and sends JSON
return res.status(201).json({ … });        // throws ERR_HTTP_HEADERS_SENT
```

The second call throws `ERR_HTTP_HEADERS_SENT`, which is swallowed by the surrounding `catch`, which then tries `res.status(500).json(...)` and throws again. The client still receives the first (token-bearing) body, so registration appears to work — but the server logs an unhandled error on every signup, and the two response shapes disagree about what the endpoint returns. Anything written against the second shape (`message: "Registration successful! Please login."`) will never see it.

Fix: delete the `return res.status(201).json({ … })` block and let `sendTokenResponse` own the reply.

---

## Tier 2 — latent, misconfigured, or dead-but-broken

`frontend/src/services/api.js:6` hardcodes `const API_BASE_URL = 'http://127.0.0.1:5001'` and ignores `import.meta.env.VITE_BACKEND_URL`, which `services/socket.js:13` does honour. The two halves of the app therefore disagree about where the backend lives the moment you deploy anywhere but localhost. The adjacent comment ("FIXED: Changed from 5080 to 5000") is also stale — the value is 5001.

`backend/src/middleware/errorHandler.js:1` requires `../utils/ErrorResponse`, but `backend/src/utils/` contains only `Actions.js`. Requiring this module anywhere would be an immediate `MODULE_NOT_FOUND`. Nothing currently requires it, so it is dead code — but it is a tripwire for whoever wires up error handling next.

`frontend/src/Context/index.js` re-exports `useTheme` from `./ThemeContext`, but `ThemeContext.jsx` only exports `ThemeContext` and `ThemeProvider`; `useTheme` lives in `Context/useTheme.js`. Every real consumer imports `../Context/useTheme` directly, so nothing imports the barrel file and the build stays green. The first person to `import { useTheme } from '../Context'` will break the Rollup build.

`backend/src/app.js` is a 669-line near-duplicate of `server.js` that calls `server.listen(PORT)` and `connectDB()` at module scope, uses raw string event names instead of the `ACTIONS` map, and omits `dotenv.config()`. Nothing requires it (the entry point is `src/server.js`), but requiring it would mean `EADDRINUSE` plus a second orphaned Socket.IO instance. It is also the most likely reason someone "fixes" a bug in the wrong file.

`JoinRoom.jsx` mismatches the backend's payload shapes. It destructures `JOINED` as `{ clients, username, code, language }` while the server sends `{ roomId, user, clients, roomInfo }`, and `USER_JOINED` as `{ username, clients }` while the server sends `{ user, timestamp, totalUsers }`. It also stores the raw backend client objects (which carry `id`) but renders with `key={client.socketId}`, yielding `undefined` React keys — `CreateRoom.jsx` normalises this with `socketId: client.id || client.socketId` and `JoinRoom.jsx` does not.

`JoinRoom.jsx:425` and `:697` navigate to `/login` with `state.from = "/room/join"`, but `App.jsx` registers the route as `/dashboard/room/join`. Post-login redirect lands on a 404. Relatedly, the `if (isLoading)` branch at `JoinRoom.jsx:732` is unreachable because `if (!isConnected)` at `:604` returns first.

`CreateRoom.jsx`'s socket effect lists `[roomId, user, navigate]` as dependencies. Any re-run re-emits `CREATE_ROOM` for a room that already exists, and the backend replies `ERROR: "Room already exists"`.

`frontend/src/pages/AuthCallback.jsx` runs its effect on `[location, navigate, login, user]`. `login` is recreated on every render (it is not wrapped in `useCallback` in `userContext.jsx`) and calling it sets `user` — so the effect can re-fire in a loop, re-hitting `/api/auth/me`.

In `authController.js`, `getAuthStatus` verifies tokens against a hardcoded fallback `"your-fallback-secret-change-this"` while `generateToken` and `protect` both require a real `JWT_SECRET`; tokens minted by one path will not validate on the other. The last-resort "emergency token" in `googleCallback` is signed with `{ email, timestamp }` and no `id`, which `protect` cannot resolve to a user. And `authRoutes.js:407` mounts `debugToken` behind `router.use(protect)` despite the route comment marking it public.

`backend/src/models/User.js` declares `unique: true` on `email` and `username` *and* adds explicit `userSchema.index({ email: 1 })` / `({ username: 1 })`, which produces duplicate-index warnings on every boot.

`backend/src/config/database.js` returns silently when `MONGODB_URI` is unset, so the server boots with no database and fails only later, at the first query. `backend/src/config/redis.js` exports `initializeRedis`, which is never called from anywhere.

`backend/package.json` points `"main"` at a nonexistent `index.js`, and its `test`, `test:watch`, and `test:coverage` scripts all invoke `cross-env`, which is not in `devDependencies` — `npm test` fails immediately. `frontend/package.json` lists `nodemon` as a runtime dependency. `sharedb`, `ot-json0`, `redis`, `ioredis`, and `socket.io-redis` are all declared but unused; room state lives in plain in-memory `Map`s, so nothing survives a restart and nothing scales past one process.

---

## Suggested order of attack

Fix in this order, because each unblocks the ability to test the next: `Actions.js` parity plus the listener names (restores the product's core feature), `ProtectedRoute`'s `isLoading` → `loading` (makes it possible to stay logged in while testing), `userController.js:68` `matchPassword` → `comparePassword`, then `authController.js:467–470`'s double send. After that, unify the API base URL on `VITE_BACKEND_URL` and delete or clearly quarantine `backend/src/app.js` before it causes a wasted debugging session.

---

## Repair log — 2026-08-26

The "user B cannot join user A's room" failure was fixed. Nine files changed.

`frontend/src/utils/Actions.js` was rewritten to full parity with the backend map (26 keys, matching values, plus the two `connect_error` / `connect_failed` socket.io built-ins the old file carried). A comment at the top records the inbound/outbound naming convention so the next person does not use one constant for both `emit` and `on`.

`frontend/src/App.jsx` gained a `/room/:roomId` route rendering `JoinRoom` behind `ProtectedRoute`. There was previously no route anywhere in the app that carried a room ID — which is why the share button could not possibly work.

`frontend/src/pages/CreateRoom.jsx` now shares `${window.location.origin}/room/${roomId}` instead of `window.location.href`; the old link pointed at `/dashboard/room/create`, so a recipient created their own new room instead of joining. The sidebar shows the invite link with its own copy button alongside the raw room ID. Its socket effect was rewritten to hold a local `socket` handle and a `cancelled` flag, because the effect body is `async` and `socketRef.current` is still undefined when StrictMode's first-pass cleanup runs — `disconnect()` was a no-op and the creator was left with two sockets, holding a reference to the wrong one. Its listeners were repointed from `CODE_CHANGE` / `LANGUAGE_CHANGE` / `CHAT_MESSAGE` / `DISCONNECTED` to the events the server actually broadcasts: `CODE_UPDATED` / `LANGUAGE_UPDATED` / `NEW_CHAT_MESSAGE` / `USER_LEFT`.

`frontend/src/pages/JoinRoom.jsx` got the same listener repointing plus payload-shape corrections: `JOINED` now reads `{ user, clients, roomInfo }`, `USER_JOINED` reads `{ user }` and appends rather than replacing the roster, `USER_LEFT` reads `data.user.username` and drops the user by `id`, and every roster consumer maps `socketId: client.socketId || client.id` so React keys are defined. Room IDs are normalised through a `normalizeRoomId` helper on input, on prefill, and on emit. Arriving via an invite link auto-joins (guarded by `autoJoinedRef`, deferred out of the effect body) and shows a "Joining room…" screen instead of a form asking for an ID the user never typed.

`frontend/src/components/ProtectedRoute.jsx` destructures `loading`, not `isLoading` — the previous name does not exist on the context, so the gate was permanently falsy and any refresh or pasted URL bounced an authenticated user to `/login`. It now also passes the attempted path through as `state.from`, and `frontend/src/pages/LoginPage.jsx` honours it instead of always landing on `/dashboard`.

`backend/src/server.js` trims room IDs in both `CREATE_ROOM` and `JOIN` (the `Map` lookup is exact, so a pasted trailing newline produced `ROOM_NOT_FOUND` on a valid ID) and makes `CREATE_ROOM` idempotent: if the room exists, the socket joins it and receives `ROOM_CREATED` + `JOINED` + `SYNC_CODE` instead of `ERROR`. The old error path left the surviving StrictMode socket outside the socket.io room, so it never received inbound broadcasts while still appearing to work outbound.

`backend/nodemon.json` was added to restrict the watcher to `src/`. Room state is in-memory, so every restart drops every live room, and the default watcher included `uploads/` — an avatar upload would have evicted everyone mid-session.

Verified with a 17-check Socket.IO harness driving the real patched handler code (lines 1–680 of `server.js`, with express and mongo stubbed out so no database is needed): Actions parity, create, join with a whitespace-padded ID, `JOINED` shape, roster keys, `USER_JOINED`, `ROOM_USERS_UPDATED`, code sync in both directions, language change, chat with a formatted timestamp, double-`CREATE_ROOM` idempotency, proof the surviving socket is really inside the room, `USER_LEFT`, and that an unknown room still returns `ROOM_NOT_FOUND`. All 17 passed. `npx eslint .` on the frontend reports 0 errors.

Everything in Tier 2 and Tier 3 above is still outstanding — in particular `userController.js:68`'s `matchPassword`, `authController.js:467–470`'s double response, the split API base URL, and the dead `backend/src/app.js`.

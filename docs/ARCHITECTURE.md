# Collixy Realtime Editor — Architecture Reference

Purpose of this file: give an AI assistant (or a new engineer) everything needed
to work on this codebase without re-discovering it from scratch — what exists,
how the pieces actually connect at runtime, and which parts of the code are
dead, duplicated, or broken. Repo: `AbhishekGajage/collixy-realtime-editor`.

This document describes what the code **does**, not what its comments claim it
does — the two disagree in several places, noted below.

---

## 1. What this project is

Collixy is a real-time collaborative code editor ("Google Docs for code"):
users create or join a "room" via a room ID, edit code together in a Monaco
editor with live sync, chat, and cursor/typing presence, switch the room's
language together, and run the current code through a public execution API.
Auth is email/password (JWT) or Google OAuth.

There is no CRDT/OT layer despite dependencies suggesting one (see §7). Sync
is last-write-wins broadcast: every keystroke's full buffer is re-sent to
every other client in the room.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 7, React Router 7, Tailwind CSS 4, styled-components |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Realtime transport | Socket.IO 4 (client + server), WebSocket with polling fallback |
| Code execution | Piston public API (`emkc.org/api/v2/piston`) — called **directly from the browser**, not proxied through the backend |
| Backend | Node.js + Express 5 |
| Database | MongoDB via Mongoose (only `User` documents; no room/document persistence) |
| Auth | JWT (`jsonwebtoken`), bcrypt password hashing, Google OAuth (`google-auth-library`, `passport-google-oauth20`) |
| Cache/pubsub (declared, unused) | Redis, `ioredis`, `socket.io-redis` |
| Deployment | Docker Compose (local, includes Mongo + Redis containers) and Render.com (`render.yaml`: backend as a Node web service, frontend as a static site) |

Room state (participants, current code, current language) lives **only in
process memory** (`Map` objects in `server.js`). It does not survive a
backend restart and cannot be sharded across multiple backend instances —
there is no shared store behind it despite Redis being provisioned in
`docker-compose.yml`.

---

## 3. Directory map

```
collixy-realtime-editor/
├── backend/
│   ├── src/
│   │   ├── server.js          # REAL entry point (see package.json "start")
│   │   ├── app.js             # DEAD — near-duplicate of server.js, never required (§6)
│   │   ├── config/
│   │   │   ├── database.js    # Mongoose connect, retries every 5s on failure
│   │   │   └── redis.js       # exports initializeRedis() — never called anywhere (§7)
│   │   ├── controllers/
│   │   │   ├── authController.js   # backs /api/auth/* (register, login, Google OAuth, me, logout)
│   │   │   └── userController.js   # backs /api/users/* (a SECOND, parallel register/login) (§6)
│   │   ├── middleware/
│   │   │   ├── auth.js             # protect / optionalAuth / authorize (JWT verification)
│   │   │   └── errorHandler.js     # requires '../utils/ErrorResponse', which doesn't exist — dead, unused (§7)
│   │   ├── models/
│   │   │   └── User.js             # only Mongoose model in the project
│   │   ├── routes/
│   │   │   ├── authRoutes.js       # mounted at /api/auth
│   │   │   └── user.js             # mounted at /api/users
│   │   └── utils/
│   │       └── Actions.js          # canonical Socket.IO event-name map (26 keys)
│   ├── env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx            # ReactDOM root — wraps <App/> in <UserProvider> (redundant, see §7)
│   │   ├── App.jsx             # Router + route table (also wraps in ThemeProvider/UserProvider)
│   │   ├── Context/
│   │   │   ├── userContext.jsx # UserProvider/useUser — auth state, localStorage-backed
│   │   │   ├── useAuth.js is really in hooks/, this file re-exports UserContext
│   │   │   ├── ThemeContext.jsx / useTheme.js
│   │   │   └── index.js        # barrel file — DEAD, nothing imports it, and it's actually broken (§7)
│   │   ├── hooks/useAuth.js     # useContext(UserContext) — the hook actually used app-wide
│   │   ├── services/
│   │   │   ├── api.js          # axios instance -> backend REST API + Piston execution client
│   │   │   └── socket.js       # initSocket() -> Socket.IO client connection
│   │   ├── utils/
│   │   │   ├── Actions.js      # MUST mirror backend/src/utils/Actions.js exactly (§4)
│   │   │   ├── constants.js    # LANGUAGE_VERSIONS / CODE_SNIPPETS / LANGUAGE_NAMES for Monaco+Piston
│   │   │   └── storage.js      # localStorage helpers for a registration-autofill flow
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx       # ORPHANED — unused, and its import path is broken (§7)
│   │   │   ├── Output.jsx           # used only via CreateRoom.jsx / JoinRoom.jsx, not via CodeEditor.jsx
│   │   │   ├── LanguageSelector.jsx # same — used directly by the two room pages
│   │   │   ├── ProtectedRoute.jsx   # route guard, gates on useAuth().loading/user
│   │   │   ├── auth/ (AuthLayout, AuthComponents)
│   │   │   └── common/ (Navbar, Footer, FeatureCard, Switch)
│   │   └── pages/
│   │       ├── LandingPage.jsx
│   │       ├── LoginPage.jsx / RegisterPage.jsx
│   │       ├── AuthCallback.jsx     # handles ?token= from the Google OAuth redirect
│   │       ├── Dashboard.jsx
│   │       ├── CreateRoom.jsx       # ~32K — creates a room AND is the full editor UI
│   │       └── JoinRoom.jsx         # ~44K — joins a room AND is a near-duplicate editor UI (§6)
│   ├── nginx.conf, Dockerfile
│   └── package.json
├── scripts/verify-collab.js     # standalone Socket.IO contract test harness, no DB needed
├── docker-compose.yml           # local: mongo + redis + backend + frontend(nginx)
├── render.yaml                  # prod: backend Node web service + frontend static site (no Redis)
├── AUDIT-FINDINGS.md            # prior static-analysis pass + a dated repair log — see §8
└── docs/README.md               # placeholder, no content
```

---

## 4. Real-time collaboration: the actual contract

Everything routes through Socket.IO. The single source of truth for event
names is `backend/src/utils/Actions.js`; `frontend/src/utils/Actions.js` is
meant to be a byte-for-byte mirror of it. **These two files have drifted out
of sync before** (see §8) — if collaboration silently stops working, diff
these two files first.

Naming convention (deliberate, asymmetric):

- Client → server (emit): `CREATE_ROOM`, `JOIN`, `LEAVE`, `CODE_CHANGE`, `LANGUAGE_CHANGE`, `CHAT_MESSAGE`, `USER_TYPING`, `GET_ROOM_INFO`, `PING`
- Server → client (broadcast): `ROOM_CREATED`, `JOINED`, `SYNC_CODE`, `USER_JOINED`, `USER_LEFT`, `CODE_UPDATED`, `LANGUAGE_UPDATED`, `NEW_CHAT_MESSAGE`, `TYPING`, `ROOM_USERS_UPDATED`, `ROOM_INFO`, `ROOM_FULL`, `ROOM_NOT_FOUND`, `PONG`, `ERROR`

**Never listen for the emit-name or emit the listen-name** — the server does
not echo `CODE_CHANGE` back, it broadcasts `CODE_UPDATED`.

### Server-side room model (`backend/src/server.js`)

Two in-memory `Map`s:
- `rooms: Map<roomId, { id, host, code, language, users: Map<socketId, user>, createdAt, lastUpdated, maxUsers }>`
- `users: Map<socketId, { id, username, roomId, isHost, ... }>`

Key behaviors:
- `CREATE_ROOM` is **idempotent**: if the room already exists (e.g. a
  React-StrictMode double-mount, or the creator reconnecting), the socket is
  folded into a `JOIN` instead of erroring, and rejoins as host if the room
  was empty.
- Room IDs are `.trim()`'d before every `Map` lookup (pasted IDs routinely
  carry stray whitespace/newlines).
- Host transfers automatically to the next remaining user if the host
  disconnects; an empty room is deleted after a 60s grace period (not
  immediately — a refresh shouldn't nuke the room).
- `maxUsers` defaults to 10 (`ROOM_FULL` is emitted past that).
- All console logging in this file is intentionally verbose (`✅ [BACKEND] ...`)
  — this is deliberate observability for a Map-backed, single-process design
  that has no other introspection, not leftover debug noise to strip.

### Client-side room pages

`CreateRoom.jsx` and `JoinRoom.jsx` are independent, near-duplicate
implementations of the same room screen (editor + output panel + chat +
participant list), one that emits `CREATE_ROOM` on mount and one that emits
`JOIN`. A shared invite link (`/room/:roomId`, generated by `CreateRoom`'s
share button) also renders `JoinRoom`, which auto-joins using the `:roomId`
route param. If you change room-UI behavior, **you almost certainly need to
change it in both files** — there is no shared `RoomEditor` component today.

### Code execution (not part of the realtime layer)

Running code does **not** go through the backend or Socket.IO. `Output.jsx`
calls `services/api.js`'s `executeCode()`, which posts directly from the
browser to the public Piston API (`emkc.org/api/v2/piston`) with the
buffer's contents and a language/version pulled from
`utils/constants.js::LANGUAGE_VERSIONS`. Output is local to whoever clicked
Run; it is not broadcast to the room.

---

## 5. Auth flow

- **Email/password**: `POST /api/auth/register` and `/api/auth/login`
  (`authController.js`) issue a JWT (`generateToken`, 30d expiry) and set it
  both as an httpOnly cookie and in the JSON body. The frontend stores it in
  `localStorage` (`accessToken`) and attaches it as `Authorization: Bearer`
  on every axios request (`services/api.js` interceptor).
- **Google OAuth**: `GET /api/auth/google/url` builds the consent URL,
  `/api/auth/google/callback` exchanges the code and redirects the browser
  to the frontend with `?token=...` in the query string; `AuthCallback.jsx`
  reads it, stores it, strips it from the URL, and calls `/api/auth/me` to
  hydrate the user object.
- **Route protection**: `ProtectedRoute.jsx` reads `{ user, loading }` from
  `useAuth()` (backed by `UserContext`) and redirects to `/login` (preserving
  the attempted path in router state) only once the initial localStorage/`/me`
  hydration has finished — gating on the wrong flag here previously logged
  everyone out on refresh (fixed, see §8).
- **Server-side verification**: `middleware/auth.js`'s `protect` reads the
  bearer token or the cookie, verifies with `JWT_SECRET`, loads the user,
  and rejects if the account is deactivated.
- There are **two parallel, inconsistent auth surfaces**: `/api/auth/*`
  (`authController.js`, uses `User.comparePassword`, canonical/working) and
  `/api/users/*` (`userController.js`, calls a `user.matchPassword()` method
  that **does not exist on the model** — this login path throws and always
  returns 500). Treat `/api/auth/*` as the real one; `/api/users/*` is
  legacy/broken and should probably be deleted rather than fixed.

---

## 6. Known duplication / dead code (still true as of this writing)

- **`backend/src/app.js`** — a 669-line near-duplicate of `server.js` using
  raw string event names instead of `ACTIONS`, with its own `server.listen()`
  call. Nothing requires it (`package.json`'s `start`/`dev` scripts point at
  `src/server.js`). It is not wired in, but it is a trap: editing it fixes
  nothing, and running it directly would collide on the same port.
- **`/api/auth/*` vs `/api/users/*`** — two independent register/login
  implementations against the same `User` model (§5). `/api/users/login` is
  broken (`matchPassword` typo). Pick one before adding features to either.
- **`CreateRoom.jsx` vs `JoinRoom.jsx`** — duplicated room-editor UI and
  socket-handling logic (§4), not a shared component.
- **`components/CodeEditor.jsx`, and its sibling `LanguageSelector`/`Output`
  when reached through it** — `CodeEditor.jsx` is never imported by any page
  and its own import (`../constants`) doesn't resolve (the real file is at
  `../utils/constants`). It looks like an earlier, standalone version of the
  editor that `CreateRoom.jsx`/`JoinRoom.jsx` superseded by inlining the same
  pieces directly. Safe to delete or explicitly mark as reference-only.
- **Redis / ShareDB stack** — `ioredis`, `redis`, `socket.io-redis`,
  `sharedb`, `sharedb-mongo`, `ot-json0` are all in `backend/package.json`
  and Redis is even provisioned in `docker-compose.yml`, but
  `config/redis.js::initializeRedis()` is never called and no OT/CRDT code
  exists anywhere. Room state is plain in-memory `Map`s (§2). If you're
  asked to "add Redis" or "make this scale," this is greenfield work, not a
  wiring fix.
- **`middleware/errorHandler.js`** requires `../utils/ErrorResponse`, which
  doesn't exist. Nothing currently imports this middleware, so it's inert —
  but importing it anywhere is an instant `MODULE_NOT_FOUND`.
- **`Context/index.js`** barrel re-exports `useTheme` from `ThemeContext.jsx`,
  but `useTheme` actually lives in the sibling `useTheme.js` file — the
  barrel's export is broken. Every real consumer imports `Context/useTheme`
  directly, so this only breaks if someone imports from the barrel.
- **`main.jsx` and `App.jsx` both wrap the tree in `<UserProvider>`** —
  harmless (context just nests), but redundant; there is only one `App`
  render path so one of the two wrappers is dead weight.

---

## 7. Configuration & environment

- `backend/env.example` documents every backend env var (Mongo URI, JWT
  secrets, Google OAuth credentials, SMTP, Redis URL, CORS origins, rate
  limits, room size caps). **It contains what looks like a live MongoDB Atlas
  connection string with real-looking credentials committed to the repo** —
  treat that credential as compromised and rotate it; don't reuse it, and
  scrub it from git history before making the repo public if it isn't
  already.
- Frontend reads `VITE_BACKEND_URL` (both `services/api.js` and
  `services/socket.js` now agree on this — an earlier version hardcoded
  `127.0.0.1:5001` in one of the two files only).
- CORS allow-list (`server.js::isOriginAllowed`) permits `FRONTEND_URL` (comma
  separated), a fixed set of localhost ports, and anything ending in
  `.onrender.com`; in `NODE_ENV=development` it allows everything.
- `render.yaml` (production) does **not** provision Redis at all — consistent
  with Redis being unused — but does generate `JWT_SECRET`/`JWT_REFRESH_SECRET`
  and expects `MONGODB_URI`, `GOOGLE_CLIENT_ID/SECRET`, `FRONTEND_URL`,
  `BACKEND_URL` to be set manually as dashboard secrets.
- `backend/package.json`'s `test`/`test:coverage` scripts invoke `cross-env`,
  which is not listed in `devDependencies` — `npm test` fails at the shell
  before Jest even runs.

---

## 8. Provenance note on this document

`AUDIT-FINDINGS.md` in the repo root is a prior static-analysis pass (scan
date 2026-08-26) plus a same-day repair log. Several Tier-1 items it lists as
broken have since been fixed and verified in the current tree while
preparing this document — notably: `frontend/src/utils/Actions.js` now has
full parity with the backend (26 matching keys), `ProtectedRoute.jsx`
destructures `loading` (not the non-existent `isLoading`), the `/room/:roomId`
route exists, and the frontend API base URL is consistently read from
`VITE_BACKEND_URL` in both `api.js` and `socket.js`. The items in §5–§7 above
(`matchPassword`, `app.js`, the double-response bug in registration, the
orphaned `CodeEditor.jsx`, the unused Redis/ShareDB stack, the broken
`Context/index.js` barrel) were independently re-verified against the current
source in this pass and were **still present** at the time this file was
written. One more still-present item from `AUDIT-FINDINGS.md`: in
`authController.js`'s `register` handler, `sendTokenResponse(user, 201, res, true)`
already sets the status/cookie/JSON body, and is immediately followed by a
second, unreachable-in-practice `return res.status(201).json({...})` — the
second call throws `ERR_HTTP_HEADERS_SENT` (swallowed by the surrounding
`catch`), so registration appears to work for the client but logs a server
error on every signup.

#!/usr/bin/env node
/**
 * scripts/verify-collab.js
 *
 * End-to-end check of the realtime collaboration contract, with NO database.
 *
 *   node scripts/verify-collab.js
 *
 * How it works: everything before the "EXPRESS MIDDLEWARE" banner in
 * backend/src/server.js is the complete Socket.IO layer and touches no
 * database. This script copies that prefix into backend/.verify-tmp/,
 * appends a `server.listen()`, and drives it with two real socket.io
 * clients. Putting the copy inside backend/ means Node resolves express,
 * cors, socket.io and friends from backend/node_modules as normal, and
 * mongoose is never loaded because we cut the file before connectDB().
 *
 * Exits 0 if every check passes, 1 if any check fails, 2 on a harness error.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const BACKEND = path.join(ROOT, "backend");
const FRONTEND = path.join(ROOT, "frontend");
const SERVER_JS = path.join(BACKEND, "src", "server.js");
const TMP = path.join(BACKEND, ".verify-tmp");
const PORT = process.env.VERIFY_PORT || 5099;
const URL = `http://127.0.0.1:${PORT}`;

// ---------------------------------------------------------------- results
const results = [];
const check = (ok, name, detail) => results.push([ok ? "PASS" : "FAIL", name, detail || ""]);

// ------------------------------------------------- build the test server
function buildTestServer() {
  const src = fs.readFileSync(SERVER_JS, "utf8");
  const lines = src.split(/\r?\n/);
  const cut = lines.findIndex((l) => /=+\s*EXPRESS MIDDLEWARE\s*=+/.test(l));
  if (cut === -1) {
    throw new Error(
      "Could not find the 'EXPRESS MIDDLEWARE' banner in backend/src/server.js. " +
        "If that section was renamed, update the marker in this script."
    );
  }
  fs.mkdirSync(TMP, { recursive: true });
  // src/utils/Actions.js is required as "./utils/Actions" relative to the
  // original file, so keep the copy one directory deep in the same tree shape.
  const out = path.join(TMP, "socket-only.js");
  fs.writeFileSync(
    out,
    lines.slice(0, cut).join("\n") +
      `\n\n// ---- appended by scripts/verify-collab.js ----\n` +
      `server.listen(${PORT}, "127.0.0.1", () => console.log("verify: socket layer listening on ${PORT}"));\n` +
      `module.exports = { rooms, users };\n`
  );
  // Rewrite the relative require so it still points at the real utils dir.
  const rel = path
    .relative(TMP, path.join(BACKEND, "src", "utils", "Actions"))
    .split(path.sep)
    .join("/");
  fs.writeFileSync(
    out,
    fs.readFileSync(out, "utf8").replace(/require\(\s*["']\.\/utils\/Actions["']\s*\)/g, `require("${rel}")`)
  );
  return out;
}

// ------------------------------------------------------------ actions parity
function parseActions(text) {
  const out = {};
  const re = /([A-Z_]+)\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text))) out[m[1]] = m[2];
  return out;
}
function checkActionsParity() {
  const be = parseActions(fs.readFileSync(path.join(BACKEND, "src/utils/Actions.js"), "utf8"));
  const fe = parseActions(fs.readFileSync(path.join(FRONTEND, "src/utils/Actions.js"), "utf8"));
  const bad = Object.keys(be).filter((k) => fe[k] !== be[k]);
  check(
    bad.length === 0,
    "Actions.js parity (frontend vs backend)",
    bad.length === 0
      ? `${Object.keys(be).length} backend keys present with matching values`
      : `missing or mismatched in frontend: ${bad.join(", ")}`
  );
}

// -------------------------------------------------------------- socket utils
let io;
const boxes = new Map();
const INBOUND = [
  "room-created", "joined", "user-joined", "user-left", "disconnected",
  "code-updated", "language-updated", "new-chat-message", "code-synced",
  "sync-code", "room-users-updated", "error", "room-full", "room-not-found",
  "typing", "room-info",
];

function mkClient(tag) {
  const socket = io(URL, { transports: ["websocket"], reconnection: false, forceNew: true });
  const box = { tag, socket, events: [] };
  boxes.set(tag, box);
  INBOUND.forEach((n) => socket.on(n, (payload) => box.events.push({ n, payload })));
  return box;
}
const connected = (b) =>
  new Promise((res, rej) => {
    b.socket.on("connect", res);
    b.socket.on("connect_error", rej);
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const all = (tag, n) => boxes.get(tag).events.filter((e) => e.n === n);
const last = (tag, n) => {
  const g = all(tag, n);
  return g.length ? g[g.length - 1].payload : undefined;
};
// Mirrors the normalisation the frontend applies to backend user objects.
const toClient = (c) => ({ ...c, socketId: c.socketId || c.id });

// -------------------------------------------------------------------- main
(async () => {
  const serverFile = buildTestServer();
  checkActionsParity();

  require(serverFile);
  io = require(path.join(FRONTEND, "node_modules", "socket.io-client")).io;
  await sleep(600);

  const ROOM = "VERIFY-ROOM-1";

  // --- 1. alice creates
  const A = mkClient("A");
  await connected(A);
  A.socket.emit("create-room", { roomId: ROOM, username: "alice", language: "javascript" });
  await sleep(400);
  check(!!last("A", "room-created"), "creator receives ROOM_CREATED", `roomId=${last("A", "room-created")?.roomId}`);

  // --- 2. bob joins with a whitespace-padded paste
  const B = mkClient("B");
  await connected(B);
  B.socket.emit("join", { roomId: `  ${ROOM}\n`, username: "bob" });
  await sleep(500);
  const joinedB = last("B", "joined");
  check(!last("B", "room-not-found") && !!joinedB, "joiner accepted despite padded room id", joinedB ? "got JOINED" : "no JOINED");

  // --- 3. JOINED payload shape the UI reads
  if (joinedB) {
    check(joinedB.user?.username === "bob", "JOINED.user.username", String(joinedB.user?.username));
    check(typeof joinedB.roomInfo?.language === "string", "JOINED.roomInfo.language", String(joinedB.roomInfo?.language));
    const mapped = (joinedB.clients || []).map(toClient);
    check(
      mapped.length > 0 && mapped.every((c) => c.socketId && c.username),
      "roster has usable React keys after id -> socketId map",
      mapped.map((c) => `${c.username}:${String(c.socketId).slice(0, 6)}`).join(", ")
    );
  }

  // --- 4. creator learns about the joiner
  const uj = last("A", "user-joined");
  check(uj?.user?.username === "bob", "creator receives USER_JOINED", `totalUsers=${uj?.totalUsers}`);
  const roster = last("A", "room-users-updated");
  const names = (roster?.clients || []).map((c) => c.username).sort().join(",");
  check(names === "alice,bob", "creator receives ROOM_USERS_UPDATED roster", names || "not received");

  // --- 5. code sync, both directions
  A.socket.emit("code-change", { roomId: ROOM, code: "// from alice", language: "javascript" });
  await sleep(350);
  check(last("B", "code-updated")?.code === "// from alice", "joiner receives CODE_UPDATED from creator", `user=${last("B", "code-updated")?.user}`);

  B.socket.emit("code-change", { roomId: ROOM, code: "// from bob", language: "javascript" });
  await sleep(350);
  check(last("A", "code-updated")?.code === "// from bob", "creator receives CODE_UPDATED from joiner", `user=${last("A", "code-updated")?.user}`);

  // --- 6. language + chat
  B.socket.emit("language-change", { roomId: ROOM, language: "python" });
  await sleep(300);
  check(last("A", "language-updated")?.language === "python", "creator receives LANGUAGE_UPDATED", `by ${last("A", "language-updated")?.user}`);

  B.socket.emit("chat-message", { roomId: ROOM, message: "hey alice", username: "bob" });
  await sleep(300);
  const cm = last("A", "new-chat-message");
  const stamp = cm?.timestamp ? new Date(cm.timestamp).toLocaleTimeString() : null;
  check(cm?.message === "hey alice" && stamp && stamp !== "Invalid Date", "creator receives NEW_CHAT_MESSAGE", cm ? `"${cm.message}" from ${cm.user} @ ${stamp}` : "not received");

  // --- 7. StrictMode double CREATE_ROOM must not lock the creator out
  const ROOM2 = "VERIFY-STRICTMODE";
  const S1 = mkClient("S1");
  await connected(S1);
  S1.socket.emit("create-room", { roomId: ROOM2, username: "carol" });
  await sleep(300);
  const S2 = mkClient("S2"); // the socket that survives a double-mounted effect
  await connected(S2);
  S2.socket.emit("create-room", { roomId: ROOM2, username: "carol" });
  await sleep(400);
  check(!last("S2", "error") && !!last("S2", "joined"), "second CREATE_ROOM is idempotent", last("S2", "error") ? `ERROR: ${JSON.stringify(last("S2", "error"))}` : "got ROOM_CREATED + JOINED");

  const D = mkClient("D");
  await connected(D);
  D.socket.emit("join", { roomId: ROOM2, username: "dave" });
  await sleep(400);
  D.socket.emit("code-change", { roomId: ROOM2, code: "// dave typed", language: "javascript" });
  await sleep(350);
  check(last("S2", "code-updated")?.code === "// dave typed", "surviving socket is really inside the room", "it received a later joiner's CODE_UPDATED");

  // --- 8. leave
  B.socket.emit("leave", { roomId: ROOM, username: "bob" });
  await sleep(400);
  const ul = last("A", "user-left");
  check(!!(ul?.user?.username && ul?.user?.id), "creator receives USER_LEFT with user.id + username", ul ? `${ul.user.username}` : "not received");
  check(all("A", "disconnected").length === 0, "server never emits DISCONNECTED", "so listening on USER_LEFT is correct");

  // --- 9. a genuinely unknown room still reports not-found
  const E = mkClient("E");
  await connected(E);
  E.socket.emit("join", { roomId: "NOPE-NOT-A-ROOM", username: "erin" });
  await sleep(400);
  check(!!last("E", "room-not-found"), "unknown room still returns ROOM_NOT_FOUND");

  // --- report
  [A, B, S1, S2, D, E].forEach((c) => c.socket.close());
  const w = Math.max(...results.map((r) => r[1].length));
  const failed = results.filter((r) => r[0] === "FAIL").length;
  console.log(`${os.EOL}================ COLLAB VERIFICATION ================`);
  results.forEach(([s, n, d]) => console.log(`${s === "PASS" ? "  ok  " : " FAIL "} ${n.padEnd(w)}  ${d}`));
  console.log(`${os.EOL}${results.length - failed}/${results.length} checks passed${failed ? `  (${failed} FAILED)` : ""}`);

  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
  process.stdout.write("", () => setTimeout(() => process.exit(failed ? 1 : 0), 150));
})().catch((err) => {
  console.error("harness error:", err);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
  process.exit(2);
});

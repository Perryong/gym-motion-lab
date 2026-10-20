# Accounts and cloud sync with Firebase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public accounts with email-link sign-in, storing each user's FORM data in Firestore, while guests keep today's device-only behaviour.

**Architecture:** Firebase's prebuilt browser modules are vendored. `cloud.js` is the only file that imports them and is loaded with a dynamic `import()` after first paint, so a guest's app never waits on, or breaks because of, Firebase. Pure helpers in `sync.js` convert, merge, debounce and chunk; `store.js`'s `normalize()` validates every cloud read. `app.js` switches `commit()` between localStorage (guest) and Firestore (signed in).

**Tech Stack:** Plain ES modules, no build; Firebase JS SDK 12.19.0 (app, auth, firestore) vendored; `node --test`; Firestore emulator with `@firebase/rules-unit-testing` for rules (dev only).

**Spec:** `docs/superpowers/specs/2026-10-20-firebase-accounts-design.md`

## Global Constraints

- Branch `firebase-accounts`. Firebase project `task-list-6a69a`; config already in `dist/firebase-config.js` (do not change it).
- Firestore paths: `apps/form/users/{uid}` and `apps/form/users/{uid}/workouts/{started}`. Nothing else is written.
- User document shape `{schema:1, plan, active, weights, goal, updated}`; workout `{day, name, started, finished, entries}`; workout id `String(started)`.
- Sign-in by email link only; stored email key `gml.signin-email`. Guest data stays in localStorage `gml.v1` and is never deleted by sign-in, sign-out or account deletion.
- No new runtime host: no gstatic/CDN requests from the page. Root `node --test tests/*.test.mjs` stays dependency-free.
- Code style follows the surrounding files: one-space indent, terse arrow functions, `el()` from `ui.js` for DOM, plain-word toasts.
- The existing shop rules (`config`, `orders`, `privateOrders`, catch-all `allow write: if false`) are kept verbatim.

## Review Focus

1. Link opened in another browser or a mail app's in-app browser (no stored email): FORM asks for the email; Cancel leaves the person a guest with their data intact. → Task 5 browser check 3.
2. Account saves rejected (offline is queued by Firestore, but `permission-denied` before rules are published, or quota): the app keeps working on in-memory state, shows one toast, and does not lose the edit. → Task 2 `debounced` error test; Task 5 browser check 6.
3. A person who signed in before, signed out, then logged more as a guest signs in again: only the new guest workouts and weigh-ins are added, nothing is duplicated. → Task 2 `mergeGuest` dedupe test.
4. First upload or restore of a large history (over 500 workouts) exceeds Firestore's 500-writes-per-batch limit: writes are chunked. → Task 2 `chunks` test.
5. Signing out with an edit still waiting on the debounce: it is flushed to the account before sign-out. → Task 2 `flush` test; Task 5 browser check 5.

---

### Task 1: Vendor the Firebase SDK

**Files:**
- Create: `dist/vendor/firebase/firebase-app.js`, `firebase-auth.js`, `firebase-firestore.js`, `LICENSE.txt` (Apache-2.0 text)
- Create: `scripts/vendor-firebase.mjs`
- Test: `tests/vendor-firebase.test.mjs`
- Modify: `README.md` (third-party line beside the Three.js one)

**Interfaces:**
- Produces: `./vendor/firebase/firebase-{app,auth,firestore}.js` importable from `dist/`, with auth and firestore importing `./firebase-app.js`.

- [ ] **Step 1: Write the failing test** `tests/vendor-firebase.test.mjs`
  - `test('vendored firebase has no remote imports')`: for each of the three files, `assert.doesNotMatch(text, /gstatic\.com/)`.
  - `test('auth and firestore share the vendored app module')`: both files `assert.match(text, /from\s*"\.\/firebase-app\.js"/)`.
  - `test('versioning keeps one app module URL')`: `versionSource` (from `scripts/version-assets.mjs`) on the auth file and on `import "./vendor/firebase/firebase-app.js"` yields `./firebase-app.js?v=x` and `./vendor/firebase/firebase-app.js?v=x` respectively (same resolved file, same query).
  - `test('LICENSE is shipped')`: `LICENSE.txt` exists and contains `Apache License`.
- [ ] **Step 2: Run** `node --test tests/vendor-firebase.test.mjs` → FAIL (files missing).
- [ ] **Step 3: Implement `scripts/vendor-firebase.mjs <version>`**: downloads `https://www.gstatic.com/firebasejs/<version>/firebase-{app,auth,firestore}.js` into `dist/vendor/firebase/`, replacing `https://www.gstatic.com/firebasejs/<version>/firebase-app.js` with `./firebase-app.js`; fails if any `gstatic.com` string remains in an import. Header comment: usage and pinned version. Run it with `12.19.0`. Add the Apache-2.0 licence text as `LICENSE.txt`.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs` → all PASS.
- [ ] **Step 5: README** — under the Three.js sentence: "Firebase JS SDK 12.19.0 (app, auth, firestore) is vendored in `dist/vendor/firebase` under Apache-2.0; regenerate with `node scripts/vendor-firebase.mjs <version>`."
- [ ] **Step 6: Commit** `git add dist/vendor/firebase scripts/vendor-firebase.mjs tests/vendor-firebase.test.mjs README.md && git commit -m "Vendor Firebase 12.19.0 browser modules"`

### Task 2: Pure sync helpers

**Files:**
- Create: `dist/sync.js`
- Test: `tests/sync.test.mjs`

**Interfaces:**
- Consumes: `normalize(raw: string) -> State` from `dist/store.js`.
- Produces (all pure, no Firebase import):
  - `SCHEMA = 1`
  - `toUserDoc(state, now = Date.now()) -> {schema, plan, active, weights, goal, updated}`
  - `toWorkoutDoc(h) -> {day, name, started, finished, entries}`
  - `workoutId(h) -> string` (`String(h.started)`)
  - `fromCloud(userDoc | null, workoutDocs: object[]) -> string` — JSON for `normalize()`, history sorted by `started`.
  - `hasGuestData(state) -> boolean` — any history or weights.
  - `mergeGuest(account: State, guest: State) -> {state: State, newWorkouts: History[]}`
  - `chunks(list, size = 450) -> list[]`
  - `debounced(fn: (x) => Promise, ms, onError: (err) => void) -> {call(x), flush(): Promise}`
  - `cloudMessage(error) -> string` — plain words for Firebase error codes.

- [ ] **Step 1: Write the failing tests** in `tests/sync.test.mjs`:
  - `round trip through normalize`: `normalize(fromCloud(toUserDoc(s), s.history.map(toWorkoutDoc)))` deep-equals `s` for a state with plan, 2 workouts, weights, goal 75 and an active workout.
  - `malformed cloud data falls back like localStorage`: `normalize(fromCloud(null, []))` deep-equals `normalize(null)`; `normalize(fromCloud({plan:'x', weights:[{date:'bad',kg:5}]}, [{started:'x'}, null]))` deep-equals `normalize(JSON.stringify({plan:'x', weights:[{date:'bad',kg:5}], history:[{started:'x'}]}))` (`fromCloud` drops non-object workouts; everything else is `normalize`'s job).
  - `history is sorted by start time`: workouts given `[started 3, started 1]` come back `[1, 3]`.
  - `merge adds only guest workouts the account lacks`: account history starts `[100, 200]`, guest `[200, 300]` → state history starts `[100, 200, 300]`, `newWorkouts` starts `[300]`.
  - `merge keeps account weigh-ins on the same date`: account `2026-10-01: 80`, guest `2026-10-01: 79` and `2026-10-02: 78` → `[{2026-10-01,80},{2026-10-02,78}]`.
  - `merge fills plan and goal only when the account has none`: account plan all empty + goal null, guest plan Mon 1 item + goal 70 → guest's; account with any planned day + goal 75 → account's kept. `active`: account's if not null, else guest's.
  - `hasGuestData`: false for `normalize(null)`, true with one weigh-in.
  - `chunks splits at 450`: `chunks(Array(1000).fill(0)).map(c => c.length)` equals `[450, 450, 100]`; `chunks([])` equals `[]`.
  - `debounced coalesces and flushes` (use `mock.timers.enable({apis:['setTimeout']})`): three `call`s within `ms` → `fn` called once with the last argument; `call` then `await flush()` → called immediately; `flush()` with nothing pending resolves without calling `fn`.
  - `debounced reports errors without throwing`: `fn` rejects → `onError` called once with the error; `flush()` resolves.
  - `cloudMessage`: `auth/invalid-email` → `'That email address looks wrong.'`; `auth/invalid-action-code` and `auth/expired-action-code` → `'This sign-in link has expired or was already used. Send a new one.'`; `auth/too-many-requests` → `'Too many attempts. Try again in a few minutes.'`; `auth/network-request-failed` / `unavailable` → `'You are offline. Try again when connected.'`; `permission-denied` → `'Your account could not be saved. Your changes stay on this screen.'`; anything else → `'Something went wrong. Try again.'`.
- [ ] **Step 2: Run** `node --test tests/sync.test.mjs` → FAIL (module missing).
- [ ] **Step 3: Implement `dist/sync.js`** with the signatures above. `mergeGuest` builds the merged state and returns it through `normalize(JSON.stringify(...))` so the result is validated; "plan is set" means any day has items.
- [ ] **Step 4: Run** `node --test tests/*.test.mjs` → all PASS.
- [ ] **Step 5: Commit** `git add dist/sync.js tests/sync.test.mjs && git commit -m "Add pure helpers for cloud sync and guest merge"`

### Task 3: Security rules and emulator tests

**Prerequisite (owner's machine, dev only):** Java 21+ (`brew install openjdk@21`, then follow brew's PATH note). The emulator will not start without it.

**Files:**
- Create: `firestore.rules` — the full rules: the existing shop rules verbatim plus FORM's block from the spec (with `email_verified`), inside the same `match /databases/{database}/documents`.
- Create: `firebase.json` — `{"firestore":{"rules":"firestore.rules"},"emulators":{"firestore":{"port":8080}}}`
- Create: `tests/rules/package.json` — private, `"type":"module"`, devDependencies `firebase-tools@^14` and `@firebase/rules-unit-testing@^4` and `firebase@12.19.0`; script `"test": "firebase emulators:exec --config ../../firebase.json --only firestore --project demo-form \"node --test rules.test.mjs\""`.
- Test: `tests/rules/rules.test.mjs`
- Modify: `.gitignore` (`tests/rules/node_modules/`, `firebase-debug.log`)

**Interfaces:**
- Produces: `firestore.rules`, the file published in Task 6.

- [ ] **Step 1: Write the failing tests** `tests/rules/rules.test.mjs` with `initializeTestEnvironment({projectId:'demo-form', firestore:{rules: readFileSync('../../firestore.rules','utf8')}})`. Contexts: `alice = authenticatedContext('alice', {email_verified:true})`, `bob` likewise, `anon = authenticatedContext('anon', {firebase:{sign_in_provider:'anonymous'}})` (no `email_verified`), `nobody = unauthenticatedContext()`, `owner = authenticatedContext('shop', {owner:true})`.
  - `owner of a FORM account can write and read it`: alice `setDoc(apps/form/users/alice, {schema:1, weights:[], …})` and `workouts/123` with `started:123, entries:[]` → `assertSucceeds`; reads succeed.
  - `nobody else can read or write it`: bob and nobody → `assertFails` on get, set, delete of alice's docs.
  - `anonymous users cannot create FORM data`: anon writing `apps/form/users/anon` → `assertFails`.
  - `bad writes are rejected`: alice with `schema:2`; with 2001 weights; workout id `999` but `started:123`; workout with 51 entries → each `assertFails`.
  - `owner can delete their data`: alice deletes workout and user doc → `assertSucceeds`.
  - `shop rules are unchanged`: seeded with `withSecurityRulesDisabled` — `orders/o1 {customerUid:'alice'}`, `orders/o2 {customerUid:'bob'}`, `privateOrders/p1`, `config/business`. alice reads o1 ✓, o2 ✗, p1 ✗, config ✗; owner reads all ✓; alice and owner writing `orders/o1` ✗; nobody reads o1 ✗.
- [ ] **Step 2: Run** `cd tests/rules && npm install && npm test` with an empty FORM block → FORM tests FAIL, shop tests PASS.
- [ ] **Step 3: Add FORM's block** to `firestore.rules` exactly as in the spec.
- [ ] **Step 4: Run** `npm test` → all PASS.
- [ ] **Step 5: Commit** `git add firestore.rules firebase.json tests/rules/package.json tests/rules/package-lock.json tests/rules/rules.test.mjs .gitignore && git commit -m "Add Firestore rules for FORM with emulator tests"`

### Task 4: `cloud.js` — the Firebase wrapper

**Files:**
- Create: `dist/cloud.js`

**Interfaces:**
- Consumes: `firebaseConfig` from `./firebase-config.js`; the vendored modules from Task 1; `workoutId`, `toWorkoutDoc`, `toUserDoc`, `chunks` from Task 2.
- Produces (all async unless noted; errors are thrown as Firebase errors with `.code` for `cloudMessage`):
  - `sendLink(email: string): Promise<void>` — `actionCodeSettings = {url: location.origin + location.pathname, handleCodeInApp: true}`; stores email in localStorage `gml.signin-email`.
  - `finishLink(askEmail: () => Promise<string|null>): Promise<'signed-in'|'cancelled'|'none'>` — `'none'` when `location.href` is not a sign-in link; else uses the stored email or `askEmail()`; on success removes the stored email and `history.replaceState`s the URL to `origin + pathname + hash`.
  - `onUser(cb: (user: {uid, email, emailVerified} | null) => void): () => void` (sync)
  - `signOut(): Promise<void>`
  - `loadCloud(uid): Promise<{user: object|null, workouts: object[]}>`
  - `watchUser(uid, cb: (userDoc: object) => void): () => void` (sync) — calls `cb` only for snapshots without `hasPendingWrites` that exist.
  - `saveUser(uid, state): Promise<void>` — `setDoc` of `toUserDoc(state)`.
  - `addWorkouts(uid, history[]): Promise<void>` — `setDoc` per workout at `workoutId`, chunked batches.
  - `replaceAll(uid, state): Promise<void>` — delete every existing workout doc, then write the user doc and all workouts; batches from `chunks()`.
  - `deleteAccount(uid): Promise<void>` — deletes workouts, user doc, then `deleteUser`; lets `auth/requires-recent-login` propagate.
  - Firestore is created with `initializeFirestore(app, {localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})})`.

- [ ] **Step 1: Implement `dist/cloud.js`** to the interface. No unit test: everything here is a direct Firebase call; it is exercised against the real project in Task 5's browser checks and its pure parts are in `sync.js`.
- [ ] **Step 2: Smoke check** — `preview_start form`, then in the page console `const c = await import('./cloud.js')` resolves with no console errors and no network request to `gstatic.com`.
- [ ] **Step 3: Commit** `git add dist/cloud.js && git commit -m "Add Firebase wrapper for sign-in and FORM data"`

### Task 5: Account card, sign-in flow and sync wiring

**Files:**
- Create: `dist/account-view.js`, `dist/privacy.html`
- Modify: `dist/app.js`, `dist/index.html` (Account card replaces "Your data" card at line 16; `#email-dialog`; Home sign-in link), `dist/home-view.js` (sign-in link visibility), `dist/style.css`, `README.md` (Accounts section; code map entries for `cloud.js`, `sync.js`, `account-view.js`)

**Interfaces:**
- Consumes: Task 2 and Task 4 exports; `load`, `save`, `normalize`, `readBackup` from `store.js`.
- Produces:
  - `renderAccount({user, status, onSend, onSignOut, onDelete})` in `account-view.js` — fills `#account-card` body: guest copy "Stored only on this device. Sign in to keep it in your account." + email input + **Send sign-in link**; after send "Check your inbox at {email}."; signed-in "Signed in as {email} · {status}" where status is `synced` or `offline, will sync`, **Sign out**, **Delete account**, link `privacy.html`. Export/Restore buttons keep their ids `export-data`, `import-data-button`, `import-data`.
  - `askEmail(): Promise<string|null>` in `account-view.js` — opens `#email-dialog` (one email field, Cancel / Sign in).

- [ ] **Step 1: `app.js` session state.** `let user=null, cloud=null, saver=null, synced=new Set()`. After the first `route()`: `import('./cloud.js').then(init).catch(()=>{})` — a failed import leaves guest mode untouched. `init(c)`: `cloud=c`; `await c.finishLink(askEmail)` (toast `Signed in` on `'signed-in'`, `cloudMessage` on error); `c.onUser(onUser)`.
- [ ] **Step 2: `onUser(u)`.**
  - `null`: `user=null`, stop watcher, replace `state` contents with `load()`, re-route.
  - signed in: `{user:doc, workouts} = await cloud.loadCloud(u.uid)`; `account = normalize(fromCloud(doc, workouts))`; `guest = load()`.
    - `doc === null && hasGuestData(guest)` → `cloud.replaceAll(u.uid, guest)`, state = guest.
    - `doc !== null && hasGuestData(guest)` and the guest has any workout or weigh-in the account lacks → `confirm("Add this device's N workouts and M weigh-ins to your account?")`; yes → `{state, newWorkouts} = mergeGuest(account, guest)`, `addWorkouts(newWorkouts)`, `saveUser`; no → account.
    - otherwise account (an empty account with no guest data still gets `saveUser` so the document exists).
    - `synced = new Set(state.history.map(workoutId))`; `saver = debounced(s => cloud.saveUser(u.uid, s), 1000, e => toast(cloudMessage(e)))`; `watchUser` → when no save is pending, apply the doc's `plan/active/weights/goal` via `normalize(fromCloud(doc, state.history))` and re-route; `addEventListener('pagehide', () => saver.flush())`.
- [ ] **Step 3: `commit()`.** Guest: unchanged. Signed in: `saver.call(state)`; for each history entry whose `workoutId` is not in `synced`, `cloud.addWorkouts(uid, [h])` and add it to `synced`. Never writes `gml.v1` while signed in.
- [ ] **Step 4: Restore and sign-out.** Restore confirm text when signed in: `Replace the data in {email} with this backup? N workouts, M weigh-ins.` then `cloud.replaceAll`. Sign-out: `await saver.flush()` then `cloud.signOut()`.
- [ ] **Step 5: Delete account.** `confirm('Delete your FORM account and all its workouts and weigh-ins? Data saved on this device as a guest stays.')` → `saver.flush()` → `cloud.deleteAccount(uid)`; on `auth/requires-recent-login`: `cloud.sendLink(user.email)`, store `gml.delete-pending=1`, toast `For your safety, open the new link we just emailed to finish deleting.`; in `init`, after `finishLink` returns `'signed-in'` with `gml.delete-pending` set, clear it and run the deletion again.
- [ ] **Step 6: Markup and styles.** Account card in `index.html` (heading "Account"), `#email-dialog` following `#weight-dialog`'s structure, Home link `<a id="home-signin" href="#stats">Sign in to sync</a>` shown only for guests. `privacy.html`: standalone page in FORM's style covering the four points in the spec's "Delete account and privacy" section.
- [ ] **Step 7: Root tests** `node --test tests/*.test.mjs` → all PASS.
- [ ] **Step 8: Browser checks** on `preview_start form` (localhost is an authorized domain). Rules must be published first for 4–7 (Task 6, Step 1); 1–3 work without.
  1. Guest: plan, workout, weigh-in, export and restore behave exactly as on `main`.
  2. Send a link to a test inbox you control → "Check your inbox"; open it in the same browser → `Signed in`, URL has no sign-in query.
  3. Open a link in a private window → email dialog; Cancel → still guest, data intact; Sign in → signed in.
  4. First sign-in with guest data → uploaded; Firestore console shows `apps/form/users/{uid}` and `workouts/*`.
  5. Two tabs: tick a set in one → other tab updates within a few seconds; sign out right after an edit → console shows the edit saved.
  6. DevTools offline: tick a set → no data loss, reconnect → saved.
  7. Delete account → user doc and workouts gone in console; guest data still on the device.
- [ ] **Step 9: Commit** `git add dist README.md && git commit -m "Add accounts: email-link sign-in, cloud sync and delete account"`

### Task 6: Publish rules and ship

- [ ] **Step 1: Publish rules** — owner approves; paste `firestore.rules` into Firestore → Rules in the console (or `npx firebase deploy --only firestore:rules --project task-list-6a69a` from `tests/rules`). Confirm in the Rules Playground: unauthenticated get of `apps/form/users/x` denied; shop `orders` read by its customer still allowed.
- [ ] **Step 2: Budget alert** — owner sets it in Google Cloud Billing before announcing sign-ups.
- [ ] **Step 3: PR** from `firebase-accounts` to `main`; after merge, repeat browser checks 2, 4 and 5 on `https://perryong.github.io/gym-motion-lab/`.

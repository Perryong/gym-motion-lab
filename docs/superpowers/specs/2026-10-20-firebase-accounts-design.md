# Accounts and cloud sync with Firebase — design

Follows `2026-10-11-workout-app-design.md` and `2026-10-11-home-stats-design.md`. Turns FORM from a single-device app into one with public accounts, while keeping guest use exactly as it is today.

## Brief

- **Stated:** public sign-ups; sign-in by email link (passwordless) only; guests keep using FORM without an account; data lives in the existing Firebase project `task-list-6a69a`, which other apps share.
- **Assumed:** Firestore holds the data (Storage is not used); the site stays on GitHub Pages with no build step; JSON backup export/restore keeps working.
- **Success:** a person can sign in on phone and laptop and see the same plan, workouts and weigh-ins; a guest who signs in keeps what they already logged; no FORM user can read anyone else's data, and the other apps in the project are unaffected.

## Shared project

- One Auth user list for every app in the project: an existing `task-list-6a69a` user signs in to FORM with the same email and gets the same uid. FORM data starts empty for them.
- FORM owns only `apps/form/**` in Firestore. Other apps use their own top-level paths.
- Free-tier quotas (about 50k reads / 20k writes per day) are shared across the project's apps.
- The web config (including `apiKey`) is public by design and is committed; protection comes from the security rules.

## Architecture

- `dist/vendor/firebase/`: the official prebuilt browser ES modules for `firebase-app`, `firebase-auth` and `firebase-firestore`, one pinned version, with the licence file, vendored like Three.js. No runtime CDN.
- `dist/firebase-config.js`: the project's web config for a web app registered as "FORM".
- `dist/cloud.js`: the only module that imports Firebase.
  - `sendLink(email)`: `sendSignInLinkToEmail` with `url` = the current page without its hash, `handleCodeInApp: true`; stores the email in localStorage `gml.signin-email`.
  - `finishLink(href, askEmail)`: if `isSignInWithEmailLink`, completes sign-in with the stored email, or with `askEmail()` when the link opens on another device/browser; then removes the sign-in query from the URL with `history.replaceState`.
  - `onUser(callback)`, `signOut()`, `deleteAccount()`.
  - `loadCloud(uid)` → raw `{user, workouts}`; `watchUser(uid, callback)` (live listener for the user document); `saveUser(uid, doc)`; `addWorkout(uid, workout)`; `replaceAll(uid, state)` (used by backup restore and the first upload).
  - Firestore uses `persistentLocalCache` with the multi-tab manager, so writes queue offline and tabs stay consistent.
- `dist/sync.js` (pure, no Firebase import, unit-tested):
  - `toUserDoc(state)` → `{schema:1, plan, active, weights, goal}`; `toWorkoutDoc(h)` → the history entry.
  - `fromCloud(userDoc, workoutDocs)` → a JSON string fed to `normalize()`, so cloud data is validated exactly like localStorage and backup files.
  - `mergeGuest(account, guest)` → account state plus guest workouts not already present (by `started`) and guest weigh-ins on dates the account lacks; the account's plan, goal and active workout win when set, otherwise the guest's are used.
  - `workoutId(h)` → `String(h.started)`.
- `store.js`: unchanged API. `normalize()` stays the single validator.

## Data model

- `apps/form/users/{uid}`: `{schema:1, plan, active, weights, goal, updated}`.
- `apps/form/users/{uid}/workouts/{started}`: one finished workout `{day, name, started, finished, entries}`. The id is the start time, so the same workout can never be stored twice.

## Data flow (`app.js`)

- **Guest** (no user): `load()` / `save()` with localStorage `gml.v1`, as today.
- **Signed in:** state comes from `fromCloud(loadCloud(uid))`. `commit()` writes `toUserDoc(state)` debounced to 1 s, flushed on `pagehide`. `finishWorkout` also calls `addWorkout`. The `watchUser` listener applies remote changes to the user document (another device) and re-renders, except while a local write is pending.
- **First sign-in on a device with guest data** (guest history or weights not empty):
  - account has no user document → `replaceAll(uid, guestState)`.
  - account has data → confirm: "Add this device's N workouts and M weigh-ins to your account?" Yes → `mergeGuest`, write the new workouts and the user document. No → use the account as is.
  - Either way the guest data stays on the device under `gml.v1`.
- **Sign-out:** back to the device's guest data.
- **Backup restore while signed in** replaces the account's data (`replaceAll`) after the existing confirm, whose text names the account.

## Screens

- **Stats → "Your data"** becomes **Account**:
  - Guest: "Stored only on this device. Sign in to keep it in your account." Email field + **Send sign-in link**; after sending, "Check your inbox at …".
  - Signed in: "Signed in as … · synced" (or "· offline, will sync"), **Sign out**, **Delete account**, link to **Privacy**.
  - **Export backup** / **Restore backup** stay in the card in both modes.
- **Home:** a small "Sign in to sync" link while a guest, going to the Account card.
- **Email confirm dialog** (link opened on another device): one email field, Cancel / Sign in.
- Errors are toasts in plain words: invalid email, expired or used link, offline, too many requests.

## Security rules

Before editing, read the project's current rules. FORM's block is added beside them; other apps' rules are not modified. If the existing rules grant broad access (for example any signed-in user reading everything), stop and show the owner before publishing, because every FORM user is a signed-in user of the project.

```
match /apps/form/users/{uid} {
  allow read, delete: if request.auth != null && request.auth.uid == uid;
  allow create, update: if request.auth != null && request.auth.uid == uid
    && request.resource.data.schema == 1
    && request.resource.data.weights.size() <= 2000;
  match /workouts/{id} {
    allow read, delete: if request.auth != null && request.auth.uid == uid;
    allow create, update: if request.auth != null && request.auth.uid == uid
      && request.resource.data.started is int
      && id == string(request.resource.data.started)
      && request.resource.data.entries.size() <= 50;
  }
}
```

## Delete account and privacy

- **Delete account:** confirm, then delete every `workouts` document, the user document, then the Auth user. If Firebase requires a recent sign-in, send a fresh link and finish the deletion when it is opened. Local guest data is untouched.
- `dist/privacy.html`: what is stored (email, plan, workouts, weigh-ins), where (Google Firebase, project `task-list-6a69a`), that it is not shared or sold, and how to delete it. Linked from the Account card.
- Console: the project's public-facing name is set to "FORM" so sign-in emails do not say "task-list" (it is shared by the project's other apps; the owner decides).

## Testing

- `tests/sync.test.mjs`: `toUserDoc`/`fromCloud` round trip through `normalize()`; malformed cloud data falls back like localStorage; `mergeGuest` deduplicates workouts by `started`, keeps account weigh-ins on clashing dates, and fills plan/goal only when the account has none.
- `tests/rules/` (dev only, Firestore emulator via `firebase-tools` and `@firebase/rules-unit-testing`, needs Java): owner can read/write; another user and a signed-out visitor are denied; oversized and mis-keyed writes are rejected; a sample of the other apps' paths behaves the same before and after the merge.
- Existing `node --test tests/*.test.mjs` keeps passing; vendored Firebase files are not tested.
- Browser: guest flow unchanged; email-link round trip on localhost; two tabs stay in sync; offline tick then reconnect; sign-out returns to guest data; delete account removes the data. Repeated on GitHub Pages after deploy.

## Console setup (owner approves each step)

1. Authentication → Sign-in method: enable Email/Password with **Email link (passwordless sign-in)**.
2. Authentication → Settings → Authorized domains: add `perryong.github.io` (`localhost` is there by default).
3. Firestore: create the database if the project has none (production mode).
4. Project settings → add a web app "FORM"; copy its config into `firebase-config.js`.
5. Firestore → Rules: publish the merged rules after the emulator tests pass.

## Out of scope

Google/Apple/password sign-in, sharing between users, profiles, an admin view, Firebase Hosting, cloud sync of runs, migrating other apps' data.

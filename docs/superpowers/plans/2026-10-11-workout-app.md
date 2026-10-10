# Workout app — plan

Spec: `docs/superpowers/specs/2026-10-11-workout-app-design.md`. Executed inline.

1. `dist/store.js` + `tests/store.test.mjs` (test first).
2. Move studio wiring from `dist/app.js` to `dist/studio-view.js`; drop the old group list; point the legend test at the new file.
3. Rewrite `dist/index.html` into views + tab bar; keep studio markup and ids.
4. `library-view.js`, `plan-view.js`, `workout-view.js`, router in `app.js`.
5. App-shell styles appended to `dist/style.css`; detail view responsive.
6. `node --test tests/*.test.mjs`; browser QA at 390 px and desktop: add to plan, start, log sets, rest timer, finish, reload.
7. README code map update.

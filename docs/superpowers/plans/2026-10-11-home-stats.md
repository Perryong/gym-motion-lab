# Home and Stats — plan

Spec: `docs/superpowers/specs/2026-10-11-home-stats-design.md`. Executed inline on branch `home-stats` (from `workout-app`).

1. Tests first: weights/goal in `tests/store.test.mjs`, new `tests/stats.test.mjs`.
2. `store.js`: `weights`, `goal`, `logWeight`, `setGoal`. `stats.js`: derived values.
3. `charts.js`: SVG line chart, heatmap grid, body figure.
4. `home-view.js`, `stats-view.js`; weight dialog in `index.html`; router default `#home`; five-tab bar.
5. Styles; browser QA with seeded history; README code map.

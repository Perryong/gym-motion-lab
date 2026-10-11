# Home and Stats tabs — design

Follows `2026-10-11-workout-app-design.md`. Layout reference: openGym (AGPL-3.0), no code copied.

## Data (`store.js`)

- `weights: [{date:'YYYY-MM-DD', kg}]`, sorted, one per date; logging a date again replaces it. kg 20–400, rounded to 0.1.
- `goal: kg | null`, same range.
- Validated on load like the rest of the state.

## Derived values (`stats.js`, pure)

- `localDate(ms)`: local `YYYY-MM-DD`.
- `weekStreak(history, now)`: consecutive Monday-started weeks with ≥1 workout, counting back from the current week; an empty current week does not break it.
- `thisWeek(state, now)`: `{done, planned}` workouts this week.
- `monthCount(history, now)`.
- `weightChange(weights, now, days=30)`: latest kg minus the last entry on or before `now − days`; null without both.
- `heatmap(history, now, weeks=52)`: weeks × 7 cells `{date, minutes, level 0–4}`; levels at 0 / <30 / <45 / <60 / ≥60 min.
- `muscleSets(history, now, days)`: completed sets per group `{chest, legs, abs}`; `days=null` for all time.

## Views

- **Home** (`#home`, default route): date header; Mon–Sun strip (dot = workout done, ring = planned and still ahead); today card (Start / Resume / Rest day); body-weight card (latest, change since previous entry, goal and kg to go, 90-day SVG line with dashed goal line, Log dialog with kg, date, goal); streak card (`N week streak`, `done / planned this week · total`).
- **Stats** (`#stats`): tiles (workouts, this month, week streak, weight 30d); 52-week heatmap; muscle balance with Week / 30d / 90d / All and a front/back SVG figure shading chest, legs, core relative to the busiest group, plus set counts.
- Tab bar: Home · Plan · Start · Stats · Exercises.

## Out of scope

Fatigue and Strength tabs, personal records, weight prompt at workout start.

## Testing

`tests/stats.test.mjs` for every derived value; store tests for weight/goal validation and replace-on-same-date. Browser QA with seeded history at 390 px and desktop.

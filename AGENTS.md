# AGENTS.md

Vanilla HTML5 canvas Asteroids clone. No package manager, dependencies, bundler, build step, or automated tests.

## Run and verify

- Play: open `index.html` directly, or run `npx serve .` and visit `http://localhost:3000`.
- Only automated check: `node --check game.js` (parses only; `game.js` needs the browser DOM to run).
- There is no test suite. Verify changes manually in a browser: shoot/split asteroids, lose all lives, restart with Space, and clear a level.

## Structure

- `index.html` owns the canvas size (`800x600`) and loads `game.js` as a classic script. `game.js` hardcodes the same `W`/`H`; update both files if resizing.
- All game logic lives in `game.js` as top-level globals/classes. No modules, imports, or exports.
- `RADII`, `SPEEDS`, `POINTS` are indexed by asteroid size: `1` small, `2` medium, `3` large. New asteroids spawn at size 3; `split()` decrements the size.
- Shooting star: `ShootingStar extends Asteroid` — size 2, fast, `ttl = SHOOTING_STAR_LIFETIME` (10s), no split, 200 points via `this.points`. Spawn is rolled per level in `spawnAsteroids()` (50% chance, forced after `SHOOTING_STAR_GAP` levels without one via `levelsSinceStar`); expired ones are filtered right after asteroid `update()` (both `playing` and `dead` branches), so do not remove that filter. `drawHUD()` shows a flashing warning while one is in play.
- Power-ups: `PowerUp` class + global `powerups` array; each drop's `type` is `'speed'`, `'triple'` or `'shield'` (1/3 each). The drop roll lives in `destroyAsteroid()` — the shared destroy helper (points, explosion, drop roll, split) used by both bullet hits and shield absorption. Activation lives on `Ship.speedBoost`, `Ship.tripleShot` and `Ship.shield` (deaths and `reset()` clear all). While `tripleShot` is active, `tryShoot()` returns a 3-bullet fan spread (±`TRIPLE_SHOT_SPREAD`, 60° total). While the shield is active, ship-vs-asteroid collision uses `SHIELD_RADIUS` and destroys the asteroid via `destroyAsteroid()` instead of killing the ship. Tuning constants are grouped near the top (`POWERUP_*`, `SHIELD_*`, `TRIPLE_SHOT_SPREAD`, `SPEED_MULTIPLIER`). HUD active-effect rows (`VELOCIDAD`, `DISPARO TRIPLE`, `ESCUDO` with timer bars) are drawn via `drawStatus()`.
- Ship skins: data-driven `SKINS` array near the top (after the power-up constants). Each skin is path data (`pts` in local coordinates, nose toward `+X`, `closed`) plus `color` and a `flame` config; no external assets. `S` calls `cycleSkin()` and the choice persists in `localStorage` under `asteroids.skin` (id only, validated against `SKINS`, all wrapped in `try/catch` in case storage is blocked). `drawShipShape(skin, scale, lineWidth)` renders a skin and is shared by `Ship.draw()` and `drawLifeIcon()` (scale `0.5`, lw `1.2`), so the HUD lives always match the active skin.

## Conventions and gotchas

- State machine: `state` is `playing`, `dead`, or `gameover`; `update()` returns early in the latter two (the skin-change `pressed('KeyS')` block sits before those returns on purpose, so it works in every state). Game-over restart is `pressed('Space')`.
- Skins must keep the classic silhouette's bounds and never change the hitbox (`Ship.radius = 12`, bullet `NOSE = 21`); add new skins only as more entries in the `SKINS` array. The HUD shows `PIEL: NAME · S CAMBIAR` bottom-left, highlighted for `skinToast` seconds after a change.
- Input: use `keys[code]` for held controls and `pressed(code)` for one-shot actions. `pressed()` consumes the flag, and events use `e.code` (not `e.key`).
- Physics is delta-time based (`dt` capped at 0.05), with toroidal wrapping via `wrap()`. Exception: ship drag (`DRAG = 0.987`) is applied per frame, so it is framerate-dependent.
- Collision checks use plain Euclidean `dist()` without wrap-aware distance, so objects straddling the screen edge do not collide. This is a known limitation; preserve it unless explicitly fixing it.
- Player-facing text is Spanish (`NIVEL`, `PUNTAJE`, README); keep new UI strings in Spanish.

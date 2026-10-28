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
- Power-ups: `PowerUp` class + global `powerups` array; drop is rolled in the bullet-vs-asteroid loop, activation lives on `Ship.speedBoost` (deaths and `reset()` clear it). Tuning constants are grouped near the top (`POWERUP_*`, `SPEED_MULTIPLIER`).

## Conventions and gotchas

- State machine: `state` is `playing`, `dead`, or `gameover`; `update()` returns early in the latter two. Game-over restart is `pressed('Space')`.
- Input: use `keys[code]` for held controls and `pressed(code)` for one-shot actions. `pressed()` consumes the flag, and events use `e.code` (not `e.key`).
- Physics is delta-time based (`dt` capped at 0.05), with toroidal wrapping via `wrap()`. Exception: ship drag (`DRAG = 0.987`) is applied per frame, so it is framerate-dependent.
- Collision checks use plain Euclidean `dist()` without wrap-aware distance, so objects straddling the screen edge do not collide. This is a known limitation; preserve it unless explicitly fixing it.
- Player-facing text is Spanish (`NIVEL`, `PUNTAJE`, README); keep new UI strings in Spanish.

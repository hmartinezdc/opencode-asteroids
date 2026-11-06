'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const SHOOTING_STAR_CHANCE   = 0.50;  // por nivel: prob. de reemplazar un asteroide
const SHOOTING_STAR_GAP      = 3;     // máx. niveles seguidos sin estrella (luego aparece forzada)
const SHOOTING_STAR_LIFETIME = 10;    // s en pantalla antes de desaparecer
const SHOOTING_STAR_SPEED    = 165;   // px/s
const SHOOTING_STAR_POINTS   = 200;

// ── Power-ups ─────────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE  = 0.15;
const POWERUP_LIFETIME     = 10;  // s en el campo antes de desaparecer
const POWERUP_DURATION     = 5;   // s de efecto del disparo triple
const RAPID_FIRE_DURATION  = 15;  // s de disparo rápido
const POWERUP_RADIUS       = 10;
const POWERUP_KINDS        = ['speed', 'triple', 'shield']; // 1/3 cada uno al soltar un drop
const SHIELD_DURATION      = 6;   // s de efecto del escudo al recogerlo
const SHIELD_RADIUS        = 24;  // radio de la burbuja (y su colisión)
const SHIELD_COLOR         = '#7bffb2';
const TRIPLE_SHOT_SPREAD   = Math.PI / 6;   // desvío de ±30° (abanico de 60° en total)
const POWERUP_COLORS = {
  speed:  '#00e5ff',   // celeste: velocidad
  triple: '#ff6bd6',   // magenta: triple disparo
  shield: SHIELD_COLOR, // verde: escudo
};

// ── Skins de la nave ──────────────────────────────────────────────────────────
const SKIN_KEY = 'asteroids.skin';

// Cada skin dibuja su silueta en coordenadas locales (nariz hacia +X) con la
// misma escala que la nave clásica: no cambia el hitbox (radius 12, NOSE 21).
// Excepciones: `scale` agranda la silueta (y su hitbox por igual); `scoreMult`
// multiplica los puntos mientras esa skin esté activa.
const SKINS = [
  {
    id: 'clasica',
    name: 'CLÁSICA',
    color: '#fff',
    paths: [
      { pts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]], closed: true },
    ],
    flame: { x: -8, half: 4, color: 'rgba(255, 130, 0, 0.85)' },
  },
  {
    id: 'interceptor',
    name: 'INTERCEPTOR',
    color: '#00e5ff',
    paths: [
      { pts: [[22, 0], [4, -3], [-10, -3], [-14, 0], [-10, 3], [4, 3]], closed: true },  // fuselaje
      { pts: [[2, -3], [-8, -12], [-2, -9]], closed: true },                            // ala superior
      { pts: [[2, 3], [-8, 12], [-2, 9]], closed: true },                               // ala inferior
      { pts: [[0, -1.5], [8, 0], [0, 1.5]], closed: true },                             // cabina
    ],
    flame: { x: -12, half: 2.5, color: 'rgba(0, 229, 255, 0.8)' },
  },
  {
    id: 'fenix',
    name: 'FÉNIX',
    color: '#ffd166',
    paths: [
      { pts: [[20, 0], [0, -8], [-6, -13], [-9, -8], [-14, -4], [-10, 0], [-14, 4], [-9, 8], [-6, 13], [0, 8]], closed: true },  // cuerpo con aletas
      { pts: [[14, 0], [0, -3], [-6, 0], [0, 3]], closed: true },  // cabina
    ],
    flame: { x: -11, half: 3, color: 'rgba(255, 105, 0, 0.85)' },
  },
  {
    id: 'ovni',
    name: 'OVNI',
    color: '#c77dff',
    paths: [
      { pts: [[0, -7], [11, -5], [18, 0], [11, 5], [0, 7], [-11, 5], [-18, 0], [-11, -5]], closed: true },  // platillo
      { pts: [[0, -4], [4, 0], [0, 4], [-4, 0]], closed: true },  // cúpula
    ],
    flame: { x: -15, half: 3.5, color: 'rgba(199, 125, 255, 0.85)' },
  },
  {
    id: 'gigante',
    name: 'GIGANTE',
    color: '#b45cf3',          // morada
    scale: 2,                  // el doble de grande que la clásica
    scoreMult: 2,              // el doble de puntos mientras esté activa
    paths: [
      { pts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]], closed: true },
    ],
    flame: { x: -8, half: 4, color: 'rgba(180, 92, 243, 0.85)' },
  },
];

let currentSkinId = loadSkin();
let skinToast = 0;   // s restantes del aviso resaltado en el HUD

function loadSkin() {
  try {
    const saved = localStorage.getItem(SKIN_KEY);
    if (SKINS.some(s => s.id === saved)) return saved;
  } catch { /* almacenamiento bloqueado */ }
  return SKINS[0].id;
}

function saveSkin() {
  try { localStorage.setItem(SKIN_KEY, currentSkinId); } catch { /* ignore */ }
}

function getSkin() {
  return SKINS.find(s => s.id === currentSkinId) || SKINS[0];
}

function getSkinScale() {
  return getSkin().scale || 1;
}

function getSkinScoreMult() {
  return getSkin().scoreMult || 1;
}

function cycleSkin() {
  const i = SKINS.findIndex(s => s.id === currentSkinId);
  currentSkinId = SKINS[(i + 1) % SKINS.length].id;
  saveSkin();
  skinToast = 1.5;
}

// Dibuja la silueta de una skin en coordenadas locales (nariz hacia +X); el
// escalado se aplica a los puntos (no con transform) para controlar el grosor.
function drawShipShape(skin, scale = 1, lineWidth = 1.5) {
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = lineWidth;
  ctx.lineJoin    = 'round';
  for (const path of skin.paths) {
    ctx.beginPath();
    ctx.moveTo(path.pts[0][0] * scale, path.pts[0][1] * scale);
    for (let i = 1; i < path.pts.length; i++)
      ctx.lineTo(path.pts[i][0] * scale, path.pts[i][1] * scale);
    if (path.closed) ctx.closePath();
    ctx.stroke();
  }
}

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.points = POINTS[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 2);
    const angle = rand(0, Math.PI * 2);
    const speed = SHOOTING_STAR_SPEED + rand(-10, 10);
    this.vx    = Math.cos(angle) * speed;
    this.vy    = Math.sin(angle) * speed;
    this.ttl   = SHOOTING_STAR_LIFETIME;
    this.points = SHOOTING_STAR_POINTS;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      explode(this.x, this.y, 10);
    }
  }

  split() {
    return [];   // No se divide: explota directamente
  }

  draw() {
    // Parpadeo en los últimos 2.5 s
    if (this.ttl < 2.5 && Math.floor(this.ttl * 8) % 2 === 0) return;

    // Estela detrás de la dirección de movimiento
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 0) {
      const tx = this.vx / speed;
      const ty = this.vy / speed;
      for (let i = 3; i >= 1; i--) {
        const alpha = 0.08 * i;
        const d1 = i * 14;
        ctx.strokeStyle = `rgba(255, 209, 102, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 3 - i * 0.6;
        ctx.beginPath();
        ctx.moveTo(this.x - tx * d1, this.y - ty * d1);
        ctx.lineTo(this.x - tx * (d1 + 12), this.y - ty * (d1 + 12));
        ctx.stroke();
      }
    }

    // Cuerpo dorado
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12 * getSkinScale();
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.rapidFire     = 0;
    this.tripleShot    = 0;
    this.shield        = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.rapidFire     > 0) this.rapidFire     -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;
    if (this.shield        > 0) this.shield        -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.dead || (this.rapidFire <= 0 && this.shootCooldown > 0)) return [];
    this.shootCooldown = this.rapidFire > 0 ? 0 : 0.2;
    const NOSE = 21 * getSkinScale();
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    // Triple disparo: abanico de tres balas, 60° en total
    if (this.tripleShot > 0) {
      return [-1, 0, 1].map(i =>
        new Bullet(ox, oy, this.angle + TRIPLE_SHOT_SPREAD * i)
      );
    }

    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    const blinking = this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0;

    if (!blinking) {
      const skin = getSkin();
      const sk   = getSkinScale();

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      drawShipShape(skin, sk, 1.5 * sk);

      // Llama del propulsor
      if (this.thrusting && Math.random() > 0.35) {
        const f = skin.flame;
        ctx.beginPath();
        ctx.moveTo(f.x * sk, -f.half * sk);
        ctx.lineTo(f.x * sk - rand(6, 14) * sk, 0);
        ctx.lineTo(f.x * sk,  f.half * sk);
        ctx.strokeStyle = f.color;
        ctx.stroke();
      }

      ctx.restore();
    }

    if (this.shield > 0) this.drawShield();
  }

  drawShield() {
    // Parpadeo en los últimos 1.5 s
    if (this.shield < 1.5 && Math.floor(this.shield * 8) % 2 === 0) return;

    const radius = SHIELD_RADIUS + Math.sin(this.shield * 7) * 1.5;
    ctx.save();
    ctx.strokeStyle = SHIELD_COLOR;
    ctx.fillStyle   = 'rgba(123, 255, 178, 0.10)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Anillo interior punteado giratorio
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = this.shield * 20;
    ctx.globalAlpha    = 0.45;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-ups (velocidad / triple disparo / escudo) ──────────────────────────
class PowerUp {
  constructor(x, y, type) {
    this.type = type;
    this.x      = x;
    this.y      = y;
    this.radius = POWERUP_RADIUS;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 30);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.ttl  = POWERUP_LIFETIME;
    this.rot  = rand(0, Math.PI * 2);
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += dt * 1.5;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const pulse = 1 + Math.sin(this.rot * 4) * 0.15;
    const color = POWERUP_COLORS[this.type];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = 1.5;

    // Anillo exterior pulsante
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();

    if (this.type === 'speed') {
      // Rayo
      ctx.beginPath();
      ctx.moveTo( 2, -8);
      ctx.lineTo(-4,  1);
      ctx.lineTo(-1,  1);
      ctx.lineTo(-3,  8);
      ctx.lineTo( 4, -1);
      ctx.lineTo( 1, -1);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'triple') {
      // Tres líneas paralelas
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5 - 2,  6);
        ctx.lineTo(i * 5 + 2, -6);
        ctx.stroke();
      }
    } else {
      // Escudo
      ctx.beginPath();
      ctx.moveTo( 0, -8);
      ctx.lineTo( 6, -4);
      ctx.lineTo( 6,  2);
      ctx.quadraticCurveTo(6, 7, 0, 9);
      ctx.quadraticCurveTo(-6, 7, -6, 2);
      ctx.lineTo(-6, -4);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let levelsSinceStar;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  const forced    = levelsSinceStar >= SHOOTING_STAR_GAP;
  const starIndex = (Math.random() < SHOOTING_STAR_CHANCE || forced) ? randInt(0, count - 1) : -1;
  if (starIndex >= 0) levelsSinceStar = 0;
  else levelsSinceStar++;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(i === starIndex ? new ShootingStar(x, y) : new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  levelsSinceStar = 0;
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Destruye un asteroide como si lo hubiera destruido una bala:
// puntos, explosión, posible drop y división. Devuelve los fragmentos.
function destroyAsteroid(a) {
  a.dead = true;
  score += a.points * getSkinScoreMult();   // x2 con la nave GIGANTE
  explode(a.x, a.y, a.size * 5);
  if (Math.random() < POWERUP_DROP_CHANCE)
    powerups.push(new PowerUp(a.x, a.y, POWERUP_KINDS[randInt(0, POWERUP_KINDS.length - 1)]));
  return a.split();
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambiar skin: se procesa antes del retorno por estado, para que funcione
  // también en 'dead' y 'gameover'
  if (pressed('KeyS')) {
    cycleSkin();
    if (ship) ship.radius = 12 * getSkinScale();
  }
  skinToast = Math.max(0, skinToast - dt);

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    asteroids = asteroids.filter(a => !a.dead);
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  asteroids = asteroids.filter(a => !a.dead);   // expiración de estrella fugaz
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        newAsteroids.push(...destroyAsteroid(a));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide (con escudo la burbuja destruye el asteroide sin dañar la nave)
  const shieldFragments = [];
  if (ship.invincible <= 0) {
    const hitRadius = ship.shield > 0 ? SHIELD_RADIUS : ship.radius;
    for (const a of asteroids) {
      if (a.dead) continue;
      if (dist(ship, a) < hitRadius + a.radius * 0.82) {
        if (ship.shield > 0) {
          shieldFragments.push(...destroyAsteroid(a));
        } else {
          killShip();
          break;
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(shieldFragments);

  // Nave vs power-up
  for (const p of powerups) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'speed')       ship.rapidFire = RAPID_FIRE_DURATION;
      else if (p.type === 'triple') ship.tripleShot = POWERUP_DURATION;
      else                          ship.shield     = SHIELD_DURATION;
      explode(p.x, p.y, 5);
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  // Escala inversa para que todos los íconos de vidas midan lo mismo,
  // sin importar el tamaño de la skin activa
  drawShipShape(getSkin(), 0.5 / getSkinScale(), 1.2);
  ctx.restore();
}

// Estado activo: etiqueta + tiempo + barra de progreso
function drawStatus(label, timeLeft, max, y, color) {
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.font      = '15px monospace';
  ctx.fillText(`${label}  ${timeLeft.toFixed(1)}s`, 14, y);

  const BAR_W  = 106;
  const frac   = Math.min(timeLeft / max, 1);
  const urgent = timeLeft < 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(14, y + 6, BAR_W, 4);
  ctx.fillStyle = urgent ? '#ff8255' : color;
  ctx.fillRect(15, y + 7, (BAR_W - 2) * frac, 3);
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  let statusY = 48;
  if (ship.rapidFire > 0) {
    drawStatus('DISPARO RÁPIDO', ship.rapidFire, RAPID_FIRE_DURATION, statusY, POWERUP_COLORS.speed);
    statusY += 26;
  }
  if (ship.tripleShot > 0) {
    drawStatus('DISPARO TRIPLE', ship.tripleShot, POWERUP_DURATION, statusY, POWERUP_COLORS.triple);
    statusY += 26;
  }
  if (ship.shield > 0) {
    drawStatus('ESCUDO', ship.shield, SHIELD_DURATION, statusY, POWERUP_COLORS.shield);
  }

  // Aviso parpadeante si hay estrella fugaz en el campo
  if (asteroids.some(a => a instanceof ShootingStar) && Math.floor(Date.now() / 300) % 2 === 0) {
    ctx.fillStyle   = '#ffd166';
    ctx.font        = 'bold 15px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('★ ESTRELLA FUGAZ', W / 2, 48);
  }

  // Skin activa (con indicador de multiplicador de puntos si aplica)
  const mult = getSkinScoreMult();
  ctx.fillStyle = skinToast > 0 ? '#fff' : 'rgba(255,255,255,0.45)';
  ctx.font      = '13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`PIEL: ${getSkin().name}${mult > 1 ? ` PUNTOS x${mult}` : ''}  ·  S CAMBIAR`, 14, H - 16);
}

function drawOverlay(title, sub, hint) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);

  if (hint) {
    ctx.font      = '15px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(hint, W / 2, H / 2 + 52);
  }
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover') {
    const skin = getSkin();
    const m    = getSkinScoreMult();
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`,
      `S — CAMBIAR PIEL  (${skin.name}${m > 1 ? `, PUNTOS x${m}` : ''})`);
  }
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);

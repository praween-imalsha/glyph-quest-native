import {
  COLS,
  ROWS,
  TILE,
  VIEW_H,
  VIEW_W,
  isWall,
  parseLevel,
  type EnemySpawn,
  type LevelDef,
  type Point,
  type ParsedLevel,
} from "./levels";

export type Direction = "up" | "down" | "left" | "right";

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  dash: boolean;
}

export const emptyInput = (): InputState => ({
  up: false,
  down: false,
  left: false,
  right: false,
  dash: false,
});

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  dir: Direction;
  moving: boolean;
  anim: number;
  invuln: number;
  dashTimer: number;
  dashCooldown: number;
  knockTimer: number;
  knockX: number;
  knockY: number;
}

export interface Enemy extends EnemySpawn {
  dir: number;
  speed: number;
  w: number;
  h: number;
  phase: number;
}

export interface Glyph extends Point {
  taken: boolean;
  phase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: "pale" | "ink" | "mid";
  size: number;
}

export type GameEvent =
  | "glyph"
  | "hurt"
  | "door"
  | "clear"
  | "dead"
  | "dash"
  | "spike"
  | "hint";

export interface World {
  parsed: ParsedLevel;
  player: Player;
  enemies: Enemy[];
  glyphs: Glyph[];
  spikes: Point[];
  particles: Particle[];
  doorOpen: boolean;
  hearts: number;
  time: number;
  hint: number;
  shake: number;
  flash: number;
  status: "running" | "cleared" | "dead";
  glyphsCollected: number;
  totalGlyphs: number;
  level: LevelDef;
  seed: number;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function createWorld(level: LevelDef, carryProgress = false): World {
  const parsed = parseLevel(level);
  return {
    parsed,
    level,
    player: {
      x: parsed.start.x,
      y: parsed.start.y,
      w: 6,
      h: 6,
      dir: "down",
      moving: false,
      anim: 0,
      invuln: 1,
      dashTimer: 0,
      dashCooldown: 0,
      knockTimer: 0,
      knockX: 0,
      knockY: 0,
    },
    enemies: parsed.enemies.map((spawn, i) => ({
      ...spawn,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 15 + level.id * 1.9 + ((i * 7) % 6),
      w: 6,
      h: 6,
      phase: i * 1.37,
    })),
    glyphs: parsed.glyphs.map((g, i) => ({ ...g, taken: false, phase: i * 1.9 })),
    spikes: parsed.spikes,
    particles: [],
    doorOpen: false,
    hearts: 3,
    time: 0,
    hint: 0,
    shake: 0,
    flash: 0,
    status: "running",
    glyphsCollected: 0,
    totalGlyphs: parsed.glyphs.length,
    seed: parsed.floorSeed,
    ...(carryProgress ? {} : {}),
  };
}

function rectHitsWall(walls: boolean[][], cx: number, cy: number, w: number, h: number): boolean {
  const left = cx - w / 2;
  const right = cx + w / 2 - 0.01;
  const top = cy - h / 2;
  const bottom = cy + h / 2 - 0.01;
  if (left < 0 || top < 0 || right >= VIEW_W || bottom >= VIEW_H) return true;
  const x0 = Math.floor(left / TILE);
  const x1 = Math.floor(right / TILE);
  const y0 = Math.floor(top / TILE);
  const y1 = Math.floor(bottom / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (isWall(walls, tx, ty)) return true;
    }
  }
  return false;
}

function spawnBurst(world: World, x: number, y: number, count: number, color: Particle["color"] = "pale") {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const sp = 10 + Math.random() * 26;
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 8,
      life: 0.45 + Math.random() * 0.35,
      max: 0.8,
      color,
      size: Math.random() > 0.6 ? 2 : 1,
    });
  }
}

function hurtPlayer(world: World, events: GameEvent[], from?: Point) {
  const p = world.player;
  if (p.invuln > 0 || p.dashTimer > 0 || world.status !== "running") return;
  world.hearts -= 1;
  p.invuln = 1.5;
  world.shake = 0.34;
  world.flash = 0.16;
  if (from) {
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    p.knockX = (dx / len) * 10;
    p.knockY = (dy / len) * 10;
    p.knockTimer = 0.16;
  }
  spawnBurst(world, p.x, p.y, 9, "ink");
  events.push("hurt");
  if (world.hearts <= 0) {
    world.hearts = 0;
    world.status = "dead";
    events.push("dead");
  }
}

export function requestDash(world: World, events: GameEvent[]) {
  const p = world.player;
  if (world.status !== "running" || p.dashCooldown > 0 || p.dashTimer > 0) return;
  p.dashTimer = 0.16;
  p.dashCooldown = 0.85;
  p.invuln = Math.max(p.invuln, 0.22);
  spawnBurst(world, p.x, p.y, 5, "mid");
  events.push("dash");
}

export function requestHint(world: World) {
  if (world.status !== "running") return;
  world.hint = 1.8;
}

export function stepWorld(world: World, input: InputState, dt: number, events: GameEvent[]) {
  if (world.status !== "running") return;
  const p = world.player;
  world.time += dt;
  world.hint = Math.max(0, world.hint - dt);
  world.shake = Math.max(0, world.shake - dt);
  world.flash = Math.max(0, world.flash - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.knockTimer = Math.max(0, p.knockTimer - dt);

  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? "right" : "left";
    else if (Math.abs(dy) > 0) p.dir = dy > 0 ? "down" : "up";
    p.moving = true;
    p.anim += dt * (p.dashTimer > 0 ? 18 : 9);
  } else {
    p.moving = false;
  }

  const dashMultiplier = p.dashTimer > 0 ? 3.1 : 1;
  const len = Math.hypot(dx, dy) || 1;
  let vx = (dx / len) * 55 * dashMultiplier;
  let vy = (dy / len) * 55 * dashMultiplier;

  if (p.dashTimer > 0) {
    p.dashTimer = Math.max(0, p.dashTimer - dt);
  } else if (p.knockTimer > 0) {
    vx = p.knockX / Math.max(0.016, p.knockTimer);
    vy = p.knockY / Math.max(0.016, p.knockTimer);
  }

  const nextX = p.x + vx * dt;
  if (!rectHitsWall(world.parsed.walls, nextX, p.y, p.w, p.h)) p.x = nextX;
  else p.dashTimer = 0;
  const nextY = p.y + vy * dt;
  if (!rectHitsWall(world.parsed.walls, p.x, nextY, p.w, p.h)) p.y = nextY;
  else p.dashTimer = 0;

  p.x = clamp(p.x, 3, VIEW_W - 3);
  p.y = clamp(p.y, 3, VIEW_H - 3);

  // ---- Enemies ----
  for (const e of world.enemies) {
    const step = e.speed * dt * e.dir;
    if (e.axis === "h") {
      if (rectHitsWall(world.parsed.walls, e.x + step, e.y, e.w, e.h)) e.dir *= -1;
      else e.x += step;
    } else {
      if (rectHitsWall(world.parsed.walls, e.x, e.y + step, e.w, e.h)) e.dir *= -1;
      else e.y += step;
    }
    const dxp = Math.abs(p.x - e.x);
    const dyp = Math.abs(p.y - e.y);
    if (dxp < (p.w + e.w) / 2 + 1 && dyp < (p.h + e.h) / 2 + 1) {
      hurtPlayer(world, events, e);
      if (world.status !== "running") break;
    }
  }

  if (world.status !== "running") return;

  // ---- Spikes ----
  for (const s of world.spikes) {
    if (Math.abs(p.x - s.x) < 5 && Math.abs(p.y - s.y) < 5) {
      hurtPlayer(world, events, s);
      if (world.status !== "running") return;
      break;
    }
  }

  // ---- Glyphs ----
  for (const g of world.glyphs) {
    if (g.taken) continue;
    if (Math.hypot(p.x - g.x, p.y - g.y) < 8) {
      g.taken = true;
      world.glyphsCollected += 1;
      spawnBurst(world, g.x, g.y - 2, 10, "pale");
      events.push("glyph");
      if (world.glyphsCollected === world.totalGlyphs) {
        world.doorOpen = true;
        world.flash = 0.22;
        spawnBurst(world, world.parsed.door.x, world.parsed.door.y, 14, "pale");
        events.push("door");
      }
    }
  }

  // ---- Exit ----
  if (world.doorOpen) {
    const d = world.parsed.door;
    if (Math.abs(p.x - d.x) < 5 && Math.abs(p.y - d.y) < 7) {
      world.status = "cleared";
      spawnBurst(world, d.x, d.y, 20, "pale");
      events.push("clear");
    }
  }

  // ---- Particles ----
  for (const particle of world.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 70 * dt;
  }
  world.particles = world.particles.filter((particle) => particle.life > 0);
}

export function computeResult(world: World) {
  const hearts = Math.max(0, world.hearts);
  const speedBonus = Math.max(0, Math.round(75 - world.time)) * 6;
  const score = 400 + world.totalGlyphs * 120 + hearts * 100 + speedBonus;
  return {
    score,
    time: world.time,
    hearts,
    glyphs: world.glyphsCollected,
    totalGlyphs: world.totalGlyphs,
  };
}

export type RunResult = ReturnType<typeof computeResult>;

export const LEVEL_GEOMETRY = { COLS, ROWS, TILE, VIEW_W, VIEW_H };

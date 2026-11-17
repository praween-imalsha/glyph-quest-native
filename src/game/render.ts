import { createPicture, type SkPicture } from "@shopify/react-native-skia";
import { COLS, ROWS, TILE } from "./levels";
import type { Enemy, Particle, World } from "./engine";
import { Gfx } from "./gfx";

const C = {
  floor: "#c8d996",
  floorLight: "#d9e6b0",
  floorDark: "#b4c981",
  wall: "#4e6a33",
  wallLight: "#7e9a4f",
  wallHi: "#9cb768",
  wallDark: "#344c21",
  ink: "#192b12",
  pale: "#e7efc5",
  mid: "#8ba958",
};

const hash = (x: number, y: number, seed: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

function drawFloor(ctx: Gfx, seed: number) {
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const x = tx * TILE;
      const y = ty * TILE;
      const h = hash(tx, ty, seed);
      // alternating stone checker
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = C.floorLight;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = C.floor;
        ctx.fillRect(x + 4, y, 4, 4);
        ctx.fillRect(x, y + 4, 4, 4);
      } else {
        ctx.fillStyle = C.floorDark;
        ctx.fillRect(x + 3, y + 3, 2, 2);
      }
      // deterministic grit
      if (h > 0.82) {
        ctx.fillStyle = C.floorDark;
        ctx.fillRect(x + 1 + (Math.floor(h * 50) % 5), y + 2 + (Math.floor(h * 90) % 4), 1, 1);
      } else if (h < 0.1) {
        ctx.fillStyle = C.floorLight;
        ctx.fillRect(x + 2 + (Math.floor(h * 300) % 4), y + 5, 2, 1);
      }
      if (hash(tx, ty, seed + 9) > 0.93) {
        ctx.fillStyle = C.floorDark;
        ctx.fillRect(x + 2, y + 1, 1, 2);
        ctx.fillRect(x + 3, y + 3, 2, 1);
      }
    }
  }
}

function drawDust(ctx: Gfx, seed: number, time: number) {
  // slow drifting dust motes
  for (let i = 0; i < 7; i += 1) {
    const dx = (hash(i, 3, seed) * COLS * TILE + time * (3 + i)) % (COLS * TILE);
    const dy = (hash(i, 7, seed) * ROWS * TILE + Math.sin(time * 0.4 + i) * 5 + 16) % (ROWS * TILE);
    ctx.fillStyle = i % 2 === 0 ? C.floorLight : C.floorDark;
    ctx.fillRect(Math.floor(dx), Math.floor(dy), 1, 1);
  }
}

function drawWalls(ctx: Gfx, walls: boolean[][], seed: number) {
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      if (!walls[ty][tx]) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      const floorBelow = ty + 1 < ROWS ? !walls[ty + 1][tx] : false;
      ctx.fillStyle = C.wall;
      ctx.fillRect(x, y, TILE, TILE);
      // stone joints
      ctx.fillStyle = C.wallDark;
      ctx.fillRect(x, y + 3, TILE, 1);
      ctx.fillRect(x, y + 7, TILE, 1);
      ctx.fillRect(x + ((tx + ty) % 2 === 0 ? 3 : 5), y, 1, 3);
      ctx.fillRect(x + ((tx + ty) % 2 === 0 ? 5 : 2), y + 4, 1, 3);
      // top highlight
      ctx.fillStyle = C.wallLight;
      ctx.fillRect(x, y, TILE, 1);
      ctx.fillStyle = C.wallHi;
      ctx.fillRect(x, floorBelow ? y : y + 1, floorBelow ? TILE : 0, 1);
      // moss + grit
      const h = hash(tx, ty, seed);
      if (h > 0.66) {
        ctx.fillStyle = C.wallLight;
        ctx.fillRect(x + 1, y + (h > 0.85 ? 5 : 1), 2, 1);
      }
      if (h < 0.18) {
        ctx.fillStyle = C.wallDark;
        ctx.fillRect(x + 5, y + 4, 2, 2);
      }
      if (floorBelow) {
        ctx.fillStyle = C.wallHi;
        ctx.fillRect(x, y + TILE - 1, TILE, 1);
      }
    }
  }
}

function drawTorches(ctx: Gfx, walls: boolean[][], seed: number, time: number) {
  for (let ty = 1; ty < ROWS - 1; ty += 1) {
    for (let tx = 1; tx < COLS - 1; tx += 1) {
      if (!walls[ty][tx]) continue;
      if (walls[ty + 1][tx]) continue;
      const h = hash(tx, ty, seed + 21);
      if (h < 0.7) continue;
      const cx = tx * TILE + 4;
      const cy = ty * TILE + 5;
      const flicker = Math.sin(time * 9 + tx * 2.1) > 0.25 ? 1 : 0;
      // bracket
      ctx.fillStyle = C.ink;
      ctx.fillRect(cx - 1, cy + 2, 3, 2);
      ctx.fillStyle = C.wallHi;
      ctx.fillRect(cx - 1, cy + 2, 3, 1);
      // flame
      ctx.fillStyle = C.ink;
      ctx.fillRect(cx - 1, cy - 2 - flicker, 3, 5);
      ctx.fillStyle = C.mid;
      ctx.fillRect(cx - 1, cy - 1 - flicker, 2, 3);
      ctx.fillStyle = C.pale;
      ctx.fillRect(cx, cy - 2 - flicker, 1, 3);
      ctx.fillStyle = C.ink;
      ctx.fillRect(cx, cy + 2, 1, 1);
      // glow dither
      ctx.fillStyle = C.pale;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(cx - 2, cy - 3, 1, 1);
      ctx.fillRect(cx + 2, cy - 2, 1, 1);
      ctx.fillRect(cx - 1, cy + 4, 1, 1);
      ctx.fillRect(cx - 3, cy + 1, 1, 1);
      ctx.fillRect(cx + 3, cy, 1, 1);
      ctx.globalAlpha = 1;
    }
  }
}

function drawDoor(ctx: Gfx, world: World, time: number) {
  const d = world.parsed.door;
  const x = Math.round(d.x);
  const y = Math.round(d.y);
  const tl = x - 6;
  const tt = y - 9;
  // arch shadow / frame
  ctx.fillStyle = C.ink;
  ctx.fillRect(tl, tt + 1, 13, 15);
  ctx.fillRect(tl + 1, tt, 11, 1);
  ctx.fillRect(tl + 2, tt - 1, 9, 1);
  ctx.fillStyle = C.wallLight;
  ctx.fillRect(tl + 1, tt + 2, 11, 13);
  ctx.fillStyle = C.wall;
  ctx.fillRect(tl + 2, tt + 3, 9, 12);
  ctx.fillStyle = C.wallDark;
  ctx.fillRect(tl + 3, tt + 6, 7, 9);

  if (world.doorOpen) {
    // open portal
    for (let i = 0; i < 11; i += 1) {
      const band = i % 3;
      ctx.fillStyle = band === 0 ? C.ink : band === 1 ? C.wall : C.floorDark;
      ctx.fillRect(tl + 3, tt + 7 + i, 7, 1);
    }
    ctx.fillStyle = C.pale;
    for (let i = 0; i < 5; i += 1) {
      const ang = time * 1.8 + (i * Math.PI * 2) / 5;
      const px = Math.round(tl + 6.5 + Math.cos(ang) * (2 + (i % 2)));
      const py = Math.round(tt + 11.5 + Math.sin(ang) * (3 + (i % 3)));
      ctx.fillRect(px, py, 1, 1);
    }
    ctx.fillStyle = C.pale;
    ctx.globalAlpha = 0.16 + Math.sin(time * 4) * 0.05;
    ctx.fillRect(tl - 2, tt - 2, 17, 20);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.ink;
    ctx.fillRect(tl + 6, tt + 13, 2, 1);
  } else {
    // locked glyph seal
    ctx.fillStyle = C.floorDark;
    ctx.fillRect(tl + 4, tt + 5, 5, 1);
    ctx.fillRect(tl + 3, tt + 9, 7, 1);
    ctx.fillStyle = C.pale;
    ctx.fillRect(tl + 6, tt + 9, 1, 3);
    ctx.fillRect(tl + 5, tt + 10, 3, 1);
    ctx.fillRect(tl + 6, tt + 12, 1, 1);
    ctx.fillStyle = C.ink;
    ctx.fillRect(tl + 5, tt + 14, 3, 1);
  }
  // threshold
  ctx.fillStyle = C.wallHi;
  ctx.fillRect(tl - 1, tt + 16, 15, 1);
  ctx.fillStyle = C.ink;
  ctx.fillRect(tl, tt + 17, 13, 1);
}

function drawGlyph(ctx: Gfx, gx: number, gy: number, phase: number, time: number, strong = false) {
  const bob = Math.round(Math.sin(time * 3 + phase) * 1.5);
  const x = Math.round(gx);
  const y = Math.round(gy) + bob;
  // shadow
  ctx.fillStyle = C.floorDark;
  ctx.fillRect(x - 2, Math.round(gy) + 4, 5, 1);
  // diamond
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 1, y - 4, 3, 1);
  ctx.fillRect(x - 2, y - 3, 5, 1);
  ctx.fillRect(x - 3, y - 2, 7, 3);
  ctx.fillRect(x - 2, y + 1, 5, 1);
  ctx.fillRect(x - 1, y + 2, 3, 1);
  ctx.fillStyle = C.pale;
  ctx.fillRect(x - 2, y - 2, 5, 3);
  ctx.fillStyle = C.mid;
  ctx.fillRect(x, y - 2, 1, 3);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 1, y + 1, 3, 1);
  // glint
  const glint = Math.sin(time * 5 + phase) > 0.3;
  if (glint || strong) {
    ctx.fillStyle = C.pale;
    ctx.fillRect(x - 3, y - 4, 1, 1);
    ctx.fillRect(x + 3, y + 1, 1, 1);
  }
  if (strong) {
    ctx.fillStyle = C.pale;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x - 4, y - 2, 1, 1);
    ctx.fillRect(x + 4, y - 2, 1, 1);
    ctx.globalAlpha = 1;
  }
}

function drawSpike(ctx: Gfx, sx: number, sy: number, time: number) {
  const x = Math.round(sx - 4);
  const y = Math.round(sy - 4);
  ctx.fillStyle = C.wallDark;
  ctx.fillRect(x, y + 5, 8, 2);
  for (let i = 0; i < 3; i += 1) {
    const bx = x + i * 3;
    ctx.fillStyle = C.ink;
    ctx.fillRect(bx, y + 3, 2, 3);
    ctx.fillRect(bx + 1, y + 1, 1, 3);
    ctx.fillStyle = C.pale;
    ctx.fillRect(bx + 1, y + 1, 1, 1);
    ctx.fillStyle = C.mid;
    ctx.fillRect(bx, y + 4, 1, 1);
  }
  const shimmer = Math.sin(time * 4 + sx) > 0.6;
  if (shimmer) {
    ctx.fillStyle = C.pale;
    ctx.fillRect(x + 6, y + 2, 1, 1);
  }
}

function drawEnemy(ctx: Gfx, e: Enemy, time: number) {
  const x = Math.round(e.x - 4);
  const y = Math.round(e.y - 4);
  if (e.axis === "h") {
    // slime
    const squish = Math.sin(time * 5 + e.phase) > 0 ? 0 : 1;
    ctx.fillStyle = C.wallDark;
    ctx.fillRect(x + 1, y + 7, 6, 1);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 1, y + 2 + squish, 6, 4 - squish);
    ctx.fillRect(x + 2, y + 1 + squish, 4, 1);
    ctx.fillStyle = C.mid;
    ctx.fillRect(x + 2, y + 2 + squish, 4, 2);
    ctx.fillStyle = C.pale;
    ctx.fillRect(x + 2, y + 2 + squish, 1, 1);
    ctx.fillRect(x + 5, y + 2 + squish, 1, 1);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 3, y + 2 + squish, 1, 1);
    ctx.fillRect(x + 4, y + 2 + squish, 1, 1);
    ctx.fillStyle = C.mid;
    ctx.fillRect(x + 6, y + 4 + squish, 1, 1);
    ctx.fillRect(x, y + 4 + squish, 1, 1);
  } else {
    // bat
    const flap = Math.sin(time * 9 + e.phase) > 0 ? 0 : 1;
    ctx.fillStyle = C.wallDark;
    ctx.fillRect(x + 2, y + 7, 4, 1);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 3, y + 2, 2, 5);
    ctx.fillRect(x + 2, y + 3, 4, 2);
    ctx.fillStyle = C.mid;
    ctx.fillRect(x, y + 2 + flap, 2, 2);
    ctx.fillRect(x + 6, y + 2 + flap, 2, 2);
    ctx.fillRect(x + 1, y + 4 - flap, 2, 1);
    ctx.fillRect(x + 5, y + 4 - flap, 2, 1);
    ctx.fillStyle = C.pale;
    ctx.fillRect(x + 3, y + 3, 1, 1);
    ctx.fillRect(x + 4, y + 3, 1, 1);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 3, y + 4, 1, 1);
    ctx.fillRect(x + 4, y + 4, 1, 1);
    ctx.fillStyle = C.pale;
    ctx.fillRect(x + 2, y + 6, 1, 1);
    ctx.fillRect(x + 5, y + 6, 1, 1);
  }
}

function drawPlayer(ctx: Gfx, world: World, time: number) {
  const p = world.player;
  if (p.invuln > 0 && Math.floor(time * 20) % 2 === 0) return;
  const bx = Math.round(p.x - 4);
  let by = Math.round(p.y - 5);
  const walk = p.moving ? Math.round(Math.sin(p.anim) * 1) : 0;
  const faceLeft = p.dir === "left";
  by += walk > 0 ? 0 : 0;

  // shadow
  ctx.fillStyle = C.wallDark;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(bx + 2, Math.round(p.y) + 3, 5, 1);
  ctx.globalAlpha = 1;

  // lantern glow
  const lx = faceLeft ? bx - 1 : bx + 7;
  ctx.fillStyle = C.pale;
  ctx.globalAlpha = 0.18 + Math.sin(time * 5) * 0.04;
  ctx.fillRect(lx - 1, by + 2, 4, 4);
  ctx.globalAlpha = 1;

  // cloak / silhouette
  ctx.fillStyle = C.ink;
  ctx.fillRect(bx + 2, by, 4, 2);
  ctx.fillRect(bx + 1, by + 2, 6, 3);
  ctx.fillRect(bx + 2, by + 5, 4, 2);
  ctx.fillStyle = C.mid;
  ctx.fillRect(bx + 2, by + 2, 4, 2);
  ctx.fillRect(bx + 2, by + 5, 1, 1);
  ctx.fillStyle = C.wallDark;
  ctx.fillRect(bx + 4, by + 5, 2, 1);
  // face
  ctx.fillStyle = C.pale;
  ctx.fillRect(bx + 3, by + 2, 2, 2);
  if (p.dir === "up") {
    ctx.fillStyle = C.mid;
    ctx.fillRect(bx + 3, by + 2, 2, 2);
  }
  ctx.fillStyle = C.ink;
  if (p.dir !== "up") {
    ctx.fillRect(faceLeft ? bx + 3 : bx + 4, by + 2, 1, 1);
  }
  // boots
  const legOffset = p.moving ? (Math.floor(p.anim) % 2 === 0 ? 1 : 0) : 0;
  ctx.fillStyle = C.ink;
  ctx.fillRect(bx + 2, by + 7, 1, 1);
  ctx.fillRect(bx + 4 + legOffset, by + 7, 1, 1);
  // lantern
  ctx.fillStyle = C.ink;
  ctx.fillRect(lx, by + 4, 2, 3);
  ctx.fillStyle = C.pale;
  ctx.fillRect(lx, by + 5, 2, 1 + (Math.floor(time * 4) % 2));
  // dash after-images
  if (p.dashTimer > 0) {
    ctx.fillStyle = C.pale;
    ctx.globalAlpha = 0.4;
    for (let i = 1; i <= 2; i += 1) {
      ctx.fillRect(bx - 1 * i, by + 3, 2, 3);
    }
    ctx.globalAlpha = 1;
  }
}

function drawParticles(ctx: Gfx, particles: Particle[]) {
  for (const pt of particles) {
    const alpha = Math.max(0, pt.life / pt.max);
    ctx.globalAlpha = Math.min(1, alpha + 0.2);
    ctx.fillStyle = pt.color === "ink" ? C.ink : pt.color === "mid" ? C.mid : C.pale;
    ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawHint(ctx: Gfx, world: World, time: number) {
  if (world.hint <= 0) return;
  const pulse = Math.sin(time * 10) > 0;
  for (const g of world.glyphs) {
    if (g.taken) continue;
    ctx.strokeStyle = C.pale;
    ctx.globalAlpha = pulse ? 0.85 : 0.35;
    ctx.strokeRect(Math.round(g.x) - 5, Math.round(g.y) - 6, 10, 12);
    ctx.globalAlpha = 1;
  }
  // arrow to door
  const p = world.player;
  const dx = world.parsed.door.x - p.x;
  const dy = world.parsed.door.y - p.y;
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  ctx.fillStyle = C.ink;
  const dirH = Math.abs(dx) > Math.abs(dy);
  ctx.globalAlpha = pulse ? 0.9 : 0.45;
  if (dirH) {
    const s = dx > 0 ? 1 : -1;
    ctx.fillRect(x + 8 * s, y - 3, 2 * s, 7);
    ctx.fillRect(x + 10 * s, y - 1, 2 * s, 3);
    ctx.fillRect(x + 12 * s, y, 2 * s, 1);
  } else {
    const s = dy > 0 ? 1 : -1;
    ctx.fillRect(x - 3, y + 8 * s, 7, 2 * s);
    ctx.fillRect(x - 1, y + 10 * s, 3, 2 * s);
    ctx.fillRect(x, y + 12 * s, 1, 2 * s);
  }
  ctx.globalAlpha = 1;
}

/**
 * Floor and walls never change inside a chamber, so they are recorded once into
 * Skia pictures and replayed each frame instead of re-issuing ~2,000 rect calls.
 */
export interface StaticLayers {
  floor: SkPicture;
  walls: SkPicture;
}

export function buildStaticLayers(world: World): StaticLayers {
  const size = { width: COLS * TILE, height: ROWS * TILE };
  return {
    floor: createPicture((canvas) => drawFloor(new Gfx(canvas), world.seed), size),
    walls: createPicture((canvas) => drawWalls(new Gfx(canvas), world.parsed.walls, world.seed), size),
  };
}

export function renderWorld(ctx: Gfx, world: World, time: number, layers?: StaticLayers | null) {
  ctx.save();
  if (world.shake > 0) {
    const mag = world.shake > 0.18 ? 2 : 1;
    ctx.translate(Math.floor(Math.random() * mag * 2) - mag, Math.floor(Math.random() * mag * 2) - mag);
  }
  if (layers) ctx.drawPicture(layers.floor);
  else drawFloor(ctx, world.seed);
  drawDust(ctx, world.seed, time);
  if (layers) ctx.drawPicture(layers.walls);
  else drawWalls(ctx, world.parsed.walls, world.seed);
  drawTorches(ctx, world.parsed.walls, world.seed, time);
  drawDoor(ctx, world, time);
  for (const s of world.spikes) drawSpike(ctx, s.x, s.y, time);
  for (const g of world.glyphs) {
    if (!g.taken) drawGlyph(ctx, g.x, g.y, g.phase, time, world.hint > 0);
  }
  for (const e of world.enemies) drawEnemy(ctx, e, time);
  drawPlayer(ctx, world, time);
  drawParticles(ctx, world.particles);
  drawHint(ctx, world, time);

  // vignette corners
  ctx.fillStyle = C.wallDark;
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 8; i += 1) {
    ctx.fillRect(i, i, 1, 1);
    ctx.fillRect(COLS * TILE - 1 - i, i, 1, 1);
    ctx.fillRect(i, ROWS * TILE - 1 - i, 1, 1);
    ctx.fillRect(COLS * TILE - 1 - i, ROWS * TILE - 1 - i, 1, 1);
  }
  ctx.globalAlpha = 1;

  if (world.flash > 0) {
    ctx.fillStyle = C.pale;
    ctx.globalAlpha = Math.min(0.7, world.flash * 3);
    ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function renderTitleScene(ctx: Gfx, time: number) {
  // A dim crypt backdrop used behind the title overlay.
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const h = hash(tx, ty, 44);
      if (h > 0.5) {
        ctx.fillStyle = C.floorDark;
        ctx.fillRect(tx * TILE + 3, ty * TILE + 3, 2, 2);
      }
    }
  }
  ctx.fillStyle = C.wall;
  ctx.fillRect(0, 0, COLS * TILE, 20);
  ctx.fillRect(0, ROWS * TILE - 20, COLS * TILE, 20);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, COLS * TILE, 2);
  ctx.fillRect(0, ROWS * TILE - 2, COLS * TILE, 2);
  ctx.fillStyle = C.pale;
  ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.2;
  ctx.fillRect(79, 58, 2, 2);
  ctx.globalAlpha = 1;
}

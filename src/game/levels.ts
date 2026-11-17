export const TILE = 8;
export const COLS = 20;
export const ROWS = 16;
export const VIEW_W = COLS * TILE;
export const VIEW_H = ROWS * TILE;

export interface Point {
  x: number;
  y: number;
}

export type EnemyAxis = "h" | "v";

export interface EnemySpawn extends Point {
  axis: EnemyAxis;
}

export interface LevelDef {
  id: number;
  name: string;
  tagline: string;
  hint: string;
  map: string[];
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "The Awakening",
    tagline: "A cold lantern flickers.",
    hint: "Gather every glyph — the stone door will answer.",
    map: [
      "####################",
      "#P.................#",
      "#..................#",
      "#....####....g.....#",
      "#....#..#..........#",
      "#....#..#..........#",
      "#....####..........#",
      "#........h.........#",
      "#..................#",
      "#....g.............#",
      "#........####......#",
      "#........#..#......#",
      "#........#..#.....D#",
      "#........####......#",
      "#..................#",
      "####################",
    ],
  },
  {
    id: 2,
    name: "Twin Halls",
    tagline: "Two hearts of stone.",
    hint: "The halls are bridged in the middle. Use the seam.",
    map: [
      "####################",
      "#P.................#",
      "#....####..........#",
      "#.......#....g.....#",
      "#....####..........#",
      "#..................#",
      "#..#######..####...#",
      "#..................#",
      "#........v.........#",
      "#.............h....#",
      "#...####..#######..#",
      "#.......g..........#",
      "#..................#",
      "#...............g.D#",
      "#..................#",
      "####################",
    ],
  },
  {
    id: 3,
    name: "The Crossing",
    tagline: "Mind the old iron teeth.",
    hint: "Spikes bite. Give them a wide berth.",
    map: [
      "####################",
      "#P.......#........g#",
      "#........#.........#",
      "#........#.........#",
      "#..#######.........#",
      "#..................#",
      "#....g.............#",
      "#...........####...#",
      "#...........#......#",
      "#...........#.g.x..#",
      "#....####...#......#",
      "#....#......#......#",
      "#....#......#.....D#",
      "#....#.............#",
      "#..........v.......#",
      "####################",
    ],
  },
  {
    id: 4,
    name: "Pillar Hall",
    tagline: "Columns older than names.",
    hint: "Weave between the pillars. Nothing can corner you there.",
    map: [
      "####################",
      "#P.................#",
      "#..##..##..##..##..#",
      "#..##..##..##..##..#",
      "#........g.........#",
      "#..##..##..##..##..#",
      "#..##..##..##..##..#",
      "#....g.....h..g....#",
      "#..................#",
      "#..##..##..##..##..#",
      "#..##..##..##..##..#",
      "#..................#",
      "#....##......##...D#",
      "#....##......##....#",
      "#........v.........#",
      "####################",
    ],
  },
  {
    id: 5,
    name: "Crossfire",
    tagline: "Nowhere is truly empty.",
    hint: "The little alcoves hide glyphs. Slip through the gaps.",
    map: [
      "####################",
      "#P.................#",
      "#....####..####....#",
      "#.......#..#.......#",
      "#....g..#..#..g....#",
      "#.......#..#.......#",
      "#....####..####....#",
      "#..................#",
      "#....h....v....h...#",
      "#..................#",
      "#..####...x..####..#",
      "#..##........##....#",
      "#..##..g......##.D.#",
      "#..####...x..####..#",
      "#..................#",
      "####################",
    ],
  },
  {
    id: 6,
    name: "Pinwheel",
    tagline: "The floor remembers.",
    hint: "Four glyphs, four corners. The middle is a trap.",
    map: [
      "####################",
      "#P.................#",
      "#..######...######.#",
      "#..#...........#...#",
      "#..#..g.....g..#...#",
      "#..#...........#...#",
      "#..######...######.#",
      "#..................#",
      "#...h....g....v....#",
      "#..................#",
      "#..######...######.#",
      "#..#...........#...#",
      "#..#..g........#..D#",
      "#..#...........#...#",
      "#..................#",
      "####################",
    ],
  },
  {
    id: 7,
    name: "Serpentine",
    tagline: "Follow the long breath.",
    hint: "The walls breathe in and out. Find the open mouth.",
    map: [
      "####################",
      "#P.................#",
      "#.######.######.##.#",
      "#..................#",
      "#.##.######.######.#",
      "#.........g........#",
      "#.######.######.##.#",
      "#..................#",
      "#.#g..h.......v..#.#",
      "#..................#",
      "#.######.######.##.#",
      "#.........g........#",
      "#.##.######.######.#",
      "#..................#",
      "#..v...g.....h...D.#",
      "####################",
    ],
  },
  {
    id: 8,
    name: "Four Chambers",
    tagline: "Each door hides an echo.",
    hint: "A single seam joins the east and west halves.",
    map: [
      "####################",
      "#P.......#.........#",
      "#........#.........#",
      "#..x.....#.........#",
      "#........#..g.....x#",
      "#........#.........#",
      "#........#.........#",
      "#..................#",
      "#...g..............#",
      "#........#.........#",
      "#........#....x....#",
      "#..v.....#.........#",
      "#..g.....#....g...D#",
      "#........#.........#",
      "#....h...#...h.....#",
      "####################",
    ],
  },
  {
    id: 9,
    name: "The Gauntlet",
    tagline: "Run, little keeper.",
    hint: "Gather the five glyphs. Do not stop moving.",
    map: [
      "####################",
      "#P.................#",
      "#..##..##..##..##..#",
      "#..##..##..##..##..#",
      "#..........h.......#",
      "#....g......x..g...#",
      "#..##..##..##..##..#",
      "#..##..##..##..##..#",
      "#.........v........#",
      "#..x...g.....h.....#",
      "#..##..##..##..##..#",
      "#..##..##..##..##..#",
      "#...............g..#",
      "#....v......x......#",
      "#..h.....g........D#",
      "####################",
    ],
  },
  {
    id: 10,
    name: "Heart of the Crypt",
    tagline: "Relight what was shattered.",
    hint: "Six glyphs guard the last door. The dark knows your name.",
    map: [
      "####################",
      "#P.................#",
      "#....g........g....#",
      "#........h.........#",
      "#..###........###..#",
      "#..###........###..#",
      "#........##........#",
      "#....g...##...g....#",
      "#........##........#",
      "#..###........###..#",
      "#..###........###..#",
      "#........v.........#",
      "#....h.......h.....#",
      "#..x....g.g.....x..#",
      "#.........x......D.#",
      "####################",
    ],
  },
];

export interface ParsedLevel {
  level: LevelDef;
  walls: boolean[][];
  glyphs: Point[];
  enemies: EnemySpawn[];
  spikes: Point[];
  start: Point;
  door: Point;
  floorSeed: number;
}

const centerOf = (tx: number, ty: number): Point => ({
  x: tx * TILE + TILE / 2,
  y: ty * TILE + TILE / 2,
});

/** Parse a level into a clean 20 x 16 world. Borders are always solid. */
export function parseLevel(level: LevelDef): ParsedLevel {
  const walls = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false));
  const glyphs: Point[] = [];
  const enemies: EnemySpawn[] = [];
  const spikes: Point[] = [];
  let start: Point = centerOf(1, 1);
  let door: Point = centerOf(COLS - 2, ROWS - 2);

  for (let ty = 0; ty < ROWS; ty += 1) {
    const raw = (level.map[ty] ?? "").padEnd(COLS, ".");
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = raw[tx] ?? ".";
      const solidBorder = ty === 0 || ty === ROWS - 1 || tx === 0 || tx === COLS - 1;
      walls[ty][tx] = solidBorder || ch === "#";
      const p = centerOf(tx, ty);
      if (ch === "P") start = p;
      if (ch === "D") door = p;
      if (ch === "g") glyphs.push(p);
      if (ch === "h") enemies.push({ ...p, axis: "h" });
      if (ch === "v") enemies.push({ ...p, axis: "v" });
      if (ch === "x") spikes.push(p);
    }
  }

  return { level, walls, glyphs, enemies, spikes, start, door, floorSeed: level.id * 977 + 131 };
}

export function isWall(walls: boolean[][], tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return walls[ty][tx];
}

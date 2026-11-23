/**
 * Hero backdrop: a haunted house at night, drawn on a 320x200 pixel grid with plain rects.
 * Decorative only. `doorRef` positions are exported so the scroll ride can zoom into the door.
 */
export const SCENE_W = 320;
export const SCENE_H = 200;
/** Door rect in scene pixels (used for the camera ride transform-origin). */
export const DOOR = { x: 213, y: 135, w: 14, h: 33 };

const C = {
  sky0: "#160e22",
  sky1: "#1b1229",
  sky2: "#21172f",
  hill: "#2a1f3d",
  hillDark: "#241a35",
  wall: "#3b2c55",
  wallDark: "#33264a",
  trim: "#4e3c6e",
  roof: "#2e2244",
  win: "#160e22",
  lit: "#f2b544",
  litDim: "#c98a2a",
  frame: "#5a4880",
  moon: "#ebe3cf",
  crater: "#c9bfa6",
  halo: "#3a2a57",
  fence: "#1d1530",
  grave: "#4a3d62",
  graveDark: "#3a2f50",
  ground: "#1c142b",
  path: "#2b2140",
  pumpkin: "#d9772b",
  pumpkinDark: "#a9531c",
  stem: "#5e8b4a",
  star: "#f3ecdd",
};

const STARS: [number, number][] = [
  [56, 2], [85, 13], [90, 19], [150, 5], [166, 25], [176, 27], [149, 4], [228, 19], [231, 29], [221, 3],
  [274, 4], [279, 5], [295, 17], [315, 6], [316, 41], [295, 55], [282, 66], [244, 55], [189, 62], [202, 67],
  [195, 72], [301, 84], [311, 82], [112, 36], [70, 14], [163, 47], [178, 38], [252, 48],
];

function px(key: string, x: number, y: number, w: number, h: number, fill: string) {
  return <rect key={key} x={x} y={y} width={w} height={h} fill={fill} />;
}

/** Filled pixel circle as horizontal runs. */
function disc(key: string, cx: number, cy: number, r: number, fill: string) {
  const rows = [];
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    rows.push(px(`${key}${dy}`, cx - half, cy + dy, half * 2 + 1, 1, fill));
  }
  return rows;
}

/** Dithered ring around the moon. */
function halo(cx: number, cy: number, r0: number, r1: number) {
  const out = [];
  for (let y = cy - r1; y <= cy + r1; y++) {
    for (let x = cx - r1; x <= cx + r1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r0 && d <= r1 && (x + y) % 2 === 0) out.push(px(`h${x}-${y}`, x, y, 1, 1, C.halo));
    }
  }
  return out;
}

function windowAt(key: string, x: number, y: number, lit: boolean, w = 9, h = 12) {
  const glass = lit ? C.lit : C.win;
  return (
    <g key={key}>
      {px("f", x - 1, y - 1, w + 2, h + 2, C.frame)}
      {px("g", x, y, w, h, glass)}
      {lit && px("s", x, y + h - 3, w, 3, C.litDim)}
      {px("v", x + Math.floor(w / 2), y, 1, h, C.frame)}
      {px("hz", x, y + Math.floor(h / 2), w, 1, C.frame)}
    </g>
  );
}

function grave(key: string, x: number, h: number) {
  return (
    <g key={key}>
      {px("b", x, 189 - h, 12, h, C.grave)}
      {px("t", x + 1, 188 - h, 10, 1, C.grave)}
      {px("c1", x + 5, 193 - h + 6, 2, 8, C.graveDark)}
      {px("c2", x + 3, 193 - h + 8, 6, 2, C.graveDark)}
    </g>
  );
}

function pumpkin(key: string, x: number, y: number, s = 1) {
  const w = 14 * s;
  const h = 10 * s;
  return (
    <g key={key}>
      {px("stem", x + w / 2 - 1, y - 2, 2, 3, C.stem)}
      {px("b", x + 1, y, w - 2, h, C.pumpkin)}
      {px("e", x, y + 2, w, h - 4, C.pumpkin)}
      {px("r1", x + Math.round(w / 3), y, 1, h, C.pumpkinDark)}
      {px("r2", x + Math.round((2 * w) / 3), y, 1, h, C.pumpkinDark)}
      {px("eye1", x + 3, y + 3, 2, 1, "#3a1d0b")}
      {px("eye2", x + w - 5, y + 3, 2, 1, "#3a1d0b")}
      {px("m", x + 4, y + 6, w - 8, 1, "#3a1d0b")}
    </g>
  );
}

export function PixelScene({ className = "" }: { className?: string }) {
  const fence = [];
  for (let x = 0; x < SCENE_W; x += 6) {
    if (x > 182 && x < 262) continue; // gap for the path
    fence.push(px(`fp${x}`, x, 166, 2, 18, C.fence), px(`ft${x}`, x - 1, 168, 4, 2, C.fence));
  }
  const trees = [];
  for (let i = 0; i < 18; i++) {
    const x = i * 9 - 4;
    const h = 10 + ((i * 7) % 9);
    for (let k = 0; k < h; k++) trees.push(px(`t${i}-${k}`, x + Math.floor((h - k) / 3), 150 - k, Math.max(1, k / 1.5), 1, C.hillDark));
  }

  return (
    <svg
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
    >
      {px("sky0", 0, 0, SCENE_W, 60, C.sky0)}
      {px("sky1", 0, 60, SCENE_W, 50, C.sky1)}
      {px("sky2", 0, 110, SCENE_W, 90, C.sky2)}
      {STARS.map(([x, y]) => px(`s${x}-${y}`, x, y, 1, 1, C.star))}

      {halo(272, 39, 19, 27)}
      {disc("moon", 272, 39, 19, C.moon)}
      {disc("c1", 265, 34, 3, C.crater)}
      {disc("c2", 279, 31, 2, C.crater)}
      {disc("c3", 278, 43, 4, C.crater)}
      {disc("c4", 269, 48, 2, C.crater)}

      {/* far hills and tree line */}
      {px("hill", 0, 138, SCENE_W, 20, C.hill)}
      {trees}

      {/* tower */}
      {px("tw", 138, 70, 32, 100, C.wallDark)}
      <polygon points="134,72 154,33 174,72" fill={C.roof} />
      {px("flagpole", 153, 21, 1, 13, C.fence)}
      {px("flag", 154, 22, 6, 3, C.fence)}
      {px("tl", 134, 82, 38, 2, C.trim)}
      {windowAt("tw1", 147, 53, false, 10, 13)}
      {px("ghostwin", 148, 55, 4, 4, "#7fd6c9")}
      {windowAt("tw2", 144, 95, true)}
      {windowAt("tw3", 156, 95, false)}
      {windowAt("tw4", 145, 124, false)}
      {windowAt("tw5", 156, 122, true)}

      {/* main house */}
      {px("mw", 170, 102, 102, 68, C.wall)}
      <polygon points="168,74 174,72 268,72 274,74 274,102 168,102" fill={C.roof} />
      {px("chim", 251, 54, 10, 20, C.roof)}
      {px("chimtop", 249, 52, 14, 3, C.trim)}
      {px("roofline", 166, 101, 110, 2, C.trim)}
      {px("eave", 172, 72, 98, 2, C.trim)}
      {windowAt("d1", 196, 83, false)}
      {windowAt("d2", 237, 82, true)}
      {windowAt("m1", 178, 110, false)}
      {windowAt("m2", 194, 110, true)}
      {windowAt("m3", 243, 110, false)}
      {windowAt("m4", 258, 110, true)}
      {windowAt("m5", 178, 136, true)}
      {windowAt("m6", 196, 136, false)}
      {windowAt("m7", 243, 136, false)}
      {windowAt("m8", 258, 136, false)}

      {/* porch and glowing door */}
      {px("porch", 201, 133, 39, 2, C.trim)}
      {px("pil1", 204, 135, 2, 33, C.trim)}
      {px("pil2", 235, 135, 2, 33, C.trim)}
      {px("doorframe", DOOR.x - 1, DOOR.y - 1, DOOR.w + 2, DOOR.h + 1, C.frame)}
      {px("door", DOOR.x, DOOR.y + 3, DOOR.w, DOOR.h - 3, C.lit)}
      {px("doortop", DOOR.x + 2, DOOR.y, DOOR.w - 4, 3, C.lit)}
      {px("doorlow", DOOR.x, DOOR.y + DOOR.h - 7, DOOR.w, 7, "#e9c46a")}
      {px("step", 208, 168, 24, 2, C.trim)}

      {/* right wing */}
      {px("rw", 270, 112, 44, 58, C.wallDark)}
      {px("rwroof", 266, 110, 50, 2, C.trim)}
      {disc("round", 290, 97, 5, C.lit)}
      {windowAt("r1", 279, 119, false)}
      {windowAt("r2", 295, 119, true)}
      {windowAt("r3", 279, 143, true)}
      {windowAt("r4", 295, 143, false)}

      {/* ground, path, fence, lamps */}
      {px("ground", 0, 170, SCENE_W, 30, C.ground)}
      <polygon points="208,170 232,170 270,200 182,200" fill={C.path} />
      {fence}
      {px("fencebar1", 0, 172, 182, 1, C.fence)}
      {px("fencebar2", 262, 172, 58, 1, C.fence)}
      {px("lamp1", 185, 157, 3, 30, C.fence)}
      {px("lamp1h", 183, 155, 7, 4, C.fence)}
      {px("lamp2", 262, 157, 3, 30, C.fence)}
      {px("lamp2h", 260, 155, 7, 4, C.fence)}

      {grave("g1", 18, 22)}
      {grave("g2", 46, 19)}
      {grave("g3", 77, 25)}
      {pumpkin("p1", 142, 181)}
      {pumpkin("p2", 159, 183, 0.8)}
      {pumpkin("p3", 292, 182)}
    </svg>
  );
}

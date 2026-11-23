/**
 * Hallway backdrop on a 320x116 pixel grid: wallpaper, three doors, candles, two frames,
 * wainscot, wooden floor and a runner rug. Creatures walk on top as HTML.
 * Floor line sits at 62% (upper walkway) and the rug at about 84% (lower walkway).
 */
const C = {
  wall: "#2f2347",
  diamond: "#3a2c57",
  door: "#140d20",
  doorFrame: "#4a3a6a",
  wainscot: "#3a2c55",
  wainscotLine: "#2a1f40",
  rail: "#4e3c6e",
  floor: "#2a1d2e",
  plank: "#22172a",
  rug: "#3c1f3c",
  rugEdge: "#5a2c4e",
  dot: "#f2b544",
  candle: "#f3ecdd",
  flame: "#f2b544",
  glow: "#5a4a3a",
  frameGold: "#b07a2a",
  frameInner: "#6e4a1e",
  frame2: "#2f5a55",
};

function px(key: string, x: number, y: number, w: number, h: number, fill: string) {
  return <rect key={key} x={x} y={y} width={w} height={h} fill={fill} />;
}

function door(key: string, x: number) {
  const w = 22;
  const top = 26;
  const bottom = 72;
  const arch = [];
  for (let i = 0; i < 6; i++) {
    const inset = [6, 4, 3, 2, 1, 0][i]!;
    arch.push(px(`a${i}`, x + inset, top + i, w - inset * 2, 1, C.door));
    arch.push(px(`af${i}`, x + inset - 1, top + i - 1, 1, 2, C.doorFrame), px(`ag${i}`, x + w - inset, top + i - 1, 1, 2, C.doorFrame));
  }
  return (
    <g key={key}>
      {px("fr", x - 1, top + 5, w + 2, bottom - top - 5, C.doorFrame)}
      {arch}
      {px("body", x, top + 6, w, bottom - top - 6, C.door)}
      {px("knob", x + w - 5, 51, 1, 1, C.dot)}
    </g>
  );
}

function candle(key: string, x: number) {
  const glow = [];
  for (let y = -7; y <= 7; y++) {
    for (let dx = -7; dx <= 7; dx++) {
      if (Math.hypot(dx, y) <= 7 && (dx + y) % 2 === 0) glow.push(px(`g${dx}${y}`, x + dx, 32 + y, 1, 1, C.glow));
    }
  }
  return (
    <g key={key}>
      {glow}
      {px("wax", x - 1, 31, 3, 6, C.candle)}
      {px("flame", x, 28, 1, 3, C.flame)}
      {px("holder", x - 2, 37, 5, 1, C.frameInner)}
    </g>
  );
}

export function Hallway({ className = "" }: { className?: string }) {
  const diamonds = [];
  for (let y = 4; y < 62; y += 10) {
    for (let x = (y / 10) % 2 === 0 ? 4 : 9; x < 320; x += 10) {
      diamonds.push(px(`d${x}-${y}`, x, y, 1, 1, C.diamond), px(`e${x}-${y}`, x - 1, y + 1, 3, 1, C.diamond), px(`f${x}-${y}`, x, y + 2, 1, 1, C.diamond));
    }
  }
  const panels = [];
  for (let x = 2; x < 320; x += 12) panels.push(px(`p${x}`, x, 64, 10, 6, C.wainscotLine));
  const planks = [];
  for (let row = 0; row < 5; row++) {
    const y = 74 + row * 9;
    planks.push(px(`pl${row}`, 0, y, 320, 1, C.plank));
    for (let x = (row % 2) * 18; x < 320; x += 36) planks.push(px(`pv${row}-${x}`, x, y, 1, 9, C.plank));
  }
  const dots = [];
  for (let x = 1; x < 320; x += 6) dots.push(px(`dot${x}`, x, 96, 1, 1, C.dot));

  return (
    <svg viewBox="0 0 320 116" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      {px("wall", 0, 0, 320, 62, C.wall)}
      {diamonds}
      {door("door1", 46)}
      {door("door2", 152)}
      {door("door3", 262)}
      {candle("c1", 20)}
      {candle("c2", 131)}
      {candle("c3", 192)}
      {px("fr1", 100, 18, 22, 28, C.frameGold)}
      {px("fr1i", 103, 21, 16, 22, C.frameInner)}
      {px("fr1s", 108, 25, 6, 15, C.door)}
      {px("fr2", 210, 22, 20, 22, C.frameGold)}
      {px("fr2i", 212, 24, 16, 18, C.frame2)}
      {px("fr2s", 216, 28, 8, 9, "#3f7a72")}
      {px("rail", 0, 62, 320, 2, C.rail)}
      {px("wainscot", 0, 64, 320, 8, C.wainscot)}
      {panels}
      {px("floor", 0, 72, 320, 44, C.floor)}
      {planks}
      {px("rugTop", 0, 92, 320, 1, C.rugEdge)}
      {px("rug", 0, 93, 320, 7, C.rug)}
      {px("rugBottom", 0, 100, 320, 1, C.rugEdge)}
      {dots}
      {px("shade", 0, 110, 320, 6, "#1d1424")}
    </svg>
  );
}

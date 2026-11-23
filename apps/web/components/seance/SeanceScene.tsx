/** Séance table on a 200x100 pixel grid: rug, old monitor, crystal ball with halo, candles, bell, cards. */
function px(key: string, x: number, y: number, w: number, h: number, fill: string) {
  return <rect key={key} x={x} y={y} width={w} height={h} fill={fill} />;
}

function ellipseRows(key: string, cx: number, cy: number, rx: number, ry: number, fill: string, dither = false) {
  const out = [];
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
    if (!dither) out.push(px(`${key}${dy}`, cx - half, cy + dy, half * 2 + 1, 1, fill));
    else for (let x = cx - half; x <= cx + half; x++) if ((x + dy) % 2 === 0) out.push(px(`${key}${x}_${dy}`, x, cy + dy, 1, 1, fill));
  }
  return out;
}

function candle(key: string, x: number, y: number) {
  return (
    <g key={key}>
      {px("w", x, y, 2, 6, "#f3ecdd")}
      {px("f", x, y - 3, 2, 3, "#f2b544")}
      {px("b", x - 1, y + 6, 4, 1, "#b07a2a")}
    </g>
  );
}

export function SeanceScene({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 100" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      {ellipseRows("rug", 100, 80, 96, 16, "#4a2445")}
      {ellipseRows("rugd", 100, 82, 54, 10, "#5a2c52", true)}
      {/* halo behind the ball */}
      {ellipseRows("halo", 125, 44, 22, 22, "#2f6a63", true)}
      {/* monitor */}
      {px("mon", 40, 30, 34, 30, "#c9bb98")}
      {px("monside", 74, 32, 3, 28, "#a99a78")}
      {px("scr", 43, 33, 28, 19, "#160e22")}
      {px("l1", 46, 36, 16, 1, "#7fd6c9")}
      {px("l2", 46, 39, 10, 1, "#7fd6c9")}
      {px("l3", 46, 42, 20, 1, "#7fd6c9")}
      {px("l4", 46, 45, 8, 1, "#f2b544")}
      {px("l5", 46, 48, 14, 1, "#7fd6c9")}
      {px("slot", 52, 55, 12, 1, "#8a7d60")}
      {px("monbase", 38, 60, 40, 3, "#a99a78")}
      {/* crystal ball */}
      {ellipseRows("ball", 125, 42, 14, 14, "#7fd6c9")}
      {ellipseRows("ballshade", 129, 47, 9, 7, "#5bbcaf")}
      {px("shine1", 116, 33, 4, 3, "#f3ecdd")}
      {px("shine2", 132, 46, 1, 1, "#f3ecdd")}
      {px("stand", 116, 56, 18, 3, "#b07a2a")}
      {px("stand2", 113, 59, 24, 2, "#8a5a1e")}
      {/* candles, bell, cards */}
      {candle("c1", 96, 62)}
      {candle("c2", 150, 58)}
      {candle("c3", 165, 67)}
      {px("bell", 99, 75, 8, 6, "#b07a2a")}
      {px("bellt", 102, 72, 2, 3, "#b07a2a")}
      {px("bellb", 97, 81, 12, 2, "#8a5a1e")}
      {px("card1", 156, 77, 8, 10, "#f3ecdd")}
      {px("card1i", 157, 78, 6, 8, "#22172f")}
      {px("card2", 166, 79, 8, 10, "#f3ecdd")}
      {px("card2i", 167, 80, 6, 8, "#2f5a55")}
      {px("card3", 176, 76, 8, 10, "#f3ecdd")}
      {px("card3i", 177, 77, 6, 8, "#22172f")}
      {px("dot1", 159, 82, 1, 1, "#f2b544")}
      {px("dot2", 169, 84, 1, 1, "#f2b544")}
      {px("dot3", 179, 81, 1, 1, "#f2b544")}
    </svg>
  );
}
